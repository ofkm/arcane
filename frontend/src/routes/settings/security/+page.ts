import type { PageLoad } from './$types';
import { settingsAPI } from '$lib/services/api';

export const load: PageLoad = async () => {
	try {
		const settings = await settingsAPI.getSettings();

		return {
			settings
		};
	} catch (error) {
		console.error('Failed to load security settings:', error);
		return {
			settings: {
				auth: {
					localAuthEnabled: true,
					oidcEnabled: false,
					sessionTimeout: 60,
					passwordPolicy: 'strong',
					rbacEnabled: false
				},
				encryption: {
					enabled: false,
					algorithm: 'AES-256-GCM'
				}
			}
		};
	}
};
