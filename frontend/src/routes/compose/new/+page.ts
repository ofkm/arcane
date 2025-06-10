import { templateAPI, agentAPI } from '$lib/services/api';
import { defaultComposeTemplate, defaultEnvTemplate } from '$lib/constants';
import type { Template } from '$lib/types/template.type';
import type { Agent } from '$lib/types/agent.type';

export interface PageProps {
	composeTemplates: Template[];
	envTemplate: string;
	defaultTemplate: string;
	agents: Agent[];
}

export const load = async (): Promise<PageProps> => {
	const [allTemplates, envTemplate] = await Promise.all([
		templateAPI.loadAll().catch((err) => {
			console.warn('Failed to load templates:', err);
			return [];
		}),
		templateAPI.getEnvTemplate().catch((err) => {
			console.warn('Failed to load env template:', err);
			return defaultEnvTemplate;
		})
	]);

	return {
		composeTemplates: allTemplates,
		envTemplate,
		defaultTemplate: defaultComposeTemplate,
		agents: []
	};
};
