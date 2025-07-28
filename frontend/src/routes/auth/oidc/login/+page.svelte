<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { oidcAPI } from '$lib/services/api';

	let isRedirecting = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const redirectParam = page.url.searchParams.get('redirect') || '/dashboard';

			// Check if OIDC is properly configured first
			const status = await oidcAPI.getStatus();
			if (!status.dbEnabled || !status.dbConfigured) {
				error =
					'OIDC authentication is not properly configured. Please contact your administrator.';
				setTimeout(() => goto('/auth/login?error=oidc_not_configured'), 3000);
				isRedirecting = false;
				return;
			}

			const authUrl = await oidcAPI.getAuthUrl(redirectParam);
			if (!authUrl) {
				error =
					'Unable to generate authentication URL. Please try again or contact your administrator.';
				setTimeout(() => goto('/auth/login?error=oidc_url_generation_failed'), 3000);
				isRedirecting = false;
				return;
			}

			localStorage.setItem('oidc_redirect', redirectParam);
			window.location.href = authUrl;
		} catch (err: any) {
			console.error('OIDC login initiation error:', err);

			// Parse the error message to provide better user feedback
			let userMessage = 'Failed to initiate OIDC login. Please try again.';
			if (err.message?.includes('discovery')) {
				userMessage = 'OIDC provider configuration error. Please contact your administrator.';
			} else if (err.message?.includes('network') || err.message?.includes('timeout')) {
				userMessage =
					'Network error connecting to authentication provider. Please check your connection and try again.';
			}

			error = userMessage;
			setTimeout(() => goto('/auth/login?error=oidc_init_failed'), 3000);
			isRedirecting = false;
		}
	});
</script>

<svelte:head>
	<title>Redirecting to Login... - Arcane</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			{#if isRedirecting && !error}
				<div class="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
				<h2 class="mt-6 text-2xl font-bold">Redirecting to Login...</h2>
				<p class="mt-2 text-sm text-muted-foreground">
					Please wait while we redirect you to your identity provider.
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
					<p class="mt-4 text-xs text-muted-foreground">
						Redirecting you back to the login page...
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
