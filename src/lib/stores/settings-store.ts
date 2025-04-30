import { writable } from 'svelte/store';
import type { Settings } from '$lib/types/settings.type';

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
		sessionTimeout: 60,
		passwordPolicy: 'medium',
		rbacEnabled: false
	}
});

// Function to update settings from server data
export function updateSettingsStore(serverData: Partial<Settings>) {
	settingsStore.update((current) => ({
		...current,
		...serverData
	}));
}

// Function to get current settings value
export function getSettings(): Settings {
	let currentSettings: Settings;
	const unsubscribe = settingsStore.subscribe((value) => {
		currentSettings = value;
	});
	unsubscribe();
	return currentSettings!;
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
