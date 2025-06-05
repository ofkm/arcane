import type { PageLoad } from './$types';
import { settingsAPI } from '$lib/services/api';

export const load: PageLoad = async () => {
	try {
		const settings = await settingsAPI.getSettings();

		return {
			settings
		};
	} catch (error) {
		console.error('Failed to load Docker settings:', error);
		return {
			settings: {
				dockerHost: 'unix:///var/run/docker.sock',
				registryCredentials: [],
				pollingEnabled: true,
				pollingInterval: 10,
				autoUpdate: false,
				autoUpdateInterval: 60,
				pruneMode: 'all'
			}
		};
	}
};
