import type { PageServerLoad } from './$types';
import { getSettings } from '$lib/services/settings-service';

export const load: PageServerLoad = async () => {
	try {
		const settings = await getSettings();

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
			},
			csrf: crypto.randomUUID()
		};
	}
};
