import { templateAPI } from '$lib/services/api';

export const load = async () => {
	const [templates, registries] = await Promise.all([
		templateAPI.loadAll().catch(() => []),
		templateAPI.getRegistries().catch(() => [])
	]);

	return {
		templates,
		registries
	};
};
