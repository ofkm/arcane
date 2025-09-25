import { defaultComposeTemplate } from '$lib/constants';
import { templateService } from '$lib/services/template-service';

export const load = async () => {
	const [allTemplates, envTemplate] = await Promise.all([
		templateService.loadAll().catch((err) => {
			console.warn('Failed to load templates:', err);
			return [];
		}),
		templateService.getEnvTemplate().catch((err) => {
			console.warn('Failed to load env template:', err);
			return '';
		})
	]);

	return {
		composeTemplates: allTemplates,
		envTemplate,
		defaultTemplate: defaultComposeTemplate
	};
};
