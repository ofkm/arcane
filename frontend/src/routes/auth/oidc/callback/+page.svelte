<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { oidcAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';

	let isProcessing = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const code = $page.url.searchParams.get('code');
			const state = $page.url.searchParams.get('state');

			// Get stored state from localStorage (since we can't use httpOnly cookies in static mode)
			const storedState = localStorage.getItem('oidc_state');
			const finalRedirectTo = localStorage.getItem('oidc_redirect') || '/';

			// Clean up stored values
			localStorage.removeItem('oidc_state');
			localStorage.removeItem('oidc_redirect');

			if (!code || !state || !storedState || state !== storedState) {
				console.error('OIDC callback error: state mismatch or missing params.');
				error = 'Invalid OIDC response. Please try logging in again.';
				setTimeout(() => goto('/auth/login?error=oidc_invalid_response'), 2000);
				return;
			}

			// Handle OIDC callback via OIDC API service
			const authResult = await oidcAPI.handleCallback(code, state);

			if (!authResult.success || !authResult.token || !authResult.user) {
				console.error('OIDC authentication failed:', authResult.error);
				error = authResult.error || 'Authentication failed. Please try again.';
				setTimeout(() => goto(`/auth/login?error=${authResult.error || 'oidc_auth_failed'}`), 2000);
				return;
			}

			// Store auth data in localStorage (or sessionStorage)
			localStorage.setItem('auth_token', authResult.token);
			localStorage.setItem('user_data', JSON.stringify(authResult.user));

			toast.success('Successfully logged in!');
			goto(finalRedirectTo);
		} catch (err) {
			console.error('OIDC callback processing error:', err);
			error = 'An error occurred during authentication. Please try again.';
			setTimeout(() => goto('/auth/login?error=oidc_generic_error'), 2000);
		} finally {
			isProcessing = false;
		}
	});
</script>

<svelte:head>
	<title>Authenticating... - Arcane</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
	<div class="max-w-md w-full space-y-8">
		<div class="text-center">
			{#if isProcessing}
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
