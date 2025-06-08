import { templateAPI, agentAPI } from '$lib/services/api';
import { defaultComposeTemplate, defaultEnvTemplate } from '$lib/constants';

export const load = async () => {
	const [allTemplates, envTemplate] = await Promise.all([
		templateAPI.loadAll().catch((err) => {
			console.warn('Failed to load templates:', err);
			return [];
		}),
		templateAPI.getEnvTemplate().catch((err) => {
			console.warn('Failed to load env template:', err);
			return defaultEnvTemplate;
		})
		// agentAPI.listWithStatus().catch((err) => {
		// 	console.warn('Failed to load agents:', err);
		// 	return [];
		// })
	]);

	return {
		composeTemplates: allTemplates,
		envTemplate,
		defaultTemplate: defaultComposeTemplate,
		agents: []
	};
};
