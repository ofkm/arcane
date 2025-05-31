import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateTaskStatus } from '$lib/services/agent/agent-manager';

// POST - Agent submits task results (no auth required for agents)
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { task_id, status, result, error: taskError } = await request.json();
		const agentId = params.agentId;
		const taskId = params.taskId;

		// Validate that task_id matches the URL parameter
		if (task_id && task_id !== taskId) {
			return json({ error: 'Task ID mismatch' }, { status: 400 });
		}

		if (!status || !['completed', 'failed', 'running'].includes(status)) {
			return json({ error: 'Invalid status' }, { status: 400 });
		}

		// Update the task status
		await updateTaskStatus(taskId, status, result, taskError);

		console.log(`📋 Task ${taskId} result received from agent ${agentId}: ${status}`);

		return json({
			success: true,
			message: 'Task result received'
		});
	} catch (error) {
		console.error('Failed to update task result:', error);
		return json(
			{
				error: 'Failed to update task result',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
