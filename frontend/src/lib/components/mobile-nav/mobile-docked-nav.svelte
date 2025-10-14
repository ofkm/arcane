<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import type { NavigationItem, MobileNavigationSettings } from '$lib/config/navigation-config';
	import { getAvailableMobileNavItems } from '$lib/config/navigation-config';
	import MobileNavItem from './mobile-nav-item.svelte';
	import { m } from '$lib/paraglide/messages';
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

	// Touch-based detection: hide/show immediately on the first touchmove
	// direction change so mobile users get instant feedback.
	$effect(() => {
		if (typeof window === 'undefined') return;
		if (!scrollToHideEnabled) return;

		const handleTouchStart = (e: TouchEvent) => {
			if (menuOpen) return;
			const t = e.touches?.[0];
			if (!t) return;
			const target = e.target as HTMLElement | null;
			// Ignore touches that start on interactive controls
			if (target && target.closest && target.closest('button, a, input, select, textarea, [role="button"], [contenteditable]')) {
				isInteractiveTouch = true;
				touchStartY = null;
				return;
			}
			isInteractiveTouch = false;
			touchStartY = t.clientY;
		};

		const handleTouchMove = (e: TouchEvent) => {
			if (menuOpen || isInteractiveTouch || touchStartY === null) return;
			const t = e.touches?.[0];
			if (!t) return;
			const deltaY = t.clientY - touchStartY;
			if (Math.abs(deltaY) < touchMoveThreshold) return;

			// Negative deltaY => finger moved up => page scrolling down
			if (deltaY < 0) {
				visible = false;
			} else {
				visible = true;
			}

			// Sync lastScrollY so the scroll listener doesn't get out of sync
			lastScrollY = window.scrollY;
			// Update reference to avoid repeated toggles for the same gesture
			touchStartY = t.clientY;
		};

		const handleTouchEnd = () => {
			touchStartY = null;
			isInteractiveTouch = false;
		};

		window.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
		window.addEventListener('touchmove', handleTouchMove, { passive: true, capture: true });
		window.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });

		return () => {
			window.removeEventListener('touchstart', handleTouchStart, { capture: true });
			window.removeEventListener('touchmove', handleTouchMove, { capture: true });
			window.removeEventListener('touchend', handleTouchEnd, { capture: true });
		};
	});

	const currentPath = $derived(page.url.pathname);

	const showLabels = $derived(navigationSettings.showLabels);
	const scrollToHideEnabled = $derived(navigationSettings.scrollToHide);

	let visible = $state(true);
	let menuOpen = $state(false);
	let lastScrollY = $state(0);
	let navElement: HTMLElement;
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

	// Immediate touch gesture detection so the nav hides as soon as the
	// user starts a downward scroll gesture on touch devices. This
	// complements the regular scroll listener which can lag on some
	// devices or when scrolling inside nested scroll containers.
	let touchStartY: number | null = null;
	let isInteractiveTouch = false;
	const touchMoveThreshold = 6; // small threshold to avoid noise

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

		const scrollThreshold = 10; // Lower threshold for better touch responsiveness
		const minScrollDistance = 80; // Minimum scroll from top to hide

		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			const scrollDiff = currentScrollY - untrack(() => lastScrollY);

			// Clear any existing timeout
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
				scrollTimeout = null;
			}

			// Only update if scroll difference exceeds threshold
			if (Math.abs(scrollDiff) > scrollThreshold) {
				// Scrolling down and past minimum distance - hide nav
				if (scrollDiff > 0 && currentScrollY > minScrollDistance) {
					visible = false;
				}
				// Scrolling up - show nav
				else if (scrollDiff < 0) {
					visible = true;
				}

				lastScrollY = currentScrollY;
			}

			// At top of page - always show after scroll stops
			scrollTimeout = setTimeout(() => {
				if (window.scrollY < minScrollDistance) {
					visible = true;
				}
			}, 150);
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
		'mobile-nav-base mobile-nav-docked',
		'fixed bottom-0 left-0 right-0 z-50 gap-2',
		'bg-background/95 border-border/50 border-t backdrop-blur-sm',
		'shadow-lg',
		'select-none',
		'transition-all duration-300 ease-out',
		'flex items-center justify-around',
		showLabels ? 'px-3 py-2' : 'px-3 py-2.5',
		visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
		className
	)}
	data-testid="mobile-docked-nav"
	aria-label={m.mobile_navigation()}
>
	{#each pinnedItems as item (item.url)}
		<MobileNavItem {item} {showLabels} active={currentPath === item.url || currentPath.startsWith(item.url + '/')} />
	{/each}
</nav>

<MobileNavSheet bind:open={menuOpen} {user} {versionInformation} navigationMode="docked" />
