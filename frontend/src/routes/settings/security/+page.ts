import { settingsService } from '$lib/services/settings-service';

export const load = async () => {
	const [settings, oidcStatus] = await Promise.all([
		settingsService.getSettings(),
		settingsService.getOidcStatus().catch(() => ({
			envForced: false,
			envConfigured: false
		}))
	]);

	return {
		settings,
		oidcStatus
	};
};
