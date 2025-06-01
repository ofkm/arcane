import type { Settings } from '$lib/types/settings.type';
import { databaseSettingsService } from './database-settings-service';

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
