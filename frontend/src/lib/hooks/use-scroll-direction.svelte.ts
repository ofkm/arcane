import { untrack } from 'svelte';

export type ScrollDirection = 'up' | 'down' | 'idle';

export class ScrollDirectionDetector {
	private _lastScrollY = $state(0);
	private _scrollDirection = $state<ScrollDirection>('idle');
	private _isScrolling = $state(false);
	private scrollThreshold = 10; // Minimum pixels to trigger direction change
	private scrollTimeout: ReturnType<typeof setTimeout> | null = null;
	private cleanupFn: (() => void) | null = null;

	constructor(threshold = 10) {
		this.scrollThreshold = threshold;

		// Initialize immediately, not in onMount
		this._lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;

		if (typeof window !== 'undefined') {
			const handleScroll = () => {
				const currentScrollY = window.scrollY;
				const scrollDiff = currentScrollY - untrack(() => this._lastScrollY);

				// Only update direction if scroll difference exceeds threshold
				if (Math.abs(scrollDiff) > this.scrollThreshold) {
					const newDirection: ScrollDirection = scrollDiff > 0 ? 'down' : 'up';

					// Only update if direction actually changed to avoid unnecessary re-renders
					if (untrack(() => this._scrollDirection) !== newDirection) {
						this._scrollDirection = newDirection;
					}
					this._lastScrollY = currentScrollY;
				}

				this._isScrolling = true;

				// Clear existing timeout
				if (this.scrollTimeout) {
					clearTimeout(this.scrollTimeout);
				}

				// Set idle state after scrolling stops
				this.scrollTimeout = setTimeout(() => {
					this._scrollDirection = 'idle';
					this._isScrolling = false;
				}, 150);
			};

			window.addEventListener('scroll', handleScroll, { passive: true });

			this.cleanupFn = () => {
				window.removeEventListener('scroll', handleScroll);
				if (this.scrollTimeout) {
					clearTimeout(this.scrollTimeout);
				}
			};
		}
	}

	cleanup() {
		if (this.cleanupFn) {
			this.cleanupFn();
			this.cleanupFn = null;
		}
	}

	get direction() {
		return this._scrollDirection;
	}

	get scrolling() {
		return this._isScrolling;
	}

	get scrollY() {
		return this._lastScrollY;
	}
}
