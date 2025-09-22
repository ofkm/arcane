<script lang="ts">
	import { page } from '$app/state';
	import type { NavigationItem } from '$lib/config/navigation-config';
	import MobileNavItem from './mobile-nav-item.svelte';
	import { cn } from '$lib/utils';
	import { ScrollDirectionDetector } from '$lib/hooks/use-scroll-direction.svelte';
	import { TapOutsideDetector } from '$lib/hooks/use-tap-outside.svelte';
	import { SwipeGestureDetector, type SwipeDirection } from '$lib/hooks/use-swipe-gesture.svelte';
	import { mobileNavStore } from '$lib/stores/mobile-nav-store';
	import MobileFullscreenMenu from './mobile-fullscreen-menu.svelte';

	let {
		pinnedItems = [],
		visible = true,
		user = null,
		versionInformation = null,
		class: className = ''
	}: {
		pinnedItems: NavigationItem[];
		visible?: boolean;
		user?: any;
		versionInformation?: any;
		class?: string;
	} = $props();

	const currentPath = $derived(page.url.pathname);
	
	// Scroll behavior
	const scrollDetector = new ScrollDirectionDetector(15); // 15px threshold
	let navElement: HTMLElement;
	let autoHidden = $state(false);
	
	// Compute visibility based on scroll direction and manual visibility
	// Memoize this computation to avoid unnecessary recalculations
	const shouldShow = $derived.by(() => {
		if (!visible) return false;
		
		const direction = scrollDetector.direction;
		const scrollY = scrollDetector.scrollY;
		
		// Hide on scroll down after minimum scroll distance
		if (direction === 'down' && scrollY > 100) {
			return false;
		}
		
		// Show on scroll up immediately
		if (direction === 'up') {
			return true;
		}
		
		// Show when idle and not far scrolled
		if (direction === 'idle' && scrollY <= 100) {
			return true;
		}
		
		// Default to current visibility state
		return !autoHidden;
	});
	
	// Update auto-hidden state and sync with store
	$effect(() => {
		const newAutoHidden = !shouldShow;
		if (newAutoHidden !== autoHidden) {
			autoHidden = newAutoHidden;
			// Don't override manual visibility changes, just track auto-hide state
		}
	});
	
	// Tap outside to show navigation when auto-hidden
	const tapDetector = new TapOutsideDetector(() => {
		if (autoHidden && !visible) {
			mobileNavStore.setVisibility(true);
		}
	});
	
	// Set the target element for tap detection
	$effect(() => {
		if (navElement) {
			tapDetector.setTargetElement(navElement);
		}
	});
	
	// Swipe gesture detection for opening fullscreen menu
	const swipeDetector = new SwipeGestureDetector((direction: SwipeDirection) => {
		if (direction === 'up' && shouldShow) {
			mobileNavStore.setMenuOpen(true);
		}
	}, { threshold: 40, velocity: 0.3 });
	
	// Set the target element for swipe detection and stop scroll momentum
	$effect(() => {
		if (navElement) {
			swipeDetector.setElement(navElement);
			
			// Minimal touch handling: only stop momentum when needed, let SwipeGestureDetector handle gestures
			const handleTouchStart = (e: TouchEvent) => {
				// Check if touching a button/link - if so, don't interfere
				const target = e.target as HTMLElement;
				const isInteractive = target.closest('button, a, [role="button"]');
				
				if (!isInteractive) {
					// Only stop scroll momentum briefly, don't prevent the event
					// This allows the SwipeGestureDetector to still process the touch
					document.body.style.overflow = 'hidden';
					setTimeout(() => {
						document.body.style.overflow = '';
					}, 50);
				}
			};
			
			// Add minimal touch start listener to handle momentum
			navElement.addEventListener('touchstart', handleTouchStart, { 
				passive: true, 
				capture: false 
			});
			
			// Add mouse/pointer device support for hover scrolling
			const handleWheel = (e: WheelEvent) => {
				// Always prevent default when hovering to capture all scroll events
				e.preventDefault();
				e.stopPropagation();
				
				// Only respond to downward gestures (positive deltaY = down)
				// This works correctly for both:
				// - Mouse wheels: scroll down = positive deltaY
				// - Trackpads with natural scrolling disabled: scroll down = positive deltaY
				// - Trackpads with natural scrolling enabled: swipe down = positive deltaY
				if (e.deltaY > 10) {
					mobileNavStore.setMenuOpen(true);
				}
			};
			
			// Global scroll prevention when hovering (but allow navbar events)
			const handleDocumentWheel = (e: WheelEvent) => {
				// Only prevent scrolling if the event is NOT on the navbar
				if (!navElement.contains(e.target as Node)) {
					e.preventDefault();
					e.stopPropagation();
				}
			};
			
			const handleMouseEnter = () => {
				// Prevent page scrolling except on navbar when hovering navbar
				document.addEventListener('wheel', handleDocumentWheel, { passive: false, capture: true });
				// Add specific wheel listener for navbar
				navElement.addEventListener('wheel', handleWheel, { passive: false });
				// Prevent page body scrolling
				document.body.style.overflow = 'hidden';
				// Capture pointer to prevent other interactions
				document.body.style.pointerEvents = 'none';
				navElement.style.pointerEvents = 'auto';
			};
			
			const handleMouseLeave = () => {
				// Restore page scrolling when leaving navbar
				document.removeEventListener('wheel', handleDocumentWheel, true);
				navElement.removeEventListener('wheel', handleWheel);
				// Restore scrolling and interactions
				document.body.style.overflow = '';
				document.body.style.pointerEvents = '';
				navElement.style.pointerEvents = '';
			};
			
			// Add mouse event listeners for cursor/pointer devices
			navElement.addEventListener('mouseenter', handleMouseEnter);
			navElement.addEventListener('mouseleave', handleMouseLeave);
			
			return () => {
				navElement.removeEventListener('touchstart', handleTouchStart);
				navElement.removeEventListener('mouseenter', handleMouseEnter);
				navElement.removeEventListener('mouseleave', handleMouseLeave);
				navElement.removeEventListener('wheel', handleWheel);
				document.removeEventListener('wheel', handleDocumentWheel, true);
				// Ensure all styles are restored
				document.body.style.overflow = '';
				document.body.style.pointerEvents = '';
				if (navElement) {
					navElement.style.pointerEvents = '';
				}
			};
		}
	});
</script>

<nav
	bind:this={navElement}
	class={cn(
		'fixed bottom-6 left-1/2 z-50 transform -translate-x-1/2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
		'bg-background/80 backdrop-blur-md border border-border/50 shadow-lg rounded-full',
		'px-2 py-1.5 flex items-center gap-1',
		'select-none', // Prevent text selection but allow touch
		shouldShow ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95',
		className
	)}
	data-testid="mobile-floating-nav"
	aria-label="Mobile navigation"
>
	{#each pinnedItems as item (item.url)}
		<MobileNavItem {item} active={currentPath === item.url || currentPath.startsWith(item.url + '/')} />
	{/each}
</nav>

<!-- Fullscreen Menu -->
<MobileFullscreenMenu 
	open={$mobileNavStore.menuOpen} 
	{user} 
	{versionInformation} 
/>

<style>
	/* Ensure proper pointer and touch handling */
	nav {
		pointer-events: auto;
		/* Allow touch gestures and scrolling */
		touch-action: auto;
		-webkit-overflow-scrolling: auto;
		overscroll-behavior: contain;
	}
	
	/* Ensure buttons are fully interactive */
	nav :global(button),
	nav :global(a) {
		pointer-events: auto;
		touch-action: manipulation; /* Allow taps and prevent interfering gestures */
		position: relative;
		z-index: 1; /* Ensure buttons are above gesture detection */
	}
	
	/* Cursor device visual hint */
	@media (hover: hover) and (pointer: fine) {
		nav {
			cursor: pointer;
		}
		
		nav:hover {
			/* Subtle visual hint that scrolling up will open menu without moving the bar */
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
			backdrop-filter: blur(20px);
		}
		
		nav :global(button),
		nav :global(a) {
			cursor: pointer;
		}
	}

	/* Ensure the component respects reduced motion preferences */
	@media (prefers-reduced-motion: reduce) {
		nav {
			transition: none;
		}
		
		/* Disable scale and complex animations for reduced motion */
		nav :global(button) {
			transition: none;
			transform: none !important;
		}
		
		nav :global(button:hover),
		nav :global(button:focus-visible),
		nav :global(button:active) {
			transform: none !important;
		}
	}
</style>
