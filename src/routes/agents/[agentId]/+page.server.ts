import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getAgent, listTasks } from '$lib/services/agent/agent-manager';
import type { AgentTask } from '$lib/types/agent.type';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user?.roles.includes('admin')) {
		throw error(403, 'Unauthorized');
	}

	try {
		const agent = await getAgent(params.agentId);
		if (!agent) {
			throw error(404, 'Agent not found');
		}

		// Get tasks for this agent
		let tasks: AgentTask[] = [];
		try {
			tasks = await listTasks(params.agentId);
		} catch (err) {
			console.error('Failed to load tasks:', err);
			// Don't fail the whole page if tasks fail to load
		}

		return {
			agent,
			tasks: tasks.slice(0, 10), // Only return recent tasks
			agentId: params.agentId
		};
	} catch (err) {
		console.error('Failed to load agent:', err);
		throw error(500, 'Failed to load agent');
	}
};
