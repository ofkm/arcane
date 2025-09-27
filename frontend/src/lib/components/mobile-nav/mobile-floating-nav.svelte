<script lang="ts">
	import { page } from '$app/state';
	import type { NavigationItem, MobileNavigationSettings } from '$lib/config/navigation-config';
	import { getAvailableMobileNavItems } from '$lib/config/navigation-config';
	import MobileNavItem from './mobile-nav-item.svelte';
	import { cn } from '$lib/utils';
	import { createMobileNavInteractions } from '$lib/hooks/use-mobile-nav-interactions';
	import { registerNavigationManager } from '$lib/utils/navigation.utils';
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
	const tapToHideEnabled = $derived(navigationSettings.tapToHide);

	let visible = $state(true);
	let menuOpen = $state(false);
	let navElement: HTMLElement;
	let autoHidden = $state(false);

	const shouldShow = $derived(visible);

	// Setup mobile navigation interactions with floating nav specific tuning
	const mobileNavInteractions = createMobileNavInteractions(
		{
			onVisibilityChange: (newVisible: boolean) => {
				visible = newVisible;
				// Sync the interaction manager's state
				mobileNavInteractions.updateState({ visible: newVisible });
			},
			onMenuOpen: () => {
				menuOpen = true;
			},
			shouldPreventTouch: (currentMenuOpen: boolean) => currentMenuOpen
		},
		{
			// Floating nav specific tuning - potentially different from docked
			scrollThreshold: 15,
			scrollMinDistance: 100,
			scrollTopThreshold: 100,
			scrollChangeThreshold: 50,
			tapDebounceTimeout: 300,
			swipeThreshold: 20,
			swipeVelocity: 0.1,
			swipeTimeLimit: 1000,
			touchEndDelay: 150,
			menuOpenRestoreDelay: 50,
			wheelThreshold: 10
		}
	);

	$effect(() => {
		const direction = mobileNavInteractions.scrollDirection;
		const scrollY = mobileNavInteractions.scrollY;

		// Update interaction manager state
		mobileNavInteractions.updateState({
			menuOpen,
			scrollToHideEnabled,
			tapToHideEnabled
		});

		// Handle scroll effects
		mobileNavInteractions.handleScrollEffect(direction, scrollY);
	});

	// Make navigation bar visible when navigation sheet closes and ensure touch is restored
	let previousMenuOpen = $state(false);
	$effect(() => {
		const currentMenuOpen = menuOpen;

		// Handle menu state changes
		mobileNavInteractions.handleMenuStateChange(previousMenuOpen, currentMenuOpen);

		previousMenuOpen = currentMenuOpen;
	});

	// Update auto-hidden state
	$effect(() => {
		const newAutoHidden = !shouldShow;
		if (newAutoHidden !== autoHidden) {
			autoHidden = newAutoHidden;
		}
	});

	$effect(() => {
		if (navElement) {
			// Setup the element with the interaction manager
			mobileNavInteractions.setupElement(navElement);

			// Register this manager globally so settings can access it
			registerNavigationManager(mobileNavInteractions);

			// Return cleanup function
			return () => {
				mobileNavInteractions.cleanup();
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
		'select-none', // Prevent text selection but allow touch
		'transition-all duration-300 ease-out', // Smoother easing
		showLabels ? 'flex items-center gap-2 px-3 py-2' : 'flex items-center gap-3 px-4 py-2.5',
		shouldShow ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-full scale-95 opacity-0',
		className
	)}
	data-testid="mobile-floating-nav"
	aria-label="Mobile navigation"
>
	{#each pinnedItems as item (item.url)}
		<MobileNavItem {item} {showLabels} active={currentPath === item.url || currentPath.startsWith(item.url + '/')} />
	{/each}
</nav>

<MobileNavSheet bind:open={menuOpen} {user} {versionInformation} />
