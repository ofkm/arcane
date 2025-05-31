import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendTaskToAgent, getAgent } from '$lib/services/agent/agent-manager';
import { getStacksFromAgent } from '$lib/services/agent/agent-stack-service';

export const GET: RequestHandler = async ({ locals, params, fetch }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const agentId = params.agentId;

		// Verify agent exists and is online
		const agent = await getAgent(agentId);
		if (!agent) {
			return json({ error: 'Agent not found' }, { status: 404 });
		}

		if (agent.status !== 'online') {
			return json({ error: `Agent is not online (status: ${agent.status})` }, { status: 400 });
		}

		// Use the agent-stack-service to get stacks
		// Pass the fetch context to use event.fetch
		const stacks = await getStacksFromAgent(agent, { fetch });

		return json({
			success: true,
			stacks
		});
	} catch (error) {
		console.error('Error fetching agent stacks:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to fetch agent stacks'
			},
			{ status: 500 }
		);
	}
};
