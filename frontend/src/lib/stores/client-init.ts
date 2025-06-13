import { browser } from '$app/environment';
import settingsStore from './config-store';
import { goto } from '$app/navigation';
import { settingsAPI } from '$lib/services/api';

let isInitialized = false;

export async function initializeClientStores() {
	if (!browser || isInitialized) {
		return;
	}

	try {
		const settings = await settingsAPI.getSettings();
		settingsStore.set(settings);
		console.log('Settings store initialized successfully');
		isInitialized = true;
	} catch (error) {
		console.error('Failed to initialize client stores:', error);

		if (error instanceof Error && error.message.includes('401')) {
			goto('/auth/login');
		}
	}
}

export async function checkAuthStatus(): Promise<boolean> {
	if (!browser) {
		return false;
	}

	try {
		const response = await fetch('/api/auth/me', {
			credentials: 'include'
		});

		return response.ok;
	} catch (error) {
		console.error('Authentication check failed:', error);
		return false;
	}
}

if (browser) {
	initializeClientStores();
}
