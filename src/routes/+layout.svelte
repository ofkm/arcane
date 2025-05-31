<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { navigating, page } from '$app/state';
	import ConfirmDialog from '$lib/components/confirm-dialog/confirm-dialog.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/sidebar/sidebar.svelte';

	let { children, data } = $props();

	const versionInformation = data.versionInformation;
	const user = $derived(data.user);
	const agents = $derived(data.agents);
	const isNavigating = $derived(navigating.type !== null);
	const isAuthenticated = $derived(!!user);

	const isOnboardingPage = $derived(page.url.pathname.startsWith('/onboarding'));
	const isLoginPage = $derived(page.url.pathname === '/login' || page.url.pathname.startsWith('/auth/login') || page.url.pathname === '/auth' || page.url.pathname.includes('/login'));
	const showSidebar = $derived(isAuthenticated && !isOnboardingPage && !isLoginPage);
</script>

<svelte:head><title>Arcane</title></svelte:head>

<ModeWatcher />
<Toaster richColors />
<ConfirmDialog />

<!-- Loading Indicator -->
{#if isNavigating}
	<div class="fixed top-0 left-0 right-0 z-50 h-2">
		<div class="h-full bg-primary animate-pulse"></div>
	</div>
{/if}

<div class="flex min-h-screen bg-background">
	{#if showSidebar}
		<Sidebar.Provider>
			<AppSidebar hasLocalDocker={data.hasLocalDocker || false} agents={agents || []} {versionInformation} {user} />
			<main class="flex-1">
				<section class="p-6">
					{@render children()}
				</section>
			</main>
		</Sidebar.Provider>
	{:else}
		<main class="flex-1">
			{@render children()}
		</main>
	{/if}
</div>
