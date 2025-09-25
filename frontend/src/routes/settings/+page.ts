import { settingsService } from '$lib/services/settings-service';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const [settings, oidcStatus] = await Promise.all([settingsService.getSettings(), settingsService.getOidcStatus()]);

		return {
			settings,
			oidcStatus
		};
	} catch (error) {
		console.error('Failed to load settings:', error);
		throw error;
	}
};
