import { onMount } from 'svelte';

export class TapOutsideDetector {
	private callback: () => void;
	private targetElement = $state<HTMLElement | null>(null);
	private touchStartTime = 0;
	private touchStartPosition = { x: 0, y: 0 };

	constructor(callback: () => void) {
		this.callback = callback;

		onMount(() => {
			const handleInteraction = (event: MouseEvent | TouchEvent) => {
				// Only trigger on non-interactive elements
				const target = event.target as HTMLElement;

				// Check if the interaction is on an interactive element
				const isInteractive = this.isInteractiveElement(target);

				// If no target element has been set yet, don't treat interactions
				// as taps outside — short-circuit to avoid spurious closes.
				if (!this.targetElement) return;

				// Compute styles once for the target element and check visibility.
				const navStyle = window.getComputedStyle(this.targetElement);
				const isVisibleNavElement =
					this.targetElement.contains(target) &&
					navStyle.visibility !== 'hidden' &&
					navStyle.opacity !== '0' &&
					navStyle.display !== 'none' &&
					navStyle.pointerEvents !== 'none';

				// Interaction is outside only when the nav exists and the event target
				// is not within the visible nav element.
				const isOutsideNav = !isVisibleNavElement;

				// Only call the callback when the element exists, the interaction is
				// outside the visible nav, and the target is not an interactive element.
				if (!isInteractive && isOutsideNav && this.targetElement) {
					this.callback();
				}
			};

			const handleTouchStart = (event: TouchEvent) => {
				const touch = event.touches[0];
				this.touchStartTime = Date.now();
				this.touchStartPosition = { x: touch.clientX, y: touch.clientY };
			};

			const handleTouchEnd = (event: TouchEvent) => {
				const touch = event.changedTouches[0];
				const endTime = Date.now();
				const endPosition = { x: touch.clientX, y: touch.clientY };

				// Calculate distance moved and time elapsed
				const distance = Math.sqrt(
					Math.pow(endPosition.x - this.touchStartPosition.x, 2) + Math.pow(endPosition.y - this.touchStartPosition.y, 2)
				);
				const duration = endTime - this.touchStartTime;

				// Only trigger if it's a tap (short duration, minimal movement)
				// This prevents triggering on swipes, scrolls, or long presses
				if (duration < 300 && distance < 10) {
					const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;

					if (target) {
						// Create a synthetic event for consistency
						const syntheticEvent = { target } as unknown as TouchEvent;
						handleInteraction(syntheticEvent);
					}
				}
			};

			// Use capture phase to catch events before they reach other elements
			// But use bubble phase for touchend to avoid conflicts with navigation bar
			document.addEventListener('click', handleInteraction, true);
			document.addEventListener('touchstart', handleTouchStart, true);
			document.addEventListener('touchend', handleTouchEnd, false);

			return () => {
				document.removeEventListener('click', handleInteraction, true);
				document.removeEventListener('touchstart', handleTouchStart, true);
				document.removeEventListener('touchend', handleTouchEnd, false);
			};
		});
	}

	setTargetElement(element: HTMLElement | null) {
		this.targetElement = element;
	}

	private isInteractiveElement(element: HTMLElement): boolean {
		// Check if element or any parent is interactive
		let current: HTMLElement | null = element;

		while (current) {
			const tagName = current.tagName.toLowerCase();
			const role = current.getAttribute('role');

			// Interactive elements
			if (['a', 'button', 'input', 'select', 'textarea'].includes(tagName)) {
				return true;
			}

			// Elements with interactive roles
			if (role && ['button', 'link', 'menuitem', 'option', 'tab'].includes(role)) {
				return true;
			}

			// Elements with click handlers (heuristic)
			if (current.onclick || current.style.cursor === 'pointer') {
				return true;
			}

			// Elements with data attributes suggesting interactivity
			if (current.hasAttribute('data-testid') && current.getAttribute('data-testid')?.includes('button')) {
				return true;
			}

			current = current.parentElement;
		}

		return false;
	}
}
