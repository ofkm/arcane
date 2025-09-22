<script lang="ts">
	import { page } from '$app/state';
	import type { NavigationItem } from '$lib/config/navigation-config';
	import MobileNavItem from './mobile-nav-item.svelte';
	import { cn } from '$lib/utils';
	import { ScrollDirectionDetector } from '$lib/hooks/use-scroll-direction.svelte';
	import { TapOutsideDetector } from '$lib/hooks/use-tap-outside.svelte';
	import { SwipeGestureDetector, type SwipeDirection } from '$lib/hooks/use-swipe-gesture.svelte';
	import { mobileNavStore } from '$lib/stores/mobile-nav-store';
	import MobileNavSheet from './mobile-nav-sheet.svelte';

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
	
	// Get navigation behavior settings from store
	const navigationState = $derived($mobileNavStore);
	const behaviorSettings = $derived(navigationState.behaviorSettings);
	const showLabels = $derived(behaviorSettings.showLabels);
	const scrollToHideEnabled = $derived(behaviorSettings.scrollToHide);
	const tapToHideEnabled = $derived(behaviorSettings.tapToHide);
	
	// Scroll behavior
	const scrollDetector = new ScrollDirectionDetector(15); // 15px threshold
	let navElement: HTMLElement;
	let autoHidden = $state(false);
	let tapDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
	
	// Compute visibility based on scroll direction - always use manual state
	const shouldShow = $derived(visible);
	
	// Track scroll changes and permanently update the store state
	let lastScrollDirection: string | null = null;
	let lastScrollY = 0;
	
	$effect(() => {
		const direction = scrollDetector.direction;
		const scrollY = scrollDetector.scrollY;
		
		// Only update store when scroll direction or position changes significantly
		// Also check if scroll to hide is enabled
		if ((direction !== lastScrollDirection || Math.abs(scrollY - lastScrollY) > 50) && scrollToHideEnabled) {
			lastScrollDirection = direction;
			lastScrollY = scrollY;
			
			// Permanently update visibility state based on scroll behavior
			if (direction === 'down' && scrollY > 100) {
				// Hide on scroll down after minimum distance - permanently set to hidden
				if (visible) {
					mobileNavStore.setVisibility(false);
				}
			} else if (direction === 'up') {
				// Show on scroll up immediately - permanently set to visible
				if (!visible) {
					mobileNavStore.setVisibility(true);
				}
			} else if (direction === 'idle' && scrollY <= 100) {
				// Near top of page when idle - permanently set to visible
				if (!visible) {
					mobileNavStore.setVisibility(true);
				}
			}
		}
	});
	
	// Make navigation bar visible when navigation sheet closes and ensure touch is restored
	let previousMenuOpen = $state($mobileNavStore.menuOpen);
	$effect(() => {
		const currentMenuOpen = $mobileNavStore.menuOpen;
		
		// If menu was open and is now closed, make navigation bar visible
		if (previousMenuOpen && !currentMenuOpen) {
			mobileNavStore.setVisibility(true);
		}
		
		// If menu just opened, ensure touch scrolling is restored for the menu
		if (!previousMenuOpen && currentMenuOpen) {
			// Restore scrolling immediately when menu opens to allow menu content scrolling
			setTimeout(() => {
				document.body.style.overflow = '';
				document.documentElement.style.overflow = '';
			}, 50);
		}
		
		previousMenuOpen = currentMenuOpen;
	});
	
	// Update auto-hidden state
	$effect(() => {
		const newAutoHidden = !shouldShow;
		if (newAutoHidden !== autoHidden) {
			autoHidden = newAutoHidden;
		}
	});
	
	// Tap outside to toggle navigation visibility
	const tapDetector = new TapOutsideDetector(() => {
		// Only respond to tap gestures if tap to hide is enabled
		if (!tapToHideEnabled) return;
		
		// Debounce rapid taps to prevent bouncing animation
		if (tapDebounceTimeout) {
			clearTimeout(tapDebounceTimeout);
			tapDebounceTimeout = null;
			return; // Ignore rapid successive taps
		}
		
		// Simple toggle: flip the current visibility state
		mobileNavStore.setVisibility(!visible);
		
		// Set debounce timeout to prevent rapid taps
		tapDebounceTimeout = setTimeout(() => {
			tapDebounceTimeout = null;
		}, 300); // 300ms debounce
	});
	
	// Set the target element for tap detection
	$effect(() => {
		if (navElement && tapToHideEnabled) {
			// Only set up tap detection if tap to hide is enabled
			// Always set the nav element as the target, regardless of visibility
			// The detector needs to know what to exclude, even when hidden
			tapDetector.setTargetElement(navElement);
		}
	});
	
	// Track gesture timing to help with touch restoration
	let lastGestureTime = 0;
	
	// Swipe gesture detection for opening navigation sheet
	const swipeDetector = new SwipeGestureDetector((direction: SwipeDirection) => {
		if (direction === 'up' && shouldShow) {
			lastGestureTime = Date.now();
			mobileNavStore.setMenuOpen(true);
		}
	}, { threshold: 20, velocity: 0.1, timeLimit: 1000 });
	
	// Set the target element for swipe detection and stop scroll momentum
	$effect(() => {
		if (navElement) {
			swipeDetector.setElement(navElement);
			
			// Enhanced touch handling: prevent background scrolling during all touch interactions
			let touchStartTarget: HTMLElement | null = null;
			let isInteractiveTouch = false;
			
			const handleTouchStart = (e: TouchEvent) => {
				// Don't interfere if the navigation sheet is open
				if ($mobileNavStore.menuOpen) {
					return;
				}
				
				// Store touch start target and check if it's interactive
				touchStartTarget = e.target as HTMLElement;
				isInteractiveTouch = !!touchStartTarget.closest('button, a, [role="button"]');
				
				// Only prevent background scrolling for gesture interactions
				// This ensures consistent behavior while allowing interactive elements to work
				if (!isInteractiveTouch) {
					document.body.style.overflow = 'hidden';
					document.documentElement.style.overflow = 'hidden';
					// For non-interactive touches, stop propagation to prevent page interactions
					e.stopPropagation();
				}
			};

			const handleTouchMove = (e: TouchEvent) => {
				// Don't interfere if the navigation sheet is open
				if ($mobileNavStore.menuOpen) {
					return;
				}
				
				// Always prevent default for touchmove to stop page scrolling
				// This is crucial for preventing the "swipe up scrolls page" issue
				e.preventDefault();
				e.stopPropagation();
				
				// If touch started on an interactive element, allow some movement tolerance
				// but still prevent page scrolling
				if (isInteractiveTouch) {
					// Check if we've moved too far from interactive element - if so, treat as gesture
					const touch = e.touches[0];
					const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
					const stillOnInteractive = target && target.closest('button, a, [role="button"]');
					
					if (!stillOnInteractive) {
						// Moved off interactive element, treat as gesture
						isInteractiveTouch = false;
					}
				}
			};

			const handleTouchEnd = (e: TouchEvent) => {
				// Always restore scrolling after a brief delay to ensure gesture processing is complete
				// The delay allows the swipe gesture to complete before re-enabling scroll
				setTimeout(() => {
					// Only restore if menu is still closed, or if menu just opened (to allow menu scrolling)
					if (!$mobileNavStore.menuOpen || Date.now() - lastGestureTime < 500) {
						document.body.style.overflow = '';
						document.documentElement.style.overflow = '';
					}
				}, 150);
				
				// Reset touch state
				touchStartTarget = null;
				isInteractiveTouch = false;
			};
			
			// Add touch listeners to prevent background scrolling during gestures
			navElement.addEventListener('touchstart', handleTouchStart, { 
				passive: false, 
				capture: false 
			});
			navElement.addEventListener('touchmove', handleTouchMove, { 
				passive: false, 
				capture: false 
			});
			navElement.addEventListener('touchend', handleTouchEnd, { 
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
				
				// Add dimming overlay with blur (desktop/pointer devices only)
				if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
					const overlay = document.createElement('div');
					overlay.id = 'nav-hover-overlay';
					overlay.style.cssText = `
						position: fixed;
						top: 0;
						left: 0;
						right: 0;
						bottom: 0;
						background-color: rgba(0, 0, 0, 0.2);
						backdrop-filter: blur(1px);
						z-index: 40;
						transition: opacity 200ms ease-out, backdrop-filter 200ms ease-out;
						pointer-events: none;
					`;
					document.body.appendChild(overlay);
					// Trigger transition
					requestAnimationFrame(() => {
						overlay.style.opacity = '1';
					});
				}
			};
			
			const handleMouseLeave = () => {
				// Restore page scrolling when leaving navbar
				document.removeEventListener('wheel', handleDocumentWheel, true);
				navElement.removeEventListener('wheel', handleWheel);
				// Restore scrolling and interactions
				document.body.style.overflow = '';
				document.body.style.pointerEvents = '';
				navElement.style.pointerEvents = '';
				
				// Remove dimming overlay
				const overlay = document.getElementById('nav-hover-overlay');
				if (overlay) {
					overlay.style.opacity = '0';
					setTimeout(() => {
						if (overlay.parentNode) {
							overlay.parentNode.removeChild(overlay);
						}
					}, 200);
				}
			};
			
			// Add mouse event listeners for cursor/pointer devices
			navElement.addEventListener('mouseenter', handleMouseEnter);
			navElement.addEventListener('mouseleave', handleMouseLeave);
			
			return () => {
				navElement.removeEventListener('touchstart', handleTouchStart);
				navElement.removeEventListener('touchmove', handleTouchMove);
				navElement.removeEventListener('touchend', handleTouchEnd);
				navElement.removeEventListener('mouseenter', handleMouseEnter);
				navElement.removeEventListener('mouseleave', handleMouseLeave);
				navElement.removeEventListener('wheel', handleWheel);
				document.removeEventListener('wheel', handleDocumentWheel, true);
				// Ensure all styles are restored - but only if menu is not open
				if (!$mobileNavStore.menuOpen) {
					document.body.style.overflow = '';
					document.body.style.pointerEvents = '';
					document.documentElement.style.overflow = '';
				}
				if (navElement) {
					navElement.style.pointerEvents = '';
				}
				// Clean up any remaining overlay
				const overlay = document.getElementById('nav-hover-overlay');
				if (overlay && overlay.parentNode) {
					overlay.parentNode.removeChild(overlay);
				}
				// Clean up tap debounce timeout
				if (tapDebounceTimeout) {
					clearTimeout(tapDebounceTimeout);
					tapDebounceTimeout = null;
				}
			};
		}
	});
</script>

<nav
	bind:this={navElement}
	class={cn(
		'fixed bottom-6 left-1/2 z-50 transform -translate-x-1/2',
		'bg-background/60 backdrop-blur-xl border border-border/30',
		'shadow-sm rounded-3xl',
		'select-none', // Prevent text selection but allow touch
		'transition-all duration-300 ease-out', // Smoother easing
		showLabels 
			? 'px-3 py-2 flex items-center gap-2' 
			: 'px-4 py-2.5 flex items-center gap-3',
		shouldShow ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95',
		className
	)}
	data-testid="mobile-floating-nav"
	aria-label="Mobile navigation"
>
	{#each pinnedItems as item (item.url)}
		<MobileNavItem {item} {showLabels} active={currentPath === item.url || currentPath.startsWith(item.url + '/')} />
	{/each}
</nav>

<!-- Navigation Sheet -->
<MobileNavSheet 
	open={$mobileNavStore.menuOpen} 
	{user} 
	{versionInformation} 
/>

<style>
	/* Ensure proper pointer and touch handling */
	nav {
		pointer-events: auto;
		/* Prevent browser's default touch gestures but allow custom ones */
		touch-action: none;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
		/* Isolate touch interactions similar to pointer device behavior */
		isolation: isolate;
		/* Hardware acceleration for smooth animations */
		will-change: transform, opacity;
		/* Prevent layout shifts during animation */
		transform-origin: center bottom;
		/* Smooth subpixel rendering */
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}
	
	/* Ensure buttons are fully interactive */
	nav :global(button),
	nav :global(a) {
		pointer-events: auto;
		touch-action: manipulation; /* Allow taps and prevent interfering gestures */
		position: relative;
		z-index: 1; /* Ensure buttons are above gesture detection */
		/* Isolate button touches from parent's touch handling */
		isolation: isolate;
	}
	
	/* Cursor device visual hint */
	@media (hover: hover) and (pointer: fine) {
		nav:hover {
			/* Subtle visual hint that scrolling up will open menu without moving the bar */
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04);
			backdrop-filter: blur(24px);
			border-color: var(--muted);
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
