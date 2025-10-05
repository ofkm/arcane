import { templateService } from '$lib/services/template-service';

export const load = async () => {
	const [allTemplates, defaultTemplates] = await Promise.all([
		templateService.loadAll().catch((err) => {
			console.warn('Failed to load templates:', err);
			return [];
		}),
		templateService.getDefaultTemplates().catch((err) => {
			console.warn('Failed to load default templates:', err);
			return { composeTemplate: '', envTemplate: '' };
		})
	]);

	return {
		composeTemplates: allTemplates,
		envTemplate: defaultTemplates.envTemplate,
		defaultTemplate: defaultTemplates.composeTemplate
	};
};
