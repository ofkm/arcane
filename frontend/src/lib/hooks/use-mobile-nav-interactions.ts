import { ScrollDirectionDetector } from './use-scroll-direction.svelte';
import { TapOutsideDetector } from './use-tap-outside.svelte';
import { SwipeGestureDetector, type SwipeDirection } from './use-swipe-gesture.svelte';

export interface MobileNavInteractionOptions {
	// Scroll detection options
	scrollThreshold?: number;
	scrollMinDistance?: number;
	scrollTopThreshold?: number;
	scrollChangeThreshold?: number;

	// Tap detection options
	tapDebounceTimeout?: number;

	// Swipe detection options
	swipeThreshold?: number;
	swipeVelocity?: number;
	swipeTimeLimit?: number;

	// Touch handling options
	touchEndDelay?: number;
	menuOpenRestoreDelay?: number;
	overlayFadeOutDelay?: number;
	wheelThreshold?: number;
}

export interface MobileNavInteractionCallbacks {
	onVisibilityChange: (visible: boolean) => void;
	onMenuOpen: () => void;
	onScrollDirectionChange?: (direction: string, scrollY: number) => void;
	shouldPreventTouch?: (menuOpen: boolean) => boolean;
}

export interface MobileNavInteractionState {
	menuOpen: boolean;
	scrollToHideEnabled: boolean;
	tapToHideEnabled: boolean;
	visible: boolean;
}

export class MobileNavInteractionManager {
	private readonly scrollDetector: ScrollDirectionDetector;
	private readonly tapDetector: TapOutsideDetector;
	private readonly swipeDetector: SwipeGestureDetector;

	private readonly options: Required<MobileNavInteractionOptions>;
	private readonly callbacks: MobileNavInteractionCallbacks;
	private state: MobileNavInteractionState;

	private navElement: HTMLElement | null = null;
	private tapDebounceTimeoutId: ReturnType<typeof setTimeout> | null = null;
	private lastGestureTime = 0;
	private lastScrollDirection: string | null = null;
	private lastScrollY = 0;

	// Touch handling state
	private touchStartTarget: HTMLElement | null = null;
	private isInteractiveTouch = false;

	// Cleanup functions
	private cleanupFunctions: (() => void)[] = [];

	constructor(callbacks: MobileNavInteractionCallbacks, options: MobileNavInteractionOptions = {}) {
		this.callbacks = callbacks;
		this.options = {
			scrollThreshold: options.scrollThreshold ?? 15,
			scrollMinDistance: options.scrollMinDistance ?? 100,
			scrollTopThreshold: options.scrollTopThreshold ?? 100,
			scrollChangeThreshold: options.scrollChangeThreshold ?? 50,
			tapDebounceTimeout: options.tapDebounceTimeout ?? 300,
			swipeThreshold: options.swipeThreshold ?? 20,
			swipeVelocity: options.swipeVelocity ?? 0.1,
			swipeTimeLimit: options.swipeTimeLimit ?? 1000,
			touchEndDelay: options.touchEndDelay ?? 150,
			menuOpenRestoreDelay: options.menuOpenRestoreDelay ?? 50,
			overlayFadeOutDelay: options.overlayFadeOutDelay ?? 200,
			wheelThreshold: options.wheelThreshold ?? 10
		};

		this.state = {
			menuOpen: false,
			scrollToHideEnabled: false,
			tapToHideEnabled: false,
			visible: true
		};

		// Initialize detectors directly in constructor
		this.scrollDetector = new ScrollDirectionDetector(this.options.scrollThreshold);

		this.tapDetector = new TapOutsideDetector(() => {
			if (!this.state.tapToHideEnabled) return;

			// Debounce rapid taps to prevent bouncing animation
			if (this.tapDebounceTimeoutId) {
				clearTimeout(this.tapDebounceTimeoutId);
				this.tapDebounceTimeoutId = null;
				return;
			}

			// Toggle visibility - if visible, hide it; if hidden, show it
			const newVisibility = !this.state.visible;
			this.state.visible = newVisibility;
			this.callbacks.onVisibilityChange(newVisibility);

			// Set debounce timeout
			this.tapDebounceTimeoutId = setTimeout(() => {
				this.tapDebounceTimeoutId = null;
			}, this.options.tapDebounceTimeout);
		});

		this.swipeDetector = new SwipeGestureDetector(
			(direction: SwipeDirection) => {
				if (direction === 'up') {
					this.lastGestureTime = Date.now();
					this.callbacks.onMenuOpen();
				}
			},
			{
				threshold: this.options.swipeThreshold,
				velocity: this.options.swipeVelocity,
				timeLimit: this.options.swipeTimeLimit
			}
		);
	}

	public updateState(newState: Partial<MobileNavInteractionState>) {
		this.state = { ...this.state, ...newState };
	}

	public resetVisibility() {
		this.state.visible = true;
		this.callbacks.onVisibilityChange(true);
	}

	public setupElement(element: HTMLElement | null) {
		// Cleanup previous setup
		this.cleanup();

		this.navElement = element;

		if (!element) return;

		// Setup tap detection target
		if (this.state.tapToHideEnabled) {
			this.tapDetector.setTargetElement(element);
		}

		// Setup swipe detection target
		this.swipeDetector.setElement(element);

		// Setup touch event handlers
		this.setupTouchHandlers(element);

		// Setup mouse event handlers for desktop/pointer devices
		this.setupMouseHandlers(element);
	}

	private setupTouchHandlers(element: HTMLElement) {
		const handleTouchStart = (e: TouchEvent) => {
			const shouldPreventTouch = this.callbacks.shouldPreventTouch?.(this.state.menuOpen);
			if (shouldPreventTouch) return;

			// Store touch start target and check if it's interactive
			this.touchStartTarget = e.target as HTMLElement;
			this.isInteractiveTouch = !!this.touchStartTarget.closest('button, a, [role="button"]');

			// Only prevent background scrolling for gesture interactions
			if (!this.isInteractiveTouch) {
				this.lockBodyScroll();
				e.stopPropagation();
			}
		};

		const handleTouchMove = (e: TouchEvent) => {
			const shouldPreventTouch = this.callbacks.shouldPreventTouch?.(this.state.menuOpen);
			if (shouldPreventTouch) return;

			// Always prevent default for touchmove to stop page scrolling
			e.preventDefault();
			e.stopPropagation();

			// If touch started on an interactive element, check if still on it
			if (this.isInteractiveTouch) {
				const touch = e.touches[0];
				const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
				const stillOnInteractive = target && target.closest('button, a, [role="button"]');

				if (!stillOnInteractive) {
					// Moved off interactive element, treat as gesture
					this.isInteractiveTouch = false;
				}
			}
		};

		const handleTouchEnd = (e: TouchEvent) => {
			// Always restore scrolling after a brief delay
			setTimeout(() => {
				// Only restore if menu is still closed, or if menu just opened
				if (!this.state.menuOpen || Date.now() - this.lastGestureTime < 500) {
					this.unlockBodyScroll();
				}
			}, this.options.touchEndDelay);

			// Reset touch state
			this.touchStartTarget = null;
			this.isInteractiveTouch = false;
		};

		element.addEventListener('touchstart', handleTouchStart, { passive: false, capture: false });
		element.addEventListener('touchmove', handleTouchMove, { passive: false, capture: false });
		element.addEventListener('touchend', handleTouchEnd, { passive: true, capture: false });

		// Store cleanup functions
		this.cleanupFunctions.push(() => {
			element.removeEventListener('touchstart', handleTouchStart);
			element.removeEventListener('touchmove', handleTouchMove);
			element.removeEventListener('touchend', handleTouchEnd);
		});
	}

	private setupMouseHandlers(element: HTMLElement) {
		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			e.stopPropagation();

			// Only respond to downward gestures
			if (e.deltaY > this.options.wheelThreshold) {
				this.callbacks.onMenuOpen();
			}
		};

		const handleDocumentWheel = (e: WheelEvent) => {
			// Only prevent scrolling if the event is NOT on the navbar
			if (!element.contains(e.target as Node)) {
				e.preventDefault();
				e.stopPropagation();
			}
		};

		const handleMouseEnter = () => {
			// Prevent page scrolling except on navbar when hovering navbar
			document.addEventListener('wheel', handleDocumentWheel, { passive: false, capture: true });
			element.addEventListener('wheel', handleWheel, { passive: false });

			// Prevent page body scrolling and capture pointer
			this.lockBodyScroll();
			document.body.style.pointerEvents = 'none';
			element.style.pointerEvents = 'auto';
		};

		const handleMouseLeave = () => {
			// Restore page scrolling when leaving navbar
			document.removeEventListener('wheel', handleDocumentWheel, true);
			element.removeEventListener('wheel', handleWheel);

			// Restore scrolling and interactions
			this.unlockBodyScroll();
			document.body.style.pointerEvents = '';
			element.style.pointerEvents = '';
		};

		element.addEventListener('mouseenter', handleMouseEnter);
		element.addEventListener('mouseleave', handleMouseLeave);

		// Store cleanup functions
		this.cleanupFunctions.push(() => {
			element.removeEventListener('mouseenter', handleMouseEnter);
			element.removeEventListener('mouseleave', handleMouseLeave);
			element.removeEventListener('wheel', handleWheel);
			document.removeEventListener('wheel', handleDocumentWheel, true);
		});
	}

	public handleScrollEffect(direction: string, scrollY: number) {
		// Only update when scroll direction or position changes significantly
		if (
			(direction !== this.lastScrollDirection || Math.abs(scrollY - this.lastScrollY) > this.options.scrollChangeThreshold) &&
			this.state.scrollToHideEnabled
		) {
			this.lastScrollDirection = direction;
			this.lastScrollY = scrollY;

			// Call optional callback
			this.callbacks.onScrollDirectionChange?.(direction, scrollY);

			// Update visibility state based on scroll behavior
			if (direction === 'down' && scrollY > this.options.scrollMinDistance) {
				this.state.visible = false;
				this.callbacks.onVisibilityChange(false);
			} else if (direction === 'up') {
				this.state.visible = true;
				this.callbacks.onVisibilityChange(true);
			} else if (direction === 'idle' && scrollY <= this.options.scrollTopThreshold) {
				this.state.visible = true;
				this.callbacks.onVisibilityChange(true);
			}
		}
	}

	public handleMenuStateChange(previousMenuOpen: boolean, currentMenuOpen: boolean) {
		// If menu was open and is now closed, make navigation bar visible
		if (previousMenuOpen && !currentMenuOpen) {
			this.state.visible = true;
			this.callbacks.onVisibilityChange(true);
		}

		// If menu just opened, ensure touch scrolling is restored for the menu
		if (!previousMenuOpen && currentMenuOpen) {
			setTimeout(() => {
				this.unlockBodyScroll();
			}, this.options.menuOpenRestoreDelay);
		}
	}

	public lockBodyScroll() {
		document.body.style.overflow = 'hidden';
		document.documentElement.style.overflow = 'hidden';
	}

	public unlockBodyScroll() {
		document.body.style.overflow = '';
		document.documentElement.style.overflow = '';
	}

	public cleanup() {
		// Cleanup all event listeners
		this.cleanupFunctions.forEach((fn) => fn());
		this.cleanupFunctions = [];

		// Clear tap debounce timeout
		if (this.tapDebounceTimeoutId) {
			clearTimeout(this.tapDebounceTimeoutId);
			this.tapDebounceTimeoutId = null;
		}

		// Always ensure all mouse interactions are unlocked during cleanup
		this.unlockBodyScroll();
		document.body.style.pointerEvents = '';

		if (this.navElement) {
			this.navElement.style.pointerEvents = '';
		}

		// Clean up any remaining overlay
	}

	// Getters for accessing detectors
	public get scrollDirection() {
		return this.scrollDetector.direction;
	}

	public get scrollY() {
		return this.scrollDetector.scrollY;
	}
}

// Convenience function for Svelte components
export function createMobileNavInteractions(callbacks: MobileNavInteractionCallbacks, options: MobileNavInteractionOptions = {}) {
	return new MobileNavInteractionManager(callbacks, options);
}
