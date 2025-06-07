import { templateAPI, agentAPI } from '$lib/services/api';
import { defaultComposeTemplate } from '$lib/constants';

export const load = async () => {
	try {
		const [allTemplates, envTemplate, agents] = await Promise.all([
			templateAPI.loadAll().catch((err) => {
				console.warn('Failed to load templates:', err);
				return [];
			}),
			templateAPI.getEnvTemplate().catch((err) => {
				console.warn('Failed to load env template:', err);
				return defaultComposeTemplate;
			}),
			agentAPI.listWithStatus().catch((err) => {
				console.warn('Failed to load agents:', err);
				return [];
			})
		]);

		return {
			composeTemplates: allTemplates,
			envTemplate,
			defaultTemplate: defaultComposeTemplate,
			agents
		};
	} catch (error) {
		console.error('Error loading page data:', error);

		// Return fallback data
		return {
			composeTemplates: [],
			envTemplate: defaultComposeTemplate,
			defaultTemplate: defaultComposeTemplate,
			agents: []
		};
	}
};
