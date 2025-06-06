import { browser } from '$app/environment';
import { loadSettingsFromServer } from './settings-store';
import { goto } from '$app/navigation';

let isInitialized = false;

export async function initializeClientStores() {
	if (!browser || isInitialized) {
		return;
	}

	try {
		// Load settings from server
		await loadSettingsFromServer();
		console.log('Settings store initialized successfully');
		isInitialized = true;
	} catch (error) {
		console.error('Failed to initialize client stores:', error);

		// If it's an authentication error, redirect to login
		if (error instanceof Error && error.message.includes('401')) {
			goto('/auth/login');
		}
	}
}

// Check authentication status
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

// Auto-initialize when this module is imported in the browser
if (browser) {
	initializeClientStores();
}
