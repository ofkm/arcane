<!-- @migration task: review uses of `navigating` -->
<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import Nav from '$lib/components/navbar.svelte';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { navigating, page } from '$app/state';

	let { children, data } = $props();

	const versionInformation = data.versionInformation;
	const user = $derived(data.user); // Access the user from data

	const isNavigating = $derived(navigating !== null);
	const isAuthenticated = $derived(!!user); // Check if user exists

	const isOnboardingPage = $derived(page.url.pathname.startsWith('/onboarding'));
	// Only show sidebar when authenticated AND not in onboarding
	const showSidebar = $derived(isAuthenticated && !isOnboardingPage);
</script>

<svelte:head><title>Arcane</title></svelte:head>

<ModeWatcher />
<Toaster />

<!-- Apply a loading state to the page during navigation -->
{#if isNavigating}
	<!-- add a loading indicator here -->
{/if}

<div class="flex min-h-screen bg-background">
	<!-- Only show sidebar when authenticated -->
	{#if showSidebar}
		<Nav {versionInformation} />
	{/if}

	<main class="flex-1">
		<section class="p-6">
			{@render children()}
		</section>
	</main>
</div>
