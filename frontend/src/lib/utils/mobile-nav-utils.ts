import { PersistedState } from 'runed';
import { defaultMobileNavPreferences, type MobileNavPreferences } from '$lib/config/mobile-navigation-config';
import settingsStore from '$lib/stores/config-store';
import { get } from 'svelte/store';

// Persistent storage for pinned navigation items
export const pinnedItemsStore = new PersistedState('mobile-nav-preferences', defaultMobileNavPreferences);

// Function to get effective navigation settings (server + overrides)
export function getEffectiveNavigationSettings() {
	const serverSettings = get(settingsStore);
	
	// Read navigation overrides from localStorage
	let overrides = {
		mode: undefined,
		showLabels: undefined,
		scrollToHide: undefined,
		tapToHide: undefined
	};
	
	try {
		const stored = localStorage.getItem('navigation-settings-overrides');
		if (stored) {
			overrides = { ...overrides, ...JSON.parse(stored) };
		}
	} catch (error) {
		console.warn('Failed to read navigation overrides:', error);
	}

	// Function to get effective value (override takes precedence over server setting)
	const getEffectiveValue = (serverValue: any, overrideValue: any, defaultValue: any) => {
		return overrideValue !== undefined ? overrideValue : (serverValue ?? defaultValue);
	};

	return {
		mode: getEffectiveValue(serverSettings?.mobileNavigationMode, overrides.mode, 'floating'),
		showLabels: getEffectiveValue(serverSettings?.mobileNavigationShowLabels, overrides.showLabels, true),
		scrollToHide: getEffectiveValue(serverSettings?.mobileNavigationScrollToHide, overrides.scrollToHide, true),
		tapToHide: getEffectiveValue(serverSettings?.mobileNavigationTapToHide, overrides.tapToHide, false)
	};
}
