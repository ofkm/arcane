import { TemplateService } from '$lib/services/template-service';
import { defaultComposeTemplate } from '$lib/constants';
import type { PageServerLoad } from './$types';
import { listAgents } from '$lib/services/agent/agent-manager';

export const load: PageServerLoad = async () => {
	try {
		const templateService = new TemplateService();

		const [allTemplates, envTemplate] = await Promise.all([templateService.loadAllTemplates(), TemplateService.getEnvTemplate()]);

		const agents = await listAgents();

		// Calculate actual status on server side
		const now = new Date();
		const timeout = 5 * 60 * 1000; // 5 minutes

		const agentsWithStatus = agents.map((agent) => {
			const lastSeen = new Date(agent.lastSeen);
			const timeSinceLastSeen = now.getTime() - lastSeen.getTime();

			return {
				...agent,
				status: timeSinceLastSeen > timeout ? 'offline' : agent.status
			};
		});

		return {
			composeTemplates: allTemplates,
			envTemplate,
			defaultTemplate: defaultComposeTemplate,
			agents: agentsWithStatus
		};
	} catch (error) {
		console.error('Error loading templates:', error);

		// Return fallback data
		return {
			composeTemplates: [],
			envTemplate: defaultComposeTemplate,
			defaultTemplate: defaultComposeTemplate,
			agents: []
		};
	}
};
