<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import type { NavigationItem, MobileNavigationSettings } from '$lib/config/navigation-config';
	import { getAvailableMobileNavItems } from '$lib/config/navigation-config';
	import MobileNavItem from './mobile-nav-item.svelte';
	import { cn } from '$lib/utils';
	import { SwipeGestureDetector, type SwipeDirection } from '$lib/hooks/use-swipe-gesture.svelte';
	import MobileNavSheet from './mobile-nav-sheet.svelte';
	import { m } from '$lib/paraglide/messages';
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

	const pinnedItems = $derived.by(() => {
		const availableItems = getAvailableMobileNavItems();
		return navigationSettings.pinnedItems
			.map((url) => availableItems.find((item) => item.url === url))
			.filter((item) => item !== undefined);
	});

	const currentPath = $derived(page.url.pathname);
	const showLabels = $derived(navigationSettings.showLabels);
	const scrollToHideEnabled = $derived(navigationSettings.scrollToHide);
	const mode = $derived(navigationSettings.mode);

	let visible = $state(true);
	let menuOpen = $state(false);
	let lastScrollY = $state(0);
	let navElement: HTMLElement;
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

	// Touch gesture detection variables
	let touchStartY: number | null = null;
	let isInteractiveTouch = false;
	const touchMoveThreshold = 6;

	// Touch-based detection for immediate hide/show
	$effect(() => {
		if (typeof window === 'undefined') return;
		if (!scrollToHideEnabled) return;

		const handleTouchStart = (e: TouchEvent) => {
			if (menuOpen) return;
			const t = e.touches?.[0];
			if (!t) return;
			const target = e.target as HTMLElement | null;

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

			if (deltaY < 0) {
				visible = false;
			} else {
				visible = true;
			}

			touchStartY = t.clientY;
		};

		const handleTouchEnd = () => {
			touchStartY = null;
			isInteractiveTouch = false;
		};

		const options = { passive: true, capture: true };
		window.addEventListener('touchstart', handleTouchStart, options);
		window.addEventListener('touchmove', handleTouchMove, options);
		window.addEventListener('touchend', handleTouchEnd, options);

		return () => {
			window.removeEventListener('touchstart', handleTouchStart, options);
			window.removeEventListener('touchmove', handleTouchMove, options);
			window.removeEventListener('touchend', handleTouchEnd, options);
		};
	});

	// Swipe gesture detector for opening menu (touch devices swipe UP on nav bar)
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

	// Trackpad flick detection - ONLY super fast velocity flicks trigger the menu
	let lastWheelTime = $state(0);
	let lastWheelDelta = $state(0);
	let flickDetectTimeout: ReturnType<typeof setTimeout> | null = null;
	let wheelVelocityHistory: number[] = $state([]);

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
			const prevScrollY = lastScrollY;
			const scrollDiff = currentScrollY - prevScrollY;

			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
				scrollTimeout = null;
			}

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

			if (!atBottom) {
				scrollTimeout = setTimeout(() => {
					if (window.scrollY < minScrollDistance) {
						visible = true;
					}
				}, 150);
			}
		};

		// Wheel handler for detecting ONLY super fast trackpad flicks
		const handleWheel = (e: WheelEvent) => {
			if (menuOpen || !scrollToHideEnabled) return;

			// Only respond to downward scrolls (positive deltaY)
			if (e.deltaY <= 0) return;

			const now = Date.now();
			const timeSinceLastWheel = now - lastWheelTime;

			// Calculate velocity: deltaY per millisecond
			const velocity = e.deltaY / Math.max(1, timeSinceLastWheel);

			// Only trigger on EXTREME velocity (> 5 pixels per ms = very fast flick)
			// Normal scrolling is typically 0.1-0.5 px/ms
			// Fast flicks are 2+ px/ms
			// Super fast flicks are 5+ px/ms
			const isSuperFastFlick = velocity > 5;

			if (isSuperFastFlick) {
				menuOpen = true;
				wheelVelocityHistory = [];

				if (flickDetectTimeout) {
					clearTimeout(flickDetectTimeout);
				}
			}

			// Update tracking for next event
			lastWheelTime = now;
			lastWheelDelta = e.deltaY;
			wheelVelocityHistory.push(velocity);
			wheelVelocityHistory = wheelVelocityHistory.slice(-3); // Keep last 3 velocities

			// Reset after 200ms of inactivity
			if (flickDetectTimeout) {
				clearTimeout(flickDetectTimeout);
			}
			flickDetectTimeout = setTimeout(() => {
				lastWheelTime = 0;
				lastWheelDelta = 0;
				wheelVelocityHistory = [];
			}, 200);
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('wheel', handleWheel, { passive: true });

		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('wheel', handleWheel);
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}
			if (flickDetectTimeout) {
				clearTimeout(flickDetectTimeout);
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

	// Keep page padding in sync with nav height via CSS variables
	$effect(() => {
		if (!navElement || typeof document === 'undefined') return;

		const root = document.documentElement;
		const cssVarName = mode === 'floating' ? '--mobile-floating-nav-offset' : '--mobile-docked-nav-offset';

		const applyOffset = () => {
			if (mode === 'floating') {
				const rect = navElement.getBoundingClientRect();
				const computed = window.getComputedStyle(navElement);
				const bottomGap = parseFloat(computed.bottom || '0') || 0;
				const offset = rect.height + bottomGap;
				root.style.setProperty(cssVarName, `${offset}px`);
			} else {
				root.style.setProperty(cssVarName, `${navElement.offsetHeight}px`);
			}
		};

		applyOffset();

		let observer: ResizeObserver | null = null;
		if (typeof ResizeObserver !== 'undefined') {
			observer = new ResizeObserver(() => applyOffset());
			observer.observe(navElement);
		}

		const handleResize = mode === 'floating' ? () => applyOffset() : null;
		if (handleResize && typeof window !== 'undefined') {
			window.addEventListener('resize', handleResize);
			window.visualViewport?.addEventListener('resize', handleResize);
		}

		return () => {
			observer?.disconnect();
			if (handleResize && typeof window !== 'undefined') {
				window.removeEventListener('resize', handleResize);
				window.visualViewport?.removeEventListener('resize', handleResize);
			}
			root.style.removeProperty(cssVarName);
		};
	});

	// Mode-specific styles
	const navClasses = $derived(
		cn(
			'mobile-nav-base',
			mode === 'floating' ? 'mobile-nav-floating' : 'mobile-nav-docked',
			mode === 'floating' ? 'fixed left-1/2 z-50 -translate-x-1/2 transform' : 'fixed bottom-0 left-0 right-0 z-50 gap-2',
			'bg-background/60 border-border/30 backdrop-blur-xl',
			'shadow-sm select-none transition-all duration-300 ease-out',
			'flex items-center',
			mode === 'floating'
				? cn('rounded-3xl border', showLabels ? 'gap-2 px-3 py-2' : 'gap-3 px-4 py-2.5')
				: cn('border-t border-border/50 justify-around', showLabels ? 'px-3 py-2' : 'px-3 py-2.5'),
			visible
				? mode === 'floating'
					? 'translate-y-0 scale-100 opacity-100'
					: 'translate-y-0 opacity-100'
				: mode === 'floating'
					? 'translate-y-full scale-95 opacity-0'
					: 'translate-y-full opacity-0',
			className
		)
	);

	const ariaLabel = $derived(mode === 'docked' ? m.mobile_navigation() : 'Mobile navigation');
	const testId = $derived(mode === 'floating' ? 'mobile-floating-nav' : 'mobile-docked-nav');
</script>

<nav bind:this={navElement} class={navClasses} data-testid={testId} aria-label={ariaLabel}>
	{#each pinnedItems as item (item.url)}
		<MobileNavItem {item} {showLabels} active={currentPath === item.url || currentPath.startsWith(item.url + '/')} />
	{/each}
</nav>

<MobileNavSheet bind:open={menuOpen} {user} {versionInformation} navigationMode={mode} />
