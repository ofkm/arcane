import { templateService } from '$lib/services/template-service';
import { error } from '@sveltejs/kit';
import type { Template } from '$lib/types/template.type';

export const load = async ({ params }): Promise<{ template: Template; compose: string; env: string }> => {
	try {
		const templateData = await templateService.getTemplateContent(params.id);
		return {
			template: templateData.template,
			compose: templateData.content,
			env: templateData.envContent
		};
	} catch (err) {
		console.error('Failed to load template:', err);
		throw error(404, 'Template not found');
	}
};
