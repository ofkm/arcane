import { TemplateService } from '$lib/services/template-service';
import { defaultComposeTemplate } from '$lib/constants';
import type { PageServerLoad } from './$types';

export const load = (async () => {
	try {
		const templateService = new TemplateService();

		const [allTemplates, envTemplate] = await Promise.all([templateService.loadAllTemplates(), TemplateService.getEnvTemplate()]);

		return {
			composeTemplates: allTemplates,
			envTemplate,
			defaultTemplate: defaultComposeTemplate
		};
	} catch (error) {
		console.error('Error loading templates:', error);

		// Return fallback data
		return {
			composeTemplates: [],
			envTemplate: defaultComposeTemplate,
			defaultTemplate: defaultComposeTemplate
		};
	}
}) satisfies PageServerLoad;
