import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAgent } from '$lib/services/agent/agent-manager';

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

		// In development, send task to the WebSocket dev server
		const isDev = process.env.NODE_ENV !== 'production';

		if (isDev) {
			try {
				// Send task to development WebSocket server
				const devServerResponse = await fetch(`http://localhost:3001/api/agents/${params.agentId}/tasks`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ type, payload })
				});

				if (!devServerResponse.ok) {
					const errorData = await devServerResponse.json();
					throw new Error(errorData.error || 'Failed to send task to dev server');
				}

				const result = await devServerResponse.json();
				return json({
					success: true,
					taskId: result.taskId,
					message: 'Task sent to agent via development server'
				});
			} catch (error) {
				console.error('Failed to send task to dev server:', error);
				return json(
					{
						error: error instanceof Error ? error.message : 'Failed to send task to development server'
					},
					{ status: 500 }
				);
			}
		} else {
			// Production logic - use the actual agent manager
			const { sendTaskToAgent } = await import('$lib/services/agent/agent-manager');
			const task = await sendTaskToAgent(params.agentId, type, payload);
			return json({ success: true, task });
		}
	} catch (error) {
		console.error('Error sending task to agent:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to send task'
			},
			{ status: 500 }
		);
	}
};

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const { listTasks } = await import('$lib/services/agent/agent-manager');
		const tasks = await listTasks(params.agentId);
		return json({ tasks });
	} catch (error) {
		console.error('Error fetching agent tasks:', error);
		return json({ error: 'Failed to fetch tasks' }, { status: 500 });
	}
};
