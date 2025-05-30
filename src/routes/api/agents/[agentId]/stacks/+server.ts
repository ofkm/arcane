import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendTaskToAgent, getAgent } from '$lib/services/agent/agent-manager';

export const GET: RequestHandler = async ({ locals, params }) => {
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

		// Send task to get compose projects
		const task = await sendTaskToAgent(agentId, 'docker_command', {
			command: 'compose',
			args: ['ls', '--format', 'json']
		});

		// For now, return the task ID - you'll need to implement proper polling
		// or use websockets to get the actual result
		return json({
			success: true,
			taskId: task.id,
			stacks: [] // Placeholder - implement proper task result polling
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
