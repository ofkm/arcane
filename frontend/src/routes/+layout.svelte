<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { navigating, page } from '$app/state';
	import ConfirmDialog from '$lib/components/confirm-dialog/confirm-dialog.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/sidebar/sidebar.svelte';
	import { goto } from '$app/navigation';
	import { getAuthRedirectPath } from '$lib/utils/redirect.util';
	import LoadingIndicator from '$lib/components/loading-indicator.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import Error from '$lib/components/error.svelte';
	import { m } from '$lib/paraglide/messages';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte.js';
	import MobileFloatingNav from '$lib/components/mobile-nav/mobile-floating-nav.svelte';
	import { mobileNavStore } from '$lib/stores/mobile-nav-store';
	import { onMount } from 'svelte';

	let {
		data,
		children
	}: {
		data: LayoutData;
		children: Snippet;
	} = $props();

	const { versionInformation, user, settings } = data;

	const isMobile = new IsMobile();
	const isNavigating = $derived(navigating.type !== null);
	const isOnboardingPage = $derived(String(page.url.pathname).startsWith('/onboarding'));
	const isLoginPage = $derived(
		String(page.url.pathname) === '/login' ||
			String(page.url.pathname).startsWith('/auth/login') ||
			String(page.url.pathname) === '/auth' ||
			String(page.url.pathname).includes('/login') ||
			String(page.url.pathname).includes('/callback')
	);

	const redirectPath = getAuthRedirectPath(page.url.pathname, user, settings);
	if (redirectPath) {
		goto(redirectPath);
	}

	// Load mobile navigation preferences on mount
	onMount(() => {
		// Load mobile navigation preferences on app start
		mobileNavStore.loadPreferences();
		
		// Initialize effective settings that combine server settings with local overrides
		mobileNavStore.initializeEffectiveSettings();
	});
</script>

<svelte:head><title>{m.layout_title()}</title></svelte:head>

<div class="bg-background min-h-screen">
	{#if !settings}
		<Error message={m.error_occurred()} showButton={true} />
	{:else if !isOnboardingPage && !isLoginPage}
		{#if isMobile.current}
			<main class="flex-1">
				<section class="px-2 py-5 pb-24 sm:p-5">
					{@render children()}
				</section>
			</main>
			<!-- Mobile Floating Navigation -->
			<MobileFloatingNav 
				pinnedItems={$mobileNavStore.pinnedItems} 
				visible={$mobileNavStore.visible}
				{user}
				{versionInformation}
			/>
		{:else}
			<Sidebar.Provider>
				<AppSidebar {versionInformation} {user} />
				<main class="flex-1">
					<section class="p-5">
						{@render children()}
					</section>
				</main>
			</Sidebar.Provider>
		{/if}
	{:else}
		<main class="flex-1">
			{@render children()}
		</main>
	{/if}
</div>

<ModeWatcher disableTransitions={false} />
<Toaster
	toastOptions={{
		classes: {
			toast: 'border border-primary/30!',
			title: 'text-foreground',
			description: 'text-muted-foreground',
			actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
			cancelButton: 'bg-muted text-muted-foreground hover:bg-muted/80',
			closeButton: 'text-muted-foreground hover:text-foreground'
		}
	}}
/>
<ConfirmDialog />
<LoadingIndicator active={isNavigating} thickness="h-1.5" />
