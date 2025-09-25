import { templateService } from '$lib/services/template-service';

export const load = async () => {
	const [templates, registries] = await Promise.all([
		templateService.loadAll().catch(() => []),
		templateService.getRegistries().catch(() => [])
	]);

	return {
		templates,
		registries
	};
};
