import type { Settings } from '$lib/types/settings.type';

/**
 * Regular setting - applies changes only on save
 */
export interface RegularSetting {
	/** The key in the Settings object */
	key: keyof Settings;
}

/**
 * Preview setting - applies changes immediately but doesn't persist until save
 */
export interface PreviewSetting<T = any> {
	/** The key in the Settings object */
	key: keyof Settings;
	/** Custom preview function to apply the setting immediately */
	previewFn: (value: T) => void;
	/** Optional custom reset function to revert the preview */
	resetPreviewFn?: (value: T) => void;
}

/**
 * Union type for all setting definitions
 */
export type SettingDefinition<T = any> = RegularSetting | PreviewSetting<T>;
