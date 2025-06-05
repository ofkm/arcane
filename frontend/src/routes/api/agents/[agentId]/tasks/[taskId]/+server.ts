import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTask } from '$lib/services/agent/agent-manager';

// GET - Get individual task details including results
export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const task = await getTask(params.taskId);
		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		if (task.agentId !== params.agentId) {
			return json({ error: 'Task does not belong to this agent' }, { status: 400 });
		}

		return json({ task });
	} catch (error) {
		console.error('Error fetching task:', error);
		return json({ error: 'Failed to fetch task' }, { status: 500 });
	}
};
