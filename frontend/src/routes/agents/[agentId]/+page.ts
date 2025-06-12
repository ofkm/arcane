import type { PageLoad } from './$types';
import { agentAPI, deploymentAPI } from '$lib/services/api';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
	const { agentId } = params;

	try {
		// Load all data in parallel using API services
		const [agent, tasks, deployments] = await Promise.allSettled([agentAPI.get(agentId), agentAPI.getTasks(agentId), deploymentAPI.getByAgent(agentId)]);

		// Handle agent not found
		if (agent.status === 'rejected' || !agent.value) {
			throw error(404, {
				message: 'Agent not found'
			});
		}

		// Get agent status from API (this now includes the timeout logic)
		let agentStatus = { status: 'unknown' };
		try {
			agentStatus = await agentAPI.getStatus(agentId);
		} catch (statusError) {
			console.warn('Failed to get agent status:', statusError);
		}

		const agentWithStatus = {
			...agent.value,
			status: agentStatus.status
		};

		return {
			agent: agentWithStatus,
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
