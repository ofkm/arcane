import { settingsAPI } from '$lib/services/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const [settings, oidcStatus] = await Promise.all([
			settingsAPI.getSettings(),
			settingsAPI.getOidcStatus()
		]);

		return {
			settings,
			oidcStatus
		};
	} catch (error) {
		console.error('Failed to load settings:', error);
		throw error;
	}
};
