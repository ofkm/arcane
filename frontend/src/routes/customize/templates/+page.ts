import { templateAPI } from '$lib/services/api';

export const load = async () => {
	try {
		const [templates, registries] = await Promise.all([
			templateAPI.loadAll().catch(() => []),
			templateAPI.getRegistries().catch(() => [])
		]);

		const localTemplateCount = templates.filter((t) => !t.isRemote).length;
		const remoteTemplateCount = templates.filter((t) => t.isRemote).length;

		return {
			templates,
			registries,
			localTemplateCount,
			remoteTemplateCount
		};
	} catch (error) {
		console.error('Error loading template settings:', error);
		return {
			templates: [],
			registries: [],
			localTemplateCount: 0,
			remoteTemplateCount: 0
		};
	}
};
