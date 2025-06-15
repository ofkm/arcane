<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { oidcAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import userStore from '$lib/stores/user-store';

	let isProcessing = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const code = page.url.searchParams.get('code');
			const stateFromUrl = page.url.searchParams.get('state');
			const finalRedirectTo = localStorage.getItem('oidc_redirect') || '/';
			localStorage.removeItem('oidc_redirect');

			if (!code || !stateFromUrl) {
				console.error('OIDC callback error: missing code or state in URL.');
				error = 'Invalid OIDC response (missing parameters). Please try logging in again.';
				setTimeout(() => goto('/auth/login?error=oidc_invalid_response'), 3000);
				isProcessing = false;
				return;
			}
			const authResult = await oidcAPI.handleCallback(code, stateFromUrl);

			if (!authResult.success) {
				console.error('OIDC authentication failed via backend:', authResult.error);
				error = authResult.error || 'Authentication failed. Please try again.';
				const errorCode = authResult.error?.toLowerCase().replace(/\s+/g, '_') || 'oidc_auth_failed';
				setTimeout(() => goto(`/auth/login?error=${errorCode}`), 3000);
				isProcessing = false;
				return;
			}

			if (authResult.user) {
				const user = {
					id: authResult.user.sub || authResult.user.email,
					username: authResult.user.preferred_username || authResult.user.email,
					email: authResult.user.email,
					roles: (authResult.user as any).roles || [],
					createdAt: new Date().toISOString()
				};
				localStorage.setItem('user_data', JSON.stringify(user));
				userStore.setUser(user);
			}

			await invalidateAll();
			toast.success('Successfully logged in!');
			goto(finalRedirectTo);
		} catch (err: any) {
			console.error('🔥 OIDC callback processing error:', err);
			error = err.message || 'An error occurred during authentication. Please try again.';
			setTimeout(() => goto('/auth/login?error=oidc_generic_error'), 3000);
		} finally {
			isProcessing = false;
		}
	});
</script>

<svelte:head>
	<title>Authenticating... - Arcane</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			{#if isProcessing}
				<div class="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
				<h2 class="mt-6 text-2xl font-bold text-gray-900">Authenticating...</h2>
				<p class="mt-2 text-sm text-gray-600">Please wait while we complete your login.</p>
			{:else if error}
				<div class="text-red-600">
					<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.341 16.5c-.77.833.192 2.5 1.732 2.5z" />
					</svg>
					<h2 class="mt-6 text-2xl font-bold text-gray-900">Authentication Error</h2>
					<p class="mt-2 text-sm text-gray-600">{error}</p>
					<p class="mt-4 text-xs text-gray-500">Redirecting you back to login...</p>
				</div>
			{/if}
		</div>
	</div>
</div>
