import type { NavigationItem } from './navigation-config';
import { navigationItems } from './navigation-config';

// Default pinned items for mobile navigation
export const defaultMobilePinnedItems: NavigationItem[] = [
	navigationItems.managementItems[0], // Dashboard
	navigationItems.managementItems[1], // Containers
	navigationItems.managementItems[3], // Images
	navigationItems.managementItems[5]  // Volumes
];

// Get all available navigation items for mobile (excluding nested items)
export function getAvailableMobileNavItems(): NavigationItem[] {
	const flatItems: NavigationItem[] = [];
	
	// Add all management items
	flatItems.push(...navigationItems.managementItems);
	
	// Add customization items
	flatItems.push(...navigationItems.customizationItems);
	
	// Add environment items (admin only, will be filtered at component level)
	if (navigationItems.environmentItems) {
		flatItems.push(...navigationItems.environmentItems);
	}
	
	// Add top-level settings items (exclude nested items)
	if (navigationItems.settingsItems) {
		const settingsTopLevel = navigationItems.settingsItems.filter(item => !item.items);
		flatItems.push(...settingsTopLevel);
	}
	
	return flatItems;
}

// Mobile navigation preferences type
export type MobileNavPreferences = {
	pinnedItems: string[]; // Array of URLs
	lastUpdated: number;
};

// Navigation mode type
export type NavigationMode = 'floating' | 'docked';

// Navigation appearance settings type
export type NavigationAppearanceSettings = {
	mode: NavigationMode;
	showLabels: boolean;
};

// Navigation behavior settings type  
export type NavigationBehaviorSettings = {
	scrollToHide: boolean;
	tapToHide: boolean;
};

// Combined navigation settings
export type NavigationSettings = NavigationAppearanceSettings & NavigationBehaviorSettings;

// Default preferences
export const defaultMobileNavPreferences: MobileNavPreferences = {
	pinnedItems: defaultMobilePinnedItems.map(item => item.url),
	lastUpdated: Date.now()
};

// Default navigation appearance settings
export const defaultNavigationAppearanceSettings: NavigationAppearanceSettings = {
	mode: 'floating',
	showLabels: true
};

// Default navigation behavior settings
export const defaultNavigationBehaviorSettings: NavigationBehaviorSettings = {
	scrollToHide: true,
	tapToHide: false
};

// Combined default navigation settings
export const defaultNavigationSettings: NavigationSettings = {
	...defaultNavigationAppearanceSettings,
	...defaultNavigationBehaviorSettings
};
