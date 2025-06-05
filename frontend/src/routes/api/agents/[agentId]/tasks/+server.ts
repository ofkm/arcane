import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAgent, listTasks, sendTaskToAgent } from '$lib/services/agent/agent-manager';

// GET - Agent requests pending tasks (no auth required for agents)
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const agentId = params.agentId;

		// Check if this is an admin request (has auth) vs agent request (no auth)
		const isAdminRequest = url.searchParams.has('admin') || url.searchParams.has('include_results');

		if (isAdminRequest) {
			// This is an admin request from the UI - return full task data
			const allTasks = await listTasks(agentId);
			return json({ tasks: allTasks });
		} else {
			// This is an agent request - return only pending tasks for execution
			const allTasks = await listTasks(agentId);
			const pendingTasks = allTasks.filter((task) => task.status === 'pending');

			const formattedTasks = pendingTasks.map((task) => ({
				id: task.id,
				type: task.type,
				payload: task.payload
			}));

			console.log(`📋 Agent ${agentId} requested tasks, returning ${formattedTasks.length} pending tasks`);
			return json(formattedTasks);
		}
	} catch (error) {
		console.error('Error fetching tasks:', error);
		return json({ error: 'Failed to fetch tasks' }, { status: 500 });
	}
};

// POST - Admin/UI creates new tasks (requires auth)
// This will require authentication since it's not covered by the regex patterns
export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const { type, payload } = await request.json();

		const agent = await getAgent(params.agentId);
		if (!agent) {
			return json({ error: 'Agent not found' }, { status: 404 });
		}

		if (agent.status !== 'online') {
			return json({ error: `Agent is not online (status: ${agent.status})` }, { status: 400 });
		}

		// Create the task - it will be picked up by the agent on next poll
		const task = await sendTaskToAgent(params.agentId, type, payload);

		console.log(`📋 Task ${task.id} created for agent ${params.agentId}`);

		return json({ success: true, task });
	} catch (error) {
		console.error('Error creating task:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to create task'
			},
			{ status: 500 }
		);
	}
};
