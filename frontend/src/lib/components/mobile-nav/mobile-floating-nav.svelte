<script lang="ts">
	import { page } from '$app/state';
	import { scrollY } from 'svelte/reactivity/window';
	import type { NavigationItem, MobileNavigationSettings } from '$lib/config/navigation-config';
	import { getAvailableMobileNavItems } from '$lib/config/navigation-config';
	import MobileNavItem from './mobile-nav-item.svelte';
	import { cn } from '$lib/utils';
	import { SwipeGestureDetector, type SwipeDirection } from '$lib/hooks/use-swipe-gesture.svelte';
	import MobileNavSheet from './mobile-nav-sheet.svelte';
	import './styles.css';

	let {
		navigationSettings,
		user = null,
		versionInformation = null,
		class: className = ''
	}: {
		navigationSettings: MobileNavigationSettings;
		user?: any;
		versionInformation?: any;
		class?: string;
	} = $props();

	// Get pinned items from navigation settings
	const pinnedItems = $derived.by(() => {
		const availableItems = getAvailableMobileNavItems();
		return navigationSettings.pinnedItems
			.map((url) => availableItems.find((item) => item.url === url))
			.filter((item) => item !== undefined);
	});

	const currentPath = $derived(page.url.pathname);

	const showLabels = $derived(navigationSettings.showLabels);
	const scrollToHideEnabled = $derived(navigationSettings.scrollToHide);

	let visible = $state(true);
	let menuOpen = $state(false);
	let lastScrollY = $state(0);
	let navElement: HTMLElement;

	// Swipe gesture detector for opening menu
	const swipeDetector = new SwipeGestureDetector(
		(direction: SwipeDirection) => {
			if (direction === 'up') {
				menuOpen = true;
			}
		},
		{
			threshold: 20,
			velocity: 0.1,
			timeLimit: 1000
		}
	);

	// Simple scroll-to-hide logic using Svelte 5's reactive scrollY
	$effect(() => {
		if (!scrollToHideEnabled || menuOpen) return;

		const currentScrollY = scrollY.current ?? 0;
		const scrollDiff = currentScrollY - lastScrollY;
		const scrollThreshold = 50; // Minimum scroll distance to trigger hide/show

		// Scrolling down and past threshold - hide nav
		if (scrollDiff > scrollThreshold && currentScrollY > 100) {
			visible = false;
		}
		// Scrolling up - show nav
		else if (scrollDiff < -scrollThreshold) {
			visible = true;
		}
		// At top of page - always show
		else if (currentScrollY < 100) {
			visible = true;
		}

		lastScrollY = currentScrollY;
	});

	// Show nav when menu closes
	$effect(() => {
		if (!menuOpen) {
			visible = true;
		}
	});

	// Setup swipe gesture detection on nav element
	$effect(() => {
		if (navElement) {
			swipeDetector.setElement(navElement);
			return () => {
				swipeDetector.setElement(null);
			};
		}
	});
</script>

<nav
	bind:this={navElement}
	class={cn(
		'mobile-nav-base mobile-nav-floating',
		'fixed left-1/2 z-50 -translate-x-1/2 transform',
		'bg-background/60 border-border/30 border backdrop-blur-xl',
		'rounded-3xl shadow-sm',
		'select-none',
		'transition-all duration-300 ease-out',
		showLabels ? 'flex items-center gap-2 px-3 py-2' : 'flex items-center gap-3 px-4 py-2.5',
		visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-full scale-95 opacity-0',
		className
	)}
	data-testid="mobile-floating-nav"
	aria-label="Mobile navigation"
>
	{#each pinnedItems as item (item.url)}
		<MobileNavItem {item} {showLabels} active={currentPath === item.url || currentPath.startsWith(item.url + '/')} />
	{/each}
</nav>

<MobileNavSheet bind:open={menuOpen} {user} {versionInformation} navigationMode="floating" />
