import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TemplateService } from '$lib/services/template-service';

const templateService = new TemplateService();

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;
		const templates = await templateService.loadAllTemplates();
		const template = templates.find((t) => t.id === id);

		if (!template) {
			return error(404, { message: 'Template not found' });
		}

		const templateContent = await templateService.loadTemplateContent(template);

		return json({
			id: template.id,
			name: template.name,
			description: template.description,
			content: templateContent.content,
			envContent: templateContent.envContent,
			isRemote: template.isRemote,
			metadata: template.metadata
		});
	} catch (err) {
		console.error('Error fetching template content:', err);
		return error(500, { message: 'Failed to fetch template content' });
	}
};
