import { templateAPI, environmentManagementAPI } from '$lib/services/api';
import { defaultComposeTemplate, defaultEnvTemplate } from '$lib/constants';
import type { Template } from '$lib/types/template.type';
import type { Environment } from '$lib/stores/environment.store';

export interface PageProps {
	composeTemplates: Template[];
	envTemplate: string;
	defaultTemplate: string;
	environments: Environment[];
}

export const load = async (): Promise<PageProps> => {
	const [allTemplates, envTemplate, environments] = await Promise.all([
		templateAPI.loadAll().catch((err) => {
			console.warn('Failed to load templates:', err);
			return [];
		}),
		templateAPI.getEnvTemplate().catch((err) => {
			console.warn('Failed to load env template:', err);
			return defaultEnvTemplate;
		}),
		environmentManagementAPI.list().catch((err) => {
			console.warn('Failed to load environments:', err);
			return [];
		})
	]);

	return {
		composeTemplates: allTemplates,
		envTemplate,
		defaultTemplate: defaultComposeTemplate,
		environments
	};
};
