import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TemplateService } from '$lib/services/template-service';

const templateService = new TemplateService();

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		const body = await request.json().catch(() => ({}));
		const { localName } = body;

		console.log(`Download request for template: ${id}`);

		// Find the remote template
		const allTemplates = await templateService.loadAllTemplates();
		const template = allTemplates.find((t) => t.id === id && t.isRemote);

		if (!template || !template.isRemote) {
			console.error(`Remote template not found: ${id}`);
			return error(404, { message: 'Remote template not found' });
		}

		console.log(`Found remote template: ${template.name}`);

		// Load the template content (this handles fetching from remote URLs)
		let templateContent;
		try {
			templateContent = await templateService.loadTemplateContent(template);
		} catch (contentError) {
			console.error(`Error loading template content for ${id}:`, contentError);

			// If env file fails but compose succeeds, continue with just compose content
			if (contentError instanceof Error && contentError.message.includes('environment content')) {
				console.warn(`Environment file failed for ${template.name}, continuing with compose content only`);
				// Try to load just the compose content without env
				try {
					const composeContent = await templateService.loadComposeContent(template);
					templateContent = {
						content: composeContent,
						envContent: undefined
					};
				} catch (composeError) {
					console.error(`Failed to load compose content for ${id}:`, composeError);
					return error(500, { message: 'Failed to load template content' });
				}
			} else {
				return error(500, { message: 'Failed to load template content' });
			}
		}

		if (!templateContent.content) {
			return error(500, { message: 'Template content is empty' });
		}

		// Create local template with downloaded content
		const savedName = localName || template.name;
		const localId = savedName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

		try {
			await TemplateService.createTemplate(savedName, templateContent.content, template.description, templateContent.envContent);

			console.log(`Template saved locally as: ${savedName}`);

			return json({
				success: true,
				message: `Template "${savedName}" downloaded and saved locally`,
				localId,
				hasEnv: !!templateContent.envContent
			});
		} catch (saveError) {
			console.error(`Error saving template locally:`, saveError);
			return error(500, { message: 'Failed to save template locally' });
		}
	} catch (err) {
		console.error('Error in download endpoint:', err);
		return error(500, {
			message: err instanceof Error ? err.message : 'Failed to download template'
		});
	}
};
