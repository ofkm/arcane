import type { PageLoad } from './$types';
import { settingsAPI, templateAPI, templateRegistryAPI } from '$lib/services/api';

export const load: PageLoad = async () => {
	try {
		const [settings, templates, registries] = await Promise.all([settingsAPI.getSettings(), templateAPI.loadAll().catch(() => []), templateRegistryAPI.list().catch(() => [])]);

		return {
			settings,
			templates,
			registries
		};
	} catch (error) {
		console.error('Failed to load template settings:', error);
		return {
			settings: {
				templates: {
					enabled: true,
					registries: []
				}
			},
			templates: [],
			registries: []
		};
	}
};
