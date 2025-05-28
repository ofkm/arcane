import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TemplateService } from '$lib/services/template-service';

const templateService = new TemplateService();

export const GET: RequestHandler = async () => {
	try {
		const [allTemplates, registries] = await Promise.all([templateService.loadAllTemplates(), templateService.getRegistries()]);

		const localTemplates = allTemplates.filter((t) => !t.isRemote);
		const remoteTemplates = allTemplates.filter((t) => t.isRemote);

		const stats = {
			total: allTemplates.length,
			local: localTemplates.length,
			remote: remoteTemplates.length,
			registries: registries.length,
			enabledRegistries: registries.filter((r) => r.enabled).length,
			templatesWithEnv: allTemplates.filter((t) => t.envContent || t.metadata?.envUrl).length
		};

		return json(stats);
	} catch (err) {
		console.error('Error fetching template stats:', err);
		return error(500, { message: 'Failed to fetch template statistics' });
	}
};
