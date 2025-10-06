import { templateService } from '$lib/services/template-service';
import type { Template, TemplateRegistry } from '$lib/types/template.type';

export const load = async (): Promise<{ templates: Template[]; registries: TemplateRegistry[] }> => {
	const [templates, registries] = await Promise.all([
		templateService.loadAll().catch(() => []),
		templateService.getRegistries().catch(() => [])
	]);

	return {
		templates,
		registries
	};
};
