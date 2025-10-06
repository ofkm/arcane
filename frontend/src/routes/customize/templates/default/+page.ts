import { templateService } from '$lib/services/template-service';

export const load = async (): Promise<{ composeTemplate: string; envTemplate: string }> => {
	const defaultTemplates = await templateService.getDefaultTemplates().catch((err) => {
		console.warn('Failed to load default templates:', err);
		return { composeTemplate: '', envTemplate: '' };
	});

	return {
		composeTemplate: defaultTemplates.composeTemplate,
		envTemplate: defaultTemplates.envTemplate
	};
};
