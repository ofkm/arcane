<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { oidcAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';

	let isRedirecting = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const redirectParam = $page.url.searchParams.get('redirect') || '/';

			// Get OIDC auth URL from backend
			const authUrl = await oidcAPI.getAuthUrl(redirectParam);

			if (!authUrl) {
				console.error('OIDC auth URL not available.');
				error = 'OIDC is not properly configured.';
				setTimeout(() => goto('/auth/login?error=oidc_misconfigured'), 2000);
				return;
			}

			// Generate state for CSRF protection
			const state = crypto.randomUUID();

			// Store state and redirect info in localStorage (since we can't use httpOnly cookies in static mode)
			localStorage.setItem('oidc_state', state);
			localStorage.setItem('oidc_redirect', redirectParam);

			// Redirect to OIDC provider
			window.location.href = authUrl;
		} catch (err) {
			console.error('OIDC login error:', err);
			error = 'Failed to initiate OIDC login.';
			setTimeout(() => goto('/auth/login?error=oidc_misconfigured'), 2000);
			isRedirecting = false;
		}
	});
</script>

<svelte:head>
	<title>Redirecting to Login... - Arcane</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
	<div class="max-w-md w-full space-y-8">
		<div class="text-center">
			{#if isRedirecting && !error}
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
				<h2 class="mt-6 text-2xl font-bold text-gray-900">Redirecting to Login...</h2>
				<p class="mt-2 text-sm text-gray-600">Please wait while we redirect you to your identity provider.</p>
			{:else if error}
				<div class="text-red-600">
					<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.341 16.5c-.77.833.192 2.5 1.732 2.5z" />
					</svg>
					<h2 class="mt-6 text-2xl font-bold text-gray-900">Login Error</h2>
					<p class="mt-2 text-sm text-gray-600">{error}</p>
					<p class="mt-4 text-xs text-gray-500">Redirecting you back...</p>
				</div>
			{/if}
		</div>
	</div>
</div>
