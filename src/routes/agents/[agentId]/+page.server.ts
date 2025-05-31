import type { PageServerLoad } from './$types';
import { getAgent, getAgentTasks } from '$lib/services/agent/agent-manager';
import { getDeployments } from '$lib/services/deployment-service';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { agentId } = params;

	try {
		// Load all data in parallel
		const [agent, tasks, deployments] = await Promise.allSettled([getAgent(agentId), getAgentTasks(agentId), getDeployments(agentId)]);

		// Handle agent not found
		if (agent.status === 'rejected' || !agent.value) {
			throw error(404, {
				message: 'Agent not found'
			});
		}

		// Calculate actual status (move this logic to server)
		const now = new Date();
		const timeout = 5 * 60 * 1000; // 5 minutes
		const lastSeen = new Date(agent.value.lastSeen);
		const timeSinceLastSeen = now.getTime() - lastSeen.getTime();

		const agentWithStatus = {
			...agent.value,
			status: timeSinceLastSeen > timeout ? 'offline' : agent.value.status
		};

		return {
			agent: agentWithStatus,
			tasks: tasks.status === 'fulfilled' ? tasks.value : [],
			deployments: deployments.status === 'fulfilled' ? deployments.value : [],
			agentId
		};
	} catch (err) {
		console.error('SSR: Failed to load agent data:', err);
		throw error(500, {
			message: err instanceof Error ? err.message : 'Failed to load agent data'
		});
	}
};
