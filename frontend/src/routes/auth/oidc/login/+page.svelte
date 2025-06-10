<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { oidcAPI } from '$lib/services/api';

	let isRedirecting = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const redirectParam = page.url.searchParams.get('redirect') || '/';
			const authUrl = await oidcAPI.getAuthUrl(redirectParam);
			if (!authUrl) {
				console.error('OIDC auth URL not available from backend.');
				error = 'OIDC is not properly configured or the server could not provide an auth URL.';
				setTimeout(() => goto('/auth/login?error=oidc_misconfigured'), 3000);
				isRedirecting = false;
				return;
			}
			localStorage.setItem('oidc_redirect', redirectParam);
			window.location.href = authUrl;
		} catch (err: any) {
			console.error('OIDC login initiation error:', err);
			error = err.message || 'Failed to initiate OIDC login. Please check server logs.';
			setTimeout(() => goto('/auth/login?error=oidc_misconfigured'), 3000);
			isRedirecting = false;
		}
	});
</script>

<svelte:head>
	<title>Redirecting to Login... - Arcane</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			{#if isRedirecting && !error}
				<div class="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
				<h2 class="mt-6 text-2xl font-bold text-gray-900">Redirecting to Login...</h2>
				<p class="mt-2 text-sm text-gray-600">
					Please wait while we redirect you to your identity provider.
				</p>
			{:else if error}
				<div class="text-red-600">
					<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.341 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
					<h2 class="mt-6 text-2xl font-bold text-gray-900">Login Error</h2>
					<p class="mt-2 text-sm text-gray-600">{error}</p>
					<p class="mt-4 text-xs text-gray-500">Redirecting you back to the login page...</p>
				</div>
			{/if}
		</div>
	</div>
</div>
