import { templateService } from '$lib/services/template-service';
import { error } from '@sveltejs/kit';
import type { Template } from '$lib/types/template.type';

export const load = async ({
	params
}): Promise<{
	template: Template;
	compose: string;
	env: string;
	allTemplates: Template[];
}> => {
	try {
		const [templateData, allTemplates] = await Promise.all([
			templateService.getTemplateContent(params.id),
			templateService.getAllTemplates()
		]);

		return {
			template: templateData.template,
			compose: templateData.content,
			env: templateData.envContent,
			allTemplates
		};
	} catch (err) {
		console.error('Failed to load template:', err);
		throw error(404, 'Template not found');
	}
};
