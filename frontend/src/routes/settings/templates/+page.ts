import { settingsAPI, templateAPI, templateRegistryAPI } from '$lib/services/api';

export const load = async () => {
	const [settings, templates, registries] = await Promise.all([settingsAPI.getSettings(), templateAPI.loadAll().catch(() => []), templateRegistryAPI.list().catch(() => [])]);

	return {
		settings,
		templates,
		registries
	};
};
