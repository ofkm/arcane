import type { PageLoad } from './$types';
import { settingsAPI, userAPI } from '$lib/services/api';

export const load: PageLoad = async () => {
	try {
		const [settings, users] = await Promise.all([settingsAPI.getSettings(), userAPI.list().catch(() => [])]);

		return {
			settings,
			users
		};
	} catch (error) {
		console.error('Failed to load user settings:', error);
		return {
			settings: {
				auth: {
					localAuthEnabled: true,
					oidcEnabled: false,
					sessionTimeout: 60,
					passwordPolicy: 'strong',
					rbacEnabled: false
				}
			},
			users: []
		};
	}
};
