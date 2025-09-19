import { IsMobile } from '$lib/hooks/is-mobile.svelte.js';
import { IsTablet } from '$lib/hooks/is-tablet.svelte.js';
import { getContext, setContext } from 'svelte';
import { PersistedState } from 'runed';
import { SIDEBAR_KEYBOARD_SHORTCUT } from './constants.js';

type Getter<T> = () => T;

export type SidebarStateProps = {
	/**
	 * A getter function that returns the current open state of the sidebar.
	 * We use a getter function here to support `bind:open` on the `Sidebar.Provider`
	 * component.
	 */
	open: Getter<boolean>;

	/**
	 * A function that sets the open state of the sidebar. To support `bind:open`, we need
	 * a source of truth for changing the open state to ensure it will be synced throughout
	 * the sub-components and any `bind:` references.
	 */
	setOpen: (open: boolean) => void;
};

class SidebarState {
	readonly props: SidebarStateProps;
	open = $derived.by(() => this.props.open());
	openMobile = $state(false);
	setOpen: SidebarStateProps['setOpen'];
	#isMobile: IsMobile;
	#isTablet: IsTablet;
	#isPinnedState = new PersistedState('sidebar-pinned', true);
	#isHovered = $state(false);
	#hoverTimeout: ReturnType<typeof setTimeout> | null = null;
	state = $derived.by(() => (this.open ? 'expanded' : 'collapsed'));

	constructor(props: SidebarStateProps) {
		this.setOpen = props.setOpen;
		this.#isMobile = new IsMobile();
		this.#isTablet = new IsTablet();
		this.props = props;
		
		// Sync the open state based on pinning preference and screen size
		$effect(() => {
			// On tablet and mobile, always collapse regardless of pinning preference
			if (this.#isTablet.current || this.#isMobile.current) {
				if (this.open) {
					this.setOpen(false);
				}
			} else {
				// On desktop, respect the pinning preference
				if (this.open !== this.#isPinnedState.current) {
					this.setOpen(this.#isPinnedState.current);
				}
			}
		});
	}

	// Convenience getter for checking if the sidebar is mobile
	// without this, we would need to use `sidebar.isMobile.current` everywhere
	get isMobile() {
		return this.#isMobile.current;
	}

	// Convenience getter for checking if the screen is tablet size
	get isTablet() {
		return this.#isTablet.current;
	}

	// Getter for hover state
	get isHovered() {
		return this.#isHovered;
	}

	// Getter for pinning preference
	get isPinned() {
		return this.#isPinnedState.current;
	}

	// Derived state that shows if sidebar should be visually expanded (either open or hovered)
	get isExpanded() {
		// In desktop mode: expanded if open OR (collapsed AND hovered)
		// In tablet mode: expanded only when hovered (since it's always collapsed)
		if (this.#isTablet.current) {
			return this.#isHovered;
		}
		return this.open || (!this.open && this.#isHovered);
	}

	// Set hover state with optional delay for clearing
	setHovered = (value: boolean, delay = 0) => {
		// Clear any existing timeout
		if (this.#hoverTimeout !== null) {
			clearTimeout(this.#hoverTimeout);
			this.#hoverTimeout = null;
		}

		if (value) {
			// Immediately set hover to true
			this.#isHovered = true;
		} else if (delay > 0) {
			// Delay clearing hover state
			this.#hoverTimeout = setTimeout(() => {
				this.#isHovered = false;
				this.#hoverTimeout = null;
			}, delay);
		} else {
			// Immediately clear hover state
			this.#isHovered = false;
		}
	};

	// Event handler to apply to the `<svelte:window>`
	handleShortcutKeydown = (e: KeyboardEvent) => {
		if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			// Don't allow keyboard toggle in tablet mode
			if (!this.#isTablet.current) {
				this.toggle();
			}
		}
	};

	setOpenMobile = (value: boolean) => {
		this.openMobile = value;
	};

	toggle = () => {
		if (this.#isMobile.current) {
			return this.openMobile = !this.openMobile;
		} else if (this.#isTablet.current) {
			// In tablet mode, sidebar should stay collapsed - no toggle allowed
			return;
		} else {
			// On desktop, toggle the pinning preference
			this.#isPinnedState.current = !this.#isPinnedState.current;
			return this.setOpen(this.#isPinnedState.current);
		}
	};
}

const SYMBOL_KEY = 'scn-sidebar';

/**
 * Instantiates a new `SidebarState` instance and sets it in the context.
 *
 * @param props The constructor props for the `SidebarState` class.
 * @returns  The `SidebarState` instance.
 */
export function setSidebar(props: SidebarStateProps): SidebarState {
	return setContext(Symbol.for(SYMBOL_KEY), new SidebarState(props));
}

/**
 * Retrieves the `SidebarState` instance from the context. This is a class instance,
 * so you cannot destructure it.
 * @returns The `SidebarState` instance.
 */
export function useSidebar(): SidebarState {
	return getContext(Symbol.for(SYMBOL_KEY));
}

