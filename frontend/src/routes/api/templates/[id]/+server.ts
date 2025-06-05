import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TemplateService } from '$lib/services/template-service';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;
		const templates = await TemplateService.getComposeTemplates();
		const template = templates.find((t) => t.id === id);

		if (!template) {
			return error(404, { message: 'Template not found' });
		}

		return json(template);
	} catch (err) {
		console.error('Error fetching template:', err);
		return error(500, { message: 'Failed to fetch template' });
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		const { name, content, description, envContent } = await request.json();

		if (!name || !content) {
			return error(400, { message: 'Name and content are required' });
		}

		// Delete old template and create new one
		await TemplateService.deleteTemplate(id);
		await TemplateService.createTemplate(name, content, description, envContent);

		return json({
			success: true,
			message: 'Template updated successfully'
		});
	} catch (err) {
		console.error('Error updating template:', err);
		return error(500, { message: 'Failed to update template' });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;
		await TemplateService.deleteTemplate(id);

		return json({
			success: true,
			message: 'Template deleted successfully'
		});
	} catch (err) {
		console.error('Error deleting template:', err);
		return error(500, { message: 'Failed to delete template' });
	}
};
