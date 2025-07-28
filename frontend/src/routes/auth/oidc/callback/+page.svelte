<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { oidcAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import userStore from '$lib/stores/user-store';
	import type { User } from '$lib/types/user.type';

	let isProcessing = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const code = page.url.searchParams.get('code');
			const stateFromUrl = page.url.searchParams.get('state');
			const errorParam = page.url.searchParams.get('error');
			const errorDescription = page.url.searchParams.get('error_description');

			const finalRedirectTo = localStorage.getItem('oidc_redirect') || '/dashboard';
			localStorage.removeItem('oidc_redirect');

			// Handle OIDC provider errors
			if (errorParam) {
				let userMessage = 'Authentication was cancelled or failed.';
				if (errorParam === 'access_denied') {
					userMessage = 'Access was denied. You may have cancelled the login or lack permission.';
				} else if (errorParam === 'invalid_request') {
					userMessage = 'Invalid authentication request. Please try again.';
				}

				error = errorDescription || userMessage;
				setTimeout(() => goto('/auth/login?error=oidc_provider_error'), 3000);
				isProcessing = false;
				return;
			}

			if (!code || !stateFromUrl) {
				error = 'Invalid authentication response. Missing required parameters.';
				setTimeout(() => goto('/auth/login?error=oidc_invalid_response'), 3000);
				isProcessing = false;
				return;
			}

			const authResult = await oidcAPI.handleCallback(code, stateFromUrl);

			if (!authResult.success) {
				let userMessage = 'Authentication failed. Please try again.';
				if (authResult.error?.includes('state')) {
					userMessage = 'Security validation failed. Please try logging in again.';
				} else if (authResult.error?.includes('expired')) {
					userMessage = 'Authentication session expired. Please try again.';
				}

				error = userMessage;
				setTimeout(() => goto('/auth/login?error=oidc_auth_failed'), 3000);
				isProcessing = false;
				return;
			}

			if (authResult.user) {
				const user: User = {
					id: authResult.user.sub || authResult.user.email || '',
					username: authResult.user.preferred_username || authResult.user.email || '',
					email: authResult.user.email,
					displayName:
						authResult.user.name ||
						authResult.user.displayName ||
						authResult.user.given_name ||
						authResult.user.preferred_username ||
						authResult.user.email ||
						'User',
					roles: authResult.user.groups || ['user'],
					createdAt: new Date().toISOString()
				};

				userStore.setUser(user);
				await invalidateAll();
				toast.success('Successfully logged in!');
				goto(finalRedirectTo);
			} else {
				error = 'Authentication succeeded but user information is missing.';
				setTimeout(() => goto('/auth/login?error=oidc_user_info_missing'), 3000);
				isProcessing = false;
			}
		} catch (err: any) {
			console.error('OIDC callback error:', err);

			let userMessage = 'An error occurred during authentication. Please try again.';
			if (err.message?.includes('network') || err.message?.includes('timeout')) {
				userMessage =
					'Network error during authentication. Please check your connection and try again.';
			}

			error = userMessage;
			setTimeout(() => goto('/auth/login?error=oidc_callback_error'), 3000);
			isProcessing = false;
		}
	});
</script>

<svelte:head>
	<title>Processing Login... - Arcane</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			{#if isProcessing}
				<div class="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
				<h2 class="mt-6 text-2xl font-bold">Processing Login...</h2>
				<p class="mt-2 text-sm text-muted-foreground">
					Please wait while we complete your authentication.
				</p>
			{:else if error}
				<div class="text-destructive">
					<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.341 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
					<h2 class="mt-6 text-2xl font-bold">Authentication Error</h2>
					<p class="mt-2 text-sm">{error}</p>
					<p class="mt-4 text-xs text-muted-foreground">Redirecting you back to login...</p>
				</div>
			{/if}
		</div>
	</div>
</div>
