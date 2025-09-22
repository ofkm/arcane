import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

// Interface for navigation settings that can be overridden locally
export interface NavigationSettings {
	mode?: 'floating' | 'docked';
	showLabels?: boolean;
	scrollToHide?: boolean;
	tapToHide?: boolean;
}

// Interface for the complete persisted navigation state
export interface PersistedNavigationState {
	overrides: NavigationSettings;
	lastUpdated: number;
}

// Default state
const defaultState: PersistedNavigationState = {
	overrides: {},
	lastUpdated: Date.now()
};

/**
 * Creates a persisted store that can override server settings with local values
 */
function createPersistedNavigationStore() {
	// Initialize with default state
	let initialState = defaultState;

	// Try to load from localStorage if available
	if (typeof localStorage !== 'undefined') {
		try {
			const stored = localStorage.getItem('navigation-settings-overrides');
			if (stored) {
				const parsed = JSON.parse(stored) as PersistedNavigationState;
				initialState = parsed;
			}
		} catch (error) {
			console.warn('Failed to load persisted navigation settings:', error);
		}
	}

	const { subscribe, set, update } = writable<PersistedNavigationState>(initialState);

	return {
		subscribe,
		
		/**
		 * Set an override for a specific navigation setting
		 */
		setOverride: (key: keyof NavigationSettings, value: boolean | undefined) => {
			update(state => {
				const newState = {
					...state,
					overrides: {
						...state.overrides,
						[key]: value
					},
					lastUpdated: Date.now()
				};

				// Remove undefined values to keep storage clean
				if (value === undefined) {
					delete newState.overrides[key];
				}

				// Persist to localStorage
				if (typeof localStorage !== 'undefined') {
					try {
						localStorage.setItem('navigation-settings-overrides', JSON.stringify(newState));
					} catch (error) {
						console.warn('Failed to save navigation settings override:', error);
					}
				}

				return newState;
			});
		},

		/**
		 * Clear all overrides
		 */
		clearOverrides: () => {
			const newState = {
				overrides: {},
				lastUpdated: Date.now()
			};

			set(newState);

			// Clear from localStorage
			if (typeof localStorage !== 'undefined') {
				try {
					localStorage.removeItem('navigation-settings-overrides');
				} catch (error) {
					console.warn('Failed to clear navigation settings overrides:', error);
				}
			}
		},

		/**
		 * Check if a setting has a local override
		 */
		hasOverride: (key: keyof NavigationSettings): boolean => {
			let hasOverride = false;
			subscribe(state => {
				hasOverride = key in state.overrides;
			})();
			return hasOverride;
		}
	};
}

export const persistedNavigationStore = createPersistedNavigationStore();

/**
 * Utility function to get the effective value for a navigation setting
 * Combines server settings with local overrides
 */
export function getEffectiveNavigationSetting(
	serverSettings: { [key: string]: any },
	overrides: NavigationSettings,
	key: keyof NavigationSettings
): any {
	// Map internal keys to server setting keys
	const serverKeyMap = {
		mode: 'mobileNavigationMode',
		showLabels: 'mobileNavigationShowLabels',
		scrollToHide: 'mobileNavigationScrollToHide',
		tapToHide: 'mobileNavigationTapToHide'
	};

	const serverKey = serverKeyMap[key];

	// Return override if available, otherwise use server setting
	if (key in overrides && overrides[key] !== undefined) {
		return overrides[key]!;
	}

	// Provide appropriate defaults based on key
	if (key === 'mode') {
		return serverSettings[serverKey] ?? 'floating';
	}
	if (key === 'tapToHide') {
		return serverSettings[serverKey] ?? false;
	}
	return serverSettings[serverKey] ?? true; // Default to true for showLabels and scrollToHide
}

/**
 * Creates a derived store that combines server settings with local overrides
 */
export function createEffectiveNavigationSettings(serverSettingsStore: Writable<any>) {
	return writable(
		{
			mode: 'floating',
			showLabels: true,
			scrollToHide: true,
			tapToHide: false
		},
		(set) => {
			const unsubscribeServer = serverSettingsStore.subscribe(serverSettings => {
				const unsubscribePersisted = persistedNavigationStore.subscribe(persistedState => {
					set({
						mode: getEffectiveNavigationSetting(serverSettings, persistedState.overrides, 'mode'),
						showLabels: getEffectiveNavigationSetting(serverSettings, persistedState.overrides, 'showLabels'),
						scrollToHide: getEffectiveNavigationSetting(serverSettings, persistedState.overrides, 'scrollToHide'),
						tapToHide: getEffectiveNavigationSetting(serverSettings, persistedState.overrides, 'tapToHide')
					});
				});

				return unsubscribePersisted;
			});

			return unsubscribeServer;
		}
	);
}
