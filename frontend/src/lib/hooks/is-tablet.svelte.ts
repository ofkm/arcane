import { MediaQuery } from 'svelte/reactivity';

// Breakpoint for tablet/small desktop where sidebar should auto-collapse
const TABLET_BREAKPOINT = 1024;

export class IsTablet extends MediaQuery {
	constructor() {
		super(`max-width: ${TABLET_BREAKPOINT - 1}px`);
	}
}
