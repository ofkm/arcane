import { settingsAPI } from '$lib/services/api';

export const load = async () => {
	const [settings, oidcStatus] = await Promise.all([
		settingsAPI.getSettings(),
		settingsAPI.getOidcStatus().catch(() => ({
			envForced: false,
			envConfigured: false,
			dbEnabled: false,
			dbConfigured: false,
			effectivelyEnabled: false,
			effectivelyConfigured: false
		})) // Ensure fallback has all new fields
	]);

	return {
		settings,
		oidcStatus // Pass the full oidcStatus object
	};
};
