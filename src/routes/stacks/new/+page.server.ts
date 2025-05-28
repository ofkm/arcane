import { TemplateService } from '$lib/services/template-service';
import { defaultComposeTemplate } from '$lib/constants';
import type { PageServerLoad } from './$types';

export const load = (async () => {
	try {
		const [composeTemplates, envTemplate] = await Promise.all([TemplateService.getComposeTemplates(), TemplateService.getEnvTemplate()]);

		return {
			composeTemplates,
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
