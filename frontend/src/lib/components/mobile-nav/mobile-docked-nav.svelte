<script lang="ts">
	import { page } from '$app/state';
	import type { NavigationItem } from '$lib/config/navigation-config';
	import MobileNavItem from './mobile-nav-item.svelte';
	import { cn } from '$lib/utils';
	import { ScrollDirectionDetector } from '$lib/hooks/use-scroll-direction.svelte';
	import { TapOutsideDetector } from '$lib/hooks/use-tap-outside.svelte';
	import { SwipeGestureDetector, type SwipeDirection } from '$lib/hooks/use-swipe-gesture.svelte';
	import MobileNavSheet from './mobile-nav-sheet.svelte';
	import './styles.css';

	let {
		pinnedItems = [],
		navigationSettings,
		user = null,
		versionInformation = null,
		class: className = ''
	}: {
		pinnedItems: NavigationItem[];
		navigationSettings: {
			mode: string;
			showLabels: boolean;
			scrollToHide: boolean;
			tapToHide: boolean;
		};
		user?: any;
		versionInformation?: any;
		class?: string;
	} = $props();

	const currentPath = $derived(page.url.pathname);
	
	// Get navigation settings from props
	const showLabels = $derived(navigationSettings.showLabels);
	const scrollToHideEnabled = $derived(navigationSettings.scrollToHide);
	const tapToHideEnabled = $derived(navigationSettings.tapToHide);
	
	// Local state for visibility and menu
	let visible = $state(true);
	let menuOpen = $state(false);
	
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
				visible = false;
			} else if (direction === 'up') {
				// Show on scroll up immediately - permanently set to visible
				visible = true;
			} else if (direction === 'idle' && scrollY <= 100) {
				// Near top of page when idle - permanently set to visible
				visible = true;
			}
		}
	});
	
	// Make navigation bar visible when navigation sheet closes and ensure touch is restored
	let previousMenuOpen = $state(false);
	$effect(() => {
		const currentMenuOpen = menuOpen;
		
		// If menu was open and is now closed, make navigation bar visible
		if (previousMenuOpen && !currentMenuOpen) {
			visible = true;
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
		visible = !visible;
		
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
			menuOpen = true;
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
				if (menuOpen) {
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
				if (menuOpen) {
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
					if (!menuOpen || Date.now() - lastGestureTime < 500) {
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
					menuOpen = true;
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
				if (!menuOpen) {
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
		'mobile-nav-base mobile-nav-docked',
		'fixed bottom-0 left-0 right-0 z-50',
		'bg-background/95 backdrop-blur-sm border-t border-border/50',
		'shadow-lg',
		'select-none', // Prevent text selection but allow touch
		'transition-all duration-300 ease-out', // Smoother easing
		'flex items-center justify-around',
		showLabels ? 'px-3 py-2' : 'px-3 py-2.5',
		shouldShow ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
		className
	)}
	data-testid="mobile-docked-nav"
	aria-label="Mobile navigation"
>
	{#each pinnedItems as item (item.url)}
		<MobileNavItem {item} {showLabels} active={currentPath === item.url || currentPath.startsWith(item.url + '/')} />
	{/each}
</nav>

<!-- Navigation Sheet -->
<MobileNavSheet 
	bind:open={menuOpen}
	{user} 
	{versionInformation} 
/>
