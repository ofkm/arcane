import { writable } from 'svelte/store';
import type { NavigationItem } from '$lib/config/navigation-config';
import { 
	defaultMobilePinnedItems, 
	getAvailableMobileNavItems,
	defaultMobileNavPreferences,
	defaultNavigationBehaviorSettings,
	type MobileNavPreferences,
	type NavigationBehaviorSettings
} from '$lib/config/mobile-navigation-config';
import { createEffectiveNavigationSettings } from '$lib/utils/persisted-state';
import settingsStore from '$lib/stores/config-store';

// Store for mobile navigation state
function createMobileNavStore() {
	const { subscribe, set, update } = writable({
		pinnedItems: defaultMobilePinnedItems,
		visible: true,
		menuOpen: false,
		preferences: defaultMobileNavPreferences,
		behaviorSettings: defaultNavigationBehaviorSettings
	});

	return {
		subscribe,
		setPinnedItems: (items: NavigationItem[]) => update(state => ({ 
			...state, 
			pinnedItems: items 
		})),
		setVisibility: (visible: boolean) => update(state => ({ 
			...state, 
			visible 
		})),
		toggleMenu: () => update(state => ({ 
			...state, 
			menuOpen: !state.menuOpen 
		})),
		setMenuOpen: (open: boolean) => update(state => ({ 
			...state, 
			menuOpen: open 
		})),
		setBehaviorSettings: (settings: NavigationBehaviorSettings) => update(state => ({
			...state,
			behaviorSettings: settings
		})),
		loadPreferences: () => {
			try {
				const stored = localStorage.getItem('mobile-nav-preferences');
				if (stored) {
					const preferences: MobileNavPreferences = JSON.parse(stored);
					const availableItems = getAvailableMobileNavItems();
					
					// Map URLs back to NavigationItems
					const pinnedItems = preferences.pinnedItems
						.map(url => availableItems.find(item => item.url === url))
						.filter((item): item is NavigationItem => item !== undefined);
					
					update(state => ({
						...state,
						pinnedItems: pinnedItems.length > 0 ? pinnedItems : defaultMobilePinnedItems,
						preferences
					}));
				}
			} catch (error) {
				console.warn('Failed to load mobile navigation preferences:', error);
			}
		},
		savePreferences: (pinnedItems: NavigationItem[]) => {
			// Avoid unnecessary saves if items haven't changed
			let shouldSave = false;
			
			update(state => {
				const currentUrls = state.pinnedItems.map(item => item.url);
				const newUrls = pinnedItems.map(item => item.url);
				
				// Check if the order or items have actually changed
				shouldSave = currentUrls.length !== newUrls.length || 
							 currentUrls.some((url, index) => url !== newUrls[index]);
				
				if (!shouldSave) return state;
				
				const preferences: MobileNavPreferences = {
					pinnedItems: newUrls,
					lastUpdated: Date.now()
				};
				
				try {
					localStorage.setItem('mobile-nav-preferences', JSON.stringify(preferences));
				} catch (error) {
					console.warn('Failed to save mobile navigation preferences:', error);
				}
				
				return { 
					...state, 
					preferences,
					pinnedItems 
				};
			});
		},
		initializeEffectiveSettings: () => {
			// Create effective settings that combine server settings with local overrides
			const effectiveSettings = createEffectiveNavigationSettings(settingsStore);
			
			// Subscribe to changes and update the mobile nav store
			effectiveSettings.subscribe(settings => {
				update(state => ({
					...state,
					behaviorSettings: settings
				}));
			});
		}
	};
}

export const mobileNavStore = createMobileNavStore();
