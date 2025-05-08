import { writable, get as getStore } from 'svelte/store';
import type { Settings } from '$lib/types/settings.type';

// Deep clone utility function that properly handles various data types
function deepClone<T>(obj: T): T {
	if (obj === null || typeof obj !== 'object') {
		return obj;
	}

	// Handle Date objects
	if (obj instanceof Date) {
		return new Date(obj.getTime()) as unknown as T;
	}

	// Handle arrays
	if (Array.isArray(obj)) {
		return obj.map((item) => deepClone(item)) as unknown as T;
	}

	// Handle objects
	const clonedObj = {} as T;
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			clonedObj[key] = deepClone(obj[key]);
		}
	}

	return clonedObj;
}

// Initialize with default values
export const settingsStore = writable<Settings>({
	dockerHost: '',
	stacksDirectory: '',
	autoUpdate: false,
	autoUpdateInterval: 60,
	pollingEnabled: false,
	pollingInterval: 10,
	pruneMode: 'all',
	registryCredentials: [],
	auth: {
		localAuthEnabled: true,
		sessionTimeout: 30,
		passwordPolicy: 'strong',
		rbacEnabled: false
	}
});

// Function to update settings from server data
export function updateSettingsStore(serverData: Partial<Settings>) {
	// Create a deep clone to prevent direct references
	const dataToUpdate = deepClone(serverData);

	settingsStore.update((current) => {
		// Merge settings carefully
		return {
			...current,
			...dataToUpdate,
			// Handle nested objects like auth
			auth: {
				...(current.auth || {}),
				...(dataToUpdate.auth || {})
			}
		};
	});
}

export function getSettings(): Settings {
	return getStore(settingsStore);
}

// Helper to save settings to the server
export async function saveSettingsToServer(): Promise<boolean> {
	try {
		const settings = getSettings();

		const response = await fetch('/api/settings', {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(settings)
		});

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error || `HTTP error! status: ${response.status}`);
		}

		return true;
	} catch (error) {
		console.error('Failed to save settings:', error);
		throw error;
	}
}

// Add this initialization if not already present
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
