import type { PageLoad } from './$types';
import { settingsAPI } from '$lib/services/api';

export const load: PageLoad = async () => {
	try {
		const [settings, oidcStatus] = await Promise.all([
			settingsAPI.getSettings(),
			settingsAPI.getOidcStatus().catch(() => ({
				enabled: false,
				configured: false,
				envConfigured: false,
				settingsConfigured: false
			}))
		]);

		return {
			settings,
			oidcStatus,
			oidcEnvVarsConfigured: oidcStatus.envConfigured
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
				}
			},
			oidcStatus: {
				enabled: false,
				configured: false,
				envConfigured: false,
				settingsConfigured: false
			},
			oidcEnvVarsConfigured: false
		};
	}
};
