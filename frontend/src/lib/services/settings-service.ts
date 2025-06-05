import { settingsAPI } from './api';
import type { Settings } from '$lib/types/settings.type';

// Simple wrapper around the API service for backward compatibility
export async function getSettings(): Promise<Settings> {
	return await settingsAPI.getSettings();
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
	return await settingsAPI.updateSettings(settings);
}

export async function resetSettings(): Promise<Settings> {
	return await settingsAPI.resetSettings();
}

// OIDC specific functions
export async function getOidcConfig() {
	return await settingsAPI.getOidcConfig();
}

export async function updateOidcConfig(config: any) {
	return await settingsAPI.updateOidcConfig(config);
}

export async function getOidcStatus() {
	return await settingsAPI.getOidcStatus();
}

export async function testOidcConfig() {
	return await settingsAPI.testOidcConfig();
}

export async function getOidcAuthUrl(redirectUri: string) {
	return await settingsAPI.getOidcAuthUrl(redirectUri);
}

// Utility functions that might be needed
export function ensureStacksDirectory(): Promise<void> {
	// This would typically be handled by the backend
	return Promise.resolve();
}

export function getBasePath(): string {
	if (typeof window !== 'undefined') {
		return window.location.origin;
	}
	return process.env.BASE_URL || 'http://localhost:5173';
}

// Default settings for fallback - fixed to match Onboarding interface
export const DEFAULT_SETTINGS: Partial<Settings> = {
	onboarding: {
		completed: false,
		steps: {
			welcome: false,
			password: false,
			settings: false
		}
	},
	auth: {
		localAuthEnabled: true,
		oidcEnabled: false,
		sessionTimeout: 1440, // 24 hours in minutes
		passwordPolicy: 'basic',
		rbacEnabled: false
	},
	dockerHost: 'unix:///var/run/docker.sock',
	stacksDirectory: '/data/stacks',
	autoUpdate: false,
	autoUpdateInterval: 24,
	pollingEnabled: true,
	pollingInterval: 30,
	pruneMode: undefined,
	registryCredentials: [],
	templateRegistries: [],
	maturityThresholdDays: 30
};
