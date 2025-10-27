import { SwipeGestureDetector, type SwipeDirection } from '$lib/hooks/use-swipe-gesture.svelte';

export interface GestureHandlers {
	onMenuOpen: () => void;
}

export interface GestureOptions {
	menuOpen: boolean;
}

export class MobileNavGestures {
	private swipeDetector: SwipeGestureDetector;
	private lastWheelTime = $state(0);
	private flickDetectTimeout: ReturnType<typeof setTimeout> | null = null;
	private readonly flickVelocityThreshold = 3;

	private navElement: HTMLElement | null = null;
	private handlers: GestureHandlers;
	private options: GestureOptions;

	constructor(handlers: GestureHandlers, options: GestureOptions) {
		this.handlers = handlers;
		this.options = options;

		this.swipeDetector = new SwipeGestureDetector(
			(direction: SwipeDirection) => {
				if (direction === 'up') {
					this.handlers.onMenuOpen();
				}
			},
			{
				threshold: 20,
				velocity: 0.1,
				timeLimit: 1000
			}
		);
	}

	setElement(element: HTMLElement | null) {
		this.navElement = element;
		this.swipeDetector.setElement(element);
	}

	private handleWheel = (e: WheelEvent) => {
		e.preventDefault();
		if (this.options.menuOpen || e.deltaY <= 0) return;

		const now = Date.now();
		const velocity = e.deltaY / Math.max(1, now - this.lastWheelTime);

		if (velocity > this.flickVelocityThreshold) {
			this.handlers.onMenuOpen();
			return;
		}

		this.lastWheelTime = now;

		if (this.flickDetectTimeout) clearTimeout(this.flickDetectTimeout);
		this.flickDetectTimeout = setTimeout(() => {
			this.lastWheelTime = 0;
		}, 200);
	};

	enableWheelGestures() {
		if (!this.navElement || typeof window === 'undefined') return () => {};

		this.navElement.addEventListener('wheel', this.handleWheel, { passive: false });

		return () => {
			if (this.navElement) {
				this.navElement.removeEventListener('wheel', this.handleWheel);
			}
			if (this.flickDetectTimeout) {
				clearTimeout(this.flickDetectTimeout);
			}
		};
	}

	updateOptions(options: GestureOptions) {
		this.options = options;
	}

	destroy() {
		this.swipeDetector.setElement(null);
		if (this.flickDetectTimeout) {
			clearTimeout(this.flickDetectTimeout);
		}
	}
}
