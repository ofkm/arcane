import { onMount } from 'svelte';

export type ScrollDirection = 'up' | 'down' | 'idle';

export class ScrollDirectionDetector {
	private lastScrollY = $state(0);
	private scrollDirection = $state<ScrollDirection>('idle');
	private isScrolling = $state(false);
	private scrollThreshold = 10; // Minimum pixels to trigger direction change
	private scrollTimeout: number | null = null;

	constructor(threshold = 10) {
		this.scrollThreshold = threshold;
		
		onMount(() => {
			this.lastScrollY = window.scrollY;
			
			const handleScroll = this.throttle(() => {
				const currentScrollY = window.scrollY;
				const scrollDiff = currentScrollY - this.lastScrollY;
				
				// Only update direction if scroll difference exceeds threshold
				if (Math.abs(scrollDiff) > this.scrollThreshold) {
					const newDirection = scrollDiff > 0 ? 'down' : 'up';
					
					// Only update if direction actually changed to avoid unnecessary re-renders
					if (this.scrollDirection !== newDirection) {
						this.scrollDirection = newDirection;
					}
					this.lastScrollY = currentScrollY;
				}
				
				this.isScrolling = true;
				
				// Clear existing timeout
				if (this.scrollTimeout) {
					clearTimeout(this.scrollTimeout);
				}
				
				// Set idle state after scrolling stops
				this.scrollTimeout = window.setTimeout(() => {
					if (this.scrollDirection !== 'idle') {
						this.scrollDirection = 'idle';
					}
					this.isScrolling = false;
				}, 150);
			}, 16); // ~60fps throttling
			
			window.addEventListener('scroll', handleScroll, { passive: true });
			
			return () => {
				window.removeEventListener('scroll', handleScroll);
				if (this.scrollTimeout) {
					clearTimeout(this.scrollTimeout);
				}
			};
		});
	}

	get direction() {
		return this.scrollDirection;
	}

	get scrolling() {
		return this.isScrolling;
	}

	get scrollY() {
		return this.lastScrollY;
	}

	private throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
		let inThrottle: boolean;
		return ((...args: any[]) => {
			if (!inThrottle) {
				func.apply(this, args);
				inThrottle = true;
				setTimeout(() => inThrottle = false, limit);
			}
		}) as T;
	}
}
