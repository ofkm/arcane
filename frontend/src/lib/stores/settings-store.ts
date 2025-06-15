import { writable, get as getStore } from 'svelte/store';
import type { Settings } from '$lib/types/settings.type';
import { settingsAPI } from '$lib/services/api';

function deepClone<T>(obj: T): T {
	if (obj === null || typeof obj !== 'object') {
		return obj;
	}

	if (obj instanceof Date) {
		return new Date(obj.getTime()) as unknown as T;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => deepClone(item)) as unknown as T;
	}

	const clonedObj = {} as T;
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			clonedObj[key] = deepClone(obj[key]);
		}
	}

	return clonedObj;
}

// Initialize with proper defaults that match the backend structure
export const settingsStore = writable<Settings>({
	stacksDirectory: 'data/stacks',
	autoUpdate: false,
	autoUpdateInterval: 60,
	pollingEnabled: false,
	pollingInterval: 10,
	pruneMode: 'all',
	registryCredentials: [],
	templateRegistries: [],
	auth: {
		localAuthEnabled: true,
		oidcEnabled: false,
		sessionTimeout: 30,
		passwordPolicy: 'strong',
		rbacEnabled: false
	},
	maturityThresholdDays: 30,
	onboarding: {
		completed: false,
		completedAt: '',
		steps: {
			welcome: false,
			password: false,
			settings: false
		}
	}
});

export function updateSettingsStore(serverData: Partial<Settings>) {
	const dataToUpdate = deepClone(serverData);

	settingsStore.update((current) => {
		return {
			...current,
			...dataToUpdate,
			auth: {
				...(current.auth || {}),
				...(dataToUpdate.auth || {})
			},
			onboarding: {
				...(current.onboarding || {}),
				...(dataToUpdate.onboarding || {}),
				steps: {
					...(current.onboarding?.steps || {}),
					...(dataToUpdate.onboarding?.steps || {})
				}
			}
		} as Settings;
	});
}

export function getSettings(): Settings {
	return getStore(settingsStore);
}

export async function saveSettingsToServer(): Promise<Settings> {
	try {
		const settings = getSettings();
		console.log('Settings store - attempting to save:', settings);

		const updatedSettings = await settingsAPI.updateSettings(settings);
		console.log('Settings store - received from server:', updatedSettings);

		// For now, just update the store directly without cleaning
		updateSettingsStore(updatedSettings);

		return updatedSettings;
	} catch (error) {
		console.error('Settings store - failed to save:', error);
		throw error;
	}
}

export async function loadSettingsFromServer(): Promise<Settings> {
	try {
		console.log('Settings store - loading from server...');
		const settings = await settingsAPI.getSettings();
		console.log('Settings store - loaded from server:', settings);

		settingsStore.set(settings);
		return settings;
	} catch (error) {
		console.error('Settings store - failed to load:', error);
		throw error;
	}
}

export async function resetSettingsOnServer(): Promise<Settings> {
	try {
		const settings = await settingsAPI.resetSettings();
		settingsStore.set(settings);
		return settings;
	} catch (error) {
		console.error('Failed to reset settings:', error);
		throw error;
	}
}

export function initializeSettingsStore() {
	updateSettingsStore({
		onboarding: {
			completed: false,
			completedAt: '',
			steps: {
				welcome: false,
				password: false,
				settings: false
			}
		}
	});
}
