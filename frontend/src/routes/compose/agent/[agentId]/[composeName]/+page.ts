import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { agentAPI, stackAPI } from '$lib/services/api';

export const load: PageLoad = async ({ params }) => {
	const { agentId, composeName } = params;

	try {
		// Get the agent via API
		const agent = await agentAPI.get(agentId).catch((err) => {
			console.error(`Failed to get agent ${agentId}:`, err);
			throw error(404, 'Agent not found');
		});

		if (!agent) {
			throw error(404, 'Agent not found');
		}

		// Check agent status via API
		const agentStatus = await agentAPI.getStatus(agentId).catch(() => ({ status: 'offline' }));

		if (agentStatus.status !== 'online') {
			throw error(400, `Agent is not online (status: ${agentStatus.status})`);
		}

		// Get stacks from the agent via API
		const stacks = await agentAPI.getStacks(agentId).catch((err) => {
			console.error(`Failed to get stacks from agent ${agentId}:`, err);
			return [];
		});

		// Find the specific stack
		const stack = stacks.find((s) => s.name === composeName);

		if (!stack) {
			throw error(404, 'Stack not found on agent');
		}

		// Get detailed stack information if needed
		let detailedStack = stack;
		if (stack.id) {
			try {
				detailedStack = await stackAPI.get(stack.id);
			} catch (err) {
				console.warn('Failed to get detailed stack info, using basic info:', err);
			}
		}

		return {
			agent: {
				...agent,
				status: agentStatus.status
			},
			stack: detailedStack,
			composeName
		};
	} catch (err) {
		console.error('Error loading agent stack:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Failed to load agent stack');
	}
};
