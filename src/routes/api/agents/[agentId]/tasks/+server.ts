import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendDockerCommand, deployStackToAgent, pullImageOnAgent, sendTaskToAgent, listTasks } from '$lib/services/agent/agent-manager';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const tasks = await listTasks(params.agentId);
		return json({ tasks });
	} catch (error) {
		console.error('Error fetching agent tasks:', error);
		return json({ error: 'Failed to fetch tasks' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const { type, payload } = await request.json();
		const agentId = params.agentId;

		let task;

		switch (type) {
			case 'docker_command':
				task = await sendDockerCommand(agentId, payload.command, payload.args || []);
				break;

			case 'stack_deploy':
				task = await deployStackToAgent(agentId, payload.stackId, payload.composeContent, payload.envContent);
				break;

			case 'image_pull':
				task = await pullImageOnAgent(agentId, payload.imageName);
				break;

			case 'container_start':
			case 'container_stop':
			case 'container_restart':
			case 'container_remove':
				task = await sendTaskToAgent(agentId, type, payload);
				break;

			default:
				return json({ error: 'Unknown task type' }, { status: 400 });
		}

		return json({ task });
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
