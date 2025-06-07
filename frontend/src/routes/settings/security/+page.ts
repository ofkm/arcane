import { settingsAPI } from '$lib/services/api';

export const load = async () => {
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
};
