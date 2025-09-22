import { onMount } from 'svelte';

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

export interface SwipeGestureOptions {
	threshold?: number; // Minimum distance in pixels
	velocity?: number; // Minimum velocity in pixels/ms
	timeLimit?: number; // Maximum time for swipe in ms
}

export class SwipeGestureDetector {
	private startX = 0;
	private startY = 0;
	private startTime = 0;
	private element = $state<HTMLElement | null>(null);
	private onSwipe: (direction: SwipeDirection, details: SwipeDetails) => void;
	private options: Required<SwipeGestureOptions>;
	private cleanupFn: (() => void) | null = null;
	private isInteractiveTouch = false;

	constructor(
		onSwipe: (direction: SwipeDirection, details: SwipeDetails) => void,
		options: SwipeGestureOptions = {}
	) {
		this.onSwipe = onSwipe;
		this.options = {
			threshold: options.threshold ?? 30,
			velocity: options.velocity ?? 0.2,
			timeLimit: options.timeLimit ?? 1000
		};

		onMount(() => {
			return () => {
				if (this.cleanupFn) {
					this.cleanupFn();
				}
			};
		});
	}

	setElement(element: HTMLElement | null) {
		// Clean up previous listeners
		if (this.cleanupFn) {
			this.cleanupFn();
			this.cleanupFn = null;
		}

		this.element = element;

		if (!element) return;

		const handleTouchStart = (e: TouchEvent) => {
			const touch = e.touches[0];
			this.startX = touch.clientX;
			this.startY = touch.clientY;
			this.startTime = Date.now();
			
			// Store if this started on an interactive element
			const target = e.target as HTMLElement;
			const isInteractive = target.closest('button, a, [role="button"], input, textarea, select');
			this.isInteractiveTouch = !!isInteractive;
		};

		const handleTouchEnd = (e: TouchEvent) => {
			const touch = e.changedTouches[0];
			const endX = touch.clientX;
			const endY = touch.clientY;
			const endTime = Date.now();

			const deltaX = endX - this.startX;
			const deltaY = endY - this.startY;
			const deltaTime = endTime - this.startTime;

			// Check if gesture meets time limit
			if (deltaTime > this.options.timeLimit) return;

			const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
			const velocity = distance / deltaTime;

			// Check if gesture meets distance OR velocity thresholds (more forgiving)
			// Lower both thresholds when user achieves one of them
			const meetsDistanceThreshold = distance >= this.options.threshold;
			const meetsVelocityThreshold = velocity >= this.options.velocity;
			
			// More responsive: allow smaller distance if velocity is good, or smaller velocity if distance is good
			const responsiveDistanceThreshold = meetsVelocityThreshold ? this.options.threshold * 0.6 : this.options.threshold;
			const responsiveVelocityThreshold = meetsDistanceThreshold ? this.options.velocity * 0.6 : this.options.velocity;
			
			const meetsAdjustedDistance = distance >= responsiveDistanceThreshold;
			const meetsAdjustedVelocity = velocity >= responsiveVelocityThreshold;
			
			if (!meetsAdjustedDistance && !meetsAdjustedVelocity) return;

			// If the gesture started on an interactive element, require more deliberate movement
			// to distinguish between taps and swipes
			if (this.isInteractiveTouch) {
				// For interactive elements, require either:
				// 1. Significant distance (at least 25px) OR
				// 2. Good velocity with some distance (at least 15px)
				const minDistanceForInteractive = 25;
				const minDistanceWithVelocity = 15;
				
				const hasSignificantDistance = distance >= minDistanceForInteractive;
				const hasGoodVelocityWithDistance = distance >= minDistanceWithVelocity && velocity >= this.options.velocity;
				
				if (!hasSignificantDistance && !hasGoodVelocityWithDistance) {
					return; // Likely a tap, not a swipe
				}
			}

			// Determine primary direction
			const absDeltaX = Math.abs(deltaX);
			const absDeltaY = Math.abs(deltaY);

			let direction: SwipeDirection;
			if (absDeltaX > absDeltaY) {
				direction = deltaX > 0 ? 'right' : 'left';
			} else {
				direction = deltaY > 0 ? 'down' : 'up';
			}

			const details: SwipeDetails = {
				deltaX,
				deltaY,
				distance,
				velocity,
				duration: deltaTime
			};

			// Stop momentum and prevent default for valid swipe gestures only if body isn't already locked
			const shouldLockScrolling = document.body.style.overflow !== 'hidden';
			
			if (shouldLockScrolling) {
				document.body.style.overflow = 'hidden';
				document.documentElement.style.overflow = 'hidden';
			}
			
			this.onSwipe(direction, details);
			
			// Restore scrolling after gesture is processed, but only if we locked it
			if (shouldLockScrolling) {
				setTimeout(() => {
					document.body.style.overflow = '';
					document.documentElement.style.overflow = '';
				}, 100);
			}
			
			// For interactive elements, only prevent default if this was clearly a swipe gesture
			// This allows button clicks to still work for small movements
			if (this.isInteractiveTouch) {
				// Only prevent if the movement was significant enough to be a clear swipe
				if (distance >= 20) {
					e.preventDefault();
					e.stopPropagation();
				}
			} else {
				// Always prevent for non-interactive areas
				e.preventDefault();
				e.stopPropagation();
			}
		};

		element.addEventListener('touchstart', handleTouchStart, { passive: false });
		element.addEventListener('touchend', handleTouchEnd, { passive: false });

		this.cleanupFn = () => {
			element.removeEventListener('touchstart', handleTouchStart);
			element.removeEventListener('touchend', handleTouchEnd);
			// Only restore overflow if it was set to 'hidden' - don't override other styles
			if (document.body.style.overflow === 'hidden') {
				document.body.style.overflow = '';
			}
			if (document.documentElement.style.overflow === 'hidden') {
				document.documentElement.style.overflow = '';
			}
		};
	}
}

export interface SwipeDetails {
	deltaX: number;
	deltaY: number;
	distance: number;
	velocity: number;
	duration: number;
}
