import type { PageLoad } from './$types';
import { settingsAPI } from '$lib/services/api';

export const load: PageLoad = async ({ url }) => {
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

		const redirectTo = url.searchParams.get('redirect') || '/';
		const error = url.searchParams.get('error');

		return {
			redirectTo,
			settings,
			oidcStatus,
			error
		};
	} catch (error) {
		console.error('Failed to load login page data:', error);

		const redirectTo = url.searchParams.get('redirect') || '/';
		const loginError = url.searchParams.get('error');

		return {
			redirectTo,
			settings: {
				auth: {
					localAuthEnabled: true,
					oidcEnabled: false,
					sessionTimeout: 60,
					passwordPolicy: 'strong',
					rbacEnabled: false
				},
				onboarding: {
					completed: false
				}
			},
			oidcStatus: {
				enabled: false,
				configured: false,
				envConfigured: false,
				settingsConfigured: false
			},
			error: loginError
		};
	}
};
