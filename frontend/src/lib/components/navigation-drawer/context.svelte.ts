import { getContext, setContext } from 'svelte';

export type NavigationDrawerStateProps = {};

class NavigationDrawerState {
	// Track the actual height of the navigation drawer
	#height = $state(0);
	
	constructor(props: NavigationDrawerStateProps) {
		// No props needed for now, but keeping the pattern for consistency
	}

	/**
	 * Get the current height of the navigation drawer
	 */
	get height() {
		return this.#height;
	}

	/**
	 * Set the height of the navigation drawer
	 * This is called by the toolbar component when its height changes
	 */
	setHeight = (height: number) => {
		this.#height = height;
	};

	/**
	 * Get the bottom padding that should be applied to content
	 * Combines safe area with the actual navigation height
	 */
	get contentBottomPadding() {
		// Use CSS max() to respect both safe area and navigation height
		const minHeight = Math.max(this.#height, 0);
		return `max(env(safe-area-inset-bottom), ${minHeight}px)`;
	}
}

const SYMBOL_KEY = 'scn-navigation-drawer';

/**
 * Instantiates a new `NavigationDrawerState` instance and sets it in the context.
 *
 * @param props The constructor props for the `NavigationDrawerState` class.
 * @returns The `NavigationDrawerState` instance.
 */
export function setNavigationDrawer(props: NavigationDrawerStateProps): NavigationDrawerState {
	return setContext(Symbol.for(SYMBOL_KEY), new NavigationDrawerState(props));
}

/**
 * Retrieves the `NavigationDrawerState` instance from the context. This is a class instance,
 * so you cannot destructure it.
 * @returns The `NavigationDrawerState` instance.
 */
export function useNavigationDrawer(): NavigationDrawerState {
	return getContext(Symbol.for(SYMBOL_KEY));
}
