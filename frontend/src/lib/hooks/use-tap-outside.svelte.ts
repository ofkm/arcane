import { onMount } from 'svelte';

export class TapOutsideDetector {
	private callback: () => void;
	private targetElement = $state<HTMLElement | null>(null);

	constructor(callback: () => void) {
		this.callback = callback;
		
		onMount(() => {
			const handleClick = (event: MouseEvent) => {
				// Only trigger on non-interactive elements
				const target = event.target as HTMLElement;
				
				// Check if the click is on an interactive element
				const isInteractive = this.isInteractiveElement(target);
				
				// Check if click is outside the floating nav
				const isOutsideNav = this.targetElement ? 
					!this.targetElement.contains(target) : true;
				
				if (!isInteractive && isOutsideNav) {
					this.callback();
				}
			};
			
			// Use capture phase to catch events before they reach interactive elements
			document.addEventListener('click', handleClick, true);
			
			return () => {
				document.removeEventListener('click', handleClick, true);
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
			if (current.hasAttribute('data-testid') && 
				current.getAttribute('data-testid')?.includes('button')) {
				return true;
			}
			
			current = current.parentElement;
		}
		
		return false;
	}
}
