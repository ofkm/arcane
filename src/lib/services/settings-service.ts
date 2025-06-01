import type { Settings } from '$lib/types/settings.type';
import { databaseSettingsService } from '$lib/services/database/database-settings-service';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const isDev = process.env.NODE_ENV === 'development';

export const DEFAULT_SETTINGS: Settings = {
	dockerHost: isDev ? (process.platform === 'win32' ? 'npipe:////./pipe/docker_engine' : 'unix:///var/run/docker.sock') : 'unix:///var/run/docker.sock',
	autoUpdate: false,
	autoUpdateInterval: 5,
	pollingEnabled: true,
	pollingInterval: 10,
	pruneMode: 'all',
	stacksDirectory: './data/stacks',
	registryCredentials: [],
	templateRegistries: [],
	auth: {
		localAuthEnabled: true,
		oidcEnabled: false,
		sessionTimeout: 60,
		passwordPolicy: 'strong',
		rbacEnabled: false
	},
	maturityThresholdDays: 30
};

export async function getSettings(): Promise<Settings> {
	const settings = await databaseSettingsService.getSettings();
	return settings || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
	await databaseSettingsService.saveSettings(settings);
}
