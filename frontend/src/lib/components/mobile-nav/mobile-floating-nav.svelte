<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
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
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

	// Touch gesture helpers to detect immediate scroll direction on touch
	let touchStartY: number | null = null;
	let isInteractiveTouch = false;
	const touchMoveThreshold = 6;

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

	// Improved scroll-to-hide using native scroll events with passive listeners
	$effect(() => {
		if (typeof window === 'undefined') return;
		if (!scrollToHideEnabled || menuOpen) {
			visible = true;
			return;
		}

		const scrollThreshold = 10;
		const minScrollDistance = 80;

		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			const scrollDiff = currentScrollY - untrack(() => lastScrollY);

			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
				scrollTimeout = null;
			}

			// Check if at bottom of page
			const scrollHeight = document.documentElement.scrollHeight;
			const clientHeight = document.documentElement.clientHeight;
			const atBottom = currentScrollY + clientHeight >= scrollHeight - 5;

			if (scrollDiff < 0 && !atBottom) {
				visible = true;
				lastScrollY = currentScrollY;
			} else if (scrollDiff > scrollThreshold && currentScrollY > minScrollDistance && !atBottom) {
				visible = false;
				lastScrollY = currentScrollY;
			} else if (Math.abs(scrollDiff) > scrollThreshold) {
				lastScrollY = currentScrollY;
			}

			// At top - always show after scroll stops
			if (!atBottom) {
				scrollTimeout = setTimeout(() => {
					if (window.scrollY < minScrollDistance) {
						visible = true;
					}
				}, 150);
			}
		};

		// Add passive scroll listener for better touch performance
		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			window.removeEventListener('scroll', handleScroll);
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}
		};
	});

	// Touch-based detection: hide/show immediately on the first touchmove
	$effect(() => {
		if (typeof window === 'undefined') return;
		if (!scrollToHideEnabled) return;

		const handleTouchStart = (e: TouchEvent) => {
			if (menuOpen) return;
			const t = e.touches?.[0];
			if (!t) return;
			const target = e.target as HTMLElement | null;
			
			// Check if touch started on the nav bar itself
			const touchedNav = target?.closest('[data-testid="mobile-floating-nav"]');
			
			if (target && target.closest && target.closest('button, a, input, select, textarea, [role="button"], [contenteditable]')) {
				isInteractiveTouch = true;
				touchStartY = null;
				return;
			}
			isInteractiveTouch = false;
			touchStartY = t.clientY;
			
			// If touch started on nav, prevent background scroll
			if (touchedNav) {
				e.preventDefault();
			}
		};

		const handleTouchMove = (e: TouchEvent) => {
			if (menuOpen || isInteractiveTouch || touchStartY === null) return;
			const t = e.touches?.[0];
			if (!t) return;
			const deltaY = t.clientY - touchStartY;
			if (Math.abs(deltaY) < touchMoveThreshold) return;
			
			// Check if touch is on nav
			const target = e.target as HTMLElement | null;
			const touchedNav = target?.closest('[data-testid="mobile-floating-nav"]');
			
			// If on nav bar, prevent background scroll
			if (touchedNav) {
				e.preventDefault();
			}

			if (deltaY < 0) {
				visible = false;
			} else {
				visible = true;
			}

			lastScrollY = window.scrollY;
			touchStartY = t.clientY;
		};

		const handleTouchEnd = () => {
			touchStartY = null;
			isInteractiveTouch = false;
		};

		window.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
		window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
		window.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });

		return () => {
			window.removeEventListener('touchstart', handleTouchStart, { capture: true });
			window.removeEventListener('touchmove', handleTouchMove, { capture: true });
			window.removeEventListener('touchend', handleTouchEnd, { capture: true });
		};
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
