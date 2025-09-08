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

	let {
		data,
		children
	}: {
		data: LayoutData;
		children: Snippet;
	} = $props();

	const { versionInformation, user, settings } = data;

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
</script>

<svelte:head><title>Arcane</title></svelte:head>

<div class="bg-background min-h-screen">
	{#if !settings}
		<Error message="An Error Occured" showButton={true} />
	{:else if !isOnboardingPage && !isLoginPage}
		<Sidebar.Provider>
			<AppSidebar {versionInformation} {user} />
			<main class="flex-1">
				<section class="p-5">
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

<ModeWatcher />
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
