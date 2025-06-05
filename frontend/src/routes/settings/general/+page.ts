import type { PageLoad } from './$types';
import { settingsAPI } from '$lib/services/api';

export const load: PageLoad = async () => {
	try {
		const settings = await settingsAPI.getSettings();

		return {
			settings
		};
	} catch (error) {
		console.error('Failed to load general settings:', error);
		return {
			settings: {
				dockerHost: 'unix:///var/run/docker.sock',
				stacksDirectory: 'data/stacks',
				autoUpdate: false,
				autoUpdateInterval: 60,
				pollingEnabled: true,
				pollingInterval: 10,
				pruneMode: 'dangling' as const,
				registryCredentials: [],
				templateRegistries: [],
				auth: {
					localAuthEnabled: true,
					oidcEnabled: false,
					sessionTimeout: 60,
					passwordPolicy: 'strong' as const,
					rbacEnabled: false
				},
				onboarding: {
					completed: false
				},
				maturityThresholdDays: 5
			}
		};
	}
};
