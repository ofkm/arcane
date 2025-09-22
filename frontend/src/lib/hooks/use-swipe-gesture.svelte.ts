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
			threshold: options.threshold ?? 50,
			velocity: options.velocity ?? 0.3,
			timeLimit: options.timeLimit ?? 500
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
			// Don't process swipe if touch started on interactive element
			if (this.isInteractiveTouch) {
				return;
			}

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

			// Check if gesture meets distance and velocity thresholds
			if (distance < this.options.threshold || velocity < this.options.velocity) return;

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

			// Stop momentum and prevent default for valid swipe gestures
			document.body.style.overflow = 'hidden';
			document.documentElement.style.overflow = 'hidden';
			
			this.onSwipe(direction, details);
			
			// Restore scrolling after gesture is processed
			setTimeout(() => {
				document.body.style.overflow = '';
				document.documentElement.style.overflow = '';
			}, 100);
			
			// Prevent default for valid gestures
			e.preventDefault();
			e.stopPropagation();
		};

		element.addEventListener('touchstart', handleTouchStart, { passive: false });
		element.addEventListener('touchend', handleTouchEnd, { passive: false });

		this.cleanupFn = () => {
			element.removeEventListener('touchstart', handleTouchStart);
			element.removeEventListener('touchend', handleTouchEnd);
			// Ensure overflow is restored when cleanup runs
			document.body.style.overflow = '';
			document.documentElement.style.overflow = '';
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
