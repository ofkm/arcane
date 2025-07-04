<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { navigating, page } from '$app/state';
	import ConfirmDialog from '$lib/components/confirm-dialog/confirm-dialog.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/sidebar/sidebar.svelte';
	import { goto } from '$app/navigation';
	import userStore from '$lib/stores/user-store';
	import settingsStore from '$lib/stores/config-store';
	import { getAuthRedirectPath } from '$lib/utils/redirect.util';

	let { children, data } = $props();

	const { versionInformation, user, settings } = $state(data);

	$effect(() => {
		if (user) {
			userStore.setUser(user);
		}

		if (settings) {
			settingsStore.set(settings);
		}
	});

	$effect(() => {
		const currentUser = $userStore || user;
		const currentSettings = $settingsStore || settings;

		const redirectPath = getAuthRedirectPath(page.url.pathname, currentUser, currentSettings);
		if (redirectPath) {
			goto(redirectPath);
		}
	});

	const isNavigating = $derived(navigating.type !== null);
	const isOnboardingPage = $derived(page.url.pathname.startsWith('/onboarding'));
	const isLoginPage = $derived(
		page.url.pathname === '/login' ||
			page.url.pathname.startsWith('/auth/login') ||
			page.url.pathname === '/auth' ||
			page.url.pathname.includes('/login') ||
			page.url.pathname.includes('/callback')
	);
	const currentUser = $derived($userStore || user);
</script>

<svelte:head><title>Arcane</title></svelte:head>

<ModeWatcher />
<Toaster />
<ConfirmDialog />

<!-- Loading Indicator -->
{#if isNavigating}
	<div class="fixed top-0 right-0 left-0 z-50 h-2">
		<div class="bg-primary h-full animate-pulse"></div>
	</div>
{/if}

<div class="bg-background flex min-h-screen">
	{#if currentUser && !isOnboardingPage && !isLoginPage}
		<Sidebar.Provider>
			<AppSidebar {versionInformation} user={currentUser} />
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
