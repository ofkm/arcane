import { TemplateService } from '$lib/services/template-service';
import { getSettings } from '$lib/services/settings-service';
import { templateRegistryService } from '$lib/services/template-registry-service';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { TemplateRegistryConfig } from '$lib/types/settings.type';

export const load: PageServerLoad = async () => {
	try {
		const templateService = new TemplateService();
		const settings = await getSettings();

		const templates = await templateService.loadAllTemplates();

		const localTemplateCount = templates.filter((t) => !t.isRemote).length;
		const remoteTemplateCount = templates.filter((t) => t.isRemote).length;

		return {
			settings,
			localTemplateCount,
			remoteTemplateCount
		};
	} catch (error) {
		console.error('Error loading template settings:', error);
		const fallbackSettings = await getSettings();
		return {
			settings: fallbackSettings,
			localTemplateCount: 0,
			remoteTemplateCount: 0,
			error: error instanceof Error ? error.message : 'Failed to load template data'
		};
	}
};
