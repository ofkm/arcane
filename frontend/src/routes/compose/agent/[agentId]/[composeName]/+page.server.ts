import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAgent } from '$lib/services/agent/agent-manager';
import { getStacksFromAgent } from '$lib/services/agent/agent-stack-service';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const { agentId, composeName } = params;

	try {
		// Get the agent
		const agent = await getAgent(agentId);
		if (!agent) {
			throw error(404, 'Agent not found');
		}

		if (agent.status !== 'online') {
			throw error(400, `Agent is not online (status: ${agent.status})`);
		}

		// Get the specific stack from the agent
		const stacks = await getStacksFromAgent(agent, { fetch });
		const stack = stacks.find((s) => s.name === composeName);

		if (!stack) {
			throw error(404, 'Stack not found on agent');
		}

		return {
			agent,
			stack,
			composeName
		};
	} catch (err) {
		console.error('Error loading agent stack:', err);
		throw error(500, 'Failed to load agent stack');
	}
};
