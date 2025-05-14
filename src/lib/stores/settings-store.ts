import { writable, get as getStore } from 'svelte/store';
import type { Settings } from '$lib/types/settings.type';

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
		oidcEnabled: false,
		sessionTimeout: 30,
		passwordPolicy: 'strong',
		rbacEnabled: false
	},
	maturityThresholdDays: 30
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
			}
		};
	});
}

export function getSettings(): Settings {
	return getStore(settingsStore);
}

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
