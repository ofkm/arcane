import type { PageLoad } from './$types';
import { agentAPI, deploymentAPI } from '$lib/services/api';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
	const { agentId } = params;

	try {
		const [agent, tasks, deployments] = await Promise.allSettled([agentAPI.get(agentId), agentAPI.getTasks(agentId), deploymentAPI.getByAgent(agentId)]);

		if (agent.status === 'rejected' || !agent.value) {
			throw error(404, {
				message: 'Agent not found'
			});
		}

		return {
			agent: agent.value,
			tasks: tasks.status === 'fulfilled' ? tasks.value : [],
			deployments: deployments.status === 'fulfilled' ? deployments.value : [],
			agentId
		};
	} catch (err) {
		console.error('Failed to load agent data:', err);
		throw error(500, {
			message: err instanceof Error ? err.message : 'Failed to load agent data'
		});
	}
};
