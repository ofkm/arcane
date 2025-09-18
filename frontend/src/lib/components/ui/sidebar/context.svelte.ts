import { IsMobile } from '$lib/hooks/is-mobile.svelte.js';
import { IsTablet } from '$lib/hooks/is-tablet.svelte.js';
import { getContext, setContext } from 'svelte';
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
	#userHasManuallySet = $state(false);
	#lastScreenSize = $state<'mobile' | 'tablet' | 'desktop'>('desktop');
	state = $derived.by(() => (this.open ? 'expanded' : 'collapsed'));

	constructor(props: SidebarStateProps) {
		this.setOpen = props.setOpen;
		this.#isMobile = new IsMobile();
		this.#isTablet = new IsTablet();
		this.props = props;
		
		// Track screen size changes and auto-adjust only on breakpoint transitions
		$effect(() => {
			const currentScreenSize = this.#isMobile.current ? 'mobile' : 
									  this.#isTablet.current ? 'tablet' : 'desktop';
			
			if (currentScreenSize !== this.#lastScreenSize) {
				// Always force collapse in tablet mode, regardless of manual settings
				if (currentScreenSize === 'tablet' && this.open) {
					this.setOpen(false);
				}
				// Only auto-expand on desktop if user hasn't manually set state
				else if (currentScreenSize === 'desktop' && !this.open && !this.#userHasManuallySet) {
					this.setOpen(true);
				}
			}
			
			// Reset manual flag when crossing to/from mobile (different behavior)
			if ((this.#lastScreenSize === 'mobile') !== (currentScreenSize === 'mobile')) {
				this.#userHasManuallySet = false;
			}
			
			this.#lastScreenSize = currentScreenSize;
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
			// Mark that user has manually interacted with sidebar
			this.#userHasManuallySet = true;
			return this.setOpen(!this.open);
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
