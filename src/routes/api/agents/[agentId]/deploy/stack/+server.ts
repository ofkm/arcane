import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendTaskToAgent, getAgent } from '$lib/services/agent/agent-manager';
import { createStackDeployment } from '$lib/services/deployment-service';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const data = await request.json();
		const agentId = params.agentId;

		const { stackName, composeContent, envContent, mode } = data;

		if (!stackName || !composeContent) {
			return json({ error: 'Stack name and compose content are required' }, { status: 400 });
		}

		// Verify agent exists and is online
		const agent = await getAgent(agentId);
		if (!agent) {
			return json({ error: 'Agent not found' }, { status: 404 });
		}

		if (agent.status !== 'online') {
			return json({ error: `Agent is not online (status: ${agent.status})` }, { status: 400 });
		}

		// Create the stack deployment task
		const task = await sendTaskToAgent(agentId, 'deploy_stack', {
			stackName,
			composeContent,
			envContent,
			mode
		});

		// Create deployment record
		const deployment = await createStackDeployment(agentId, stackName, composeContent, envContent, task.id);

		console.log(`📋 Stack deployment task ${task.id} created for agent ${agentId}: ${stackName}`);

		return json({
			success: true,
			task,
			deployment,
			message: `Stack deployment task created: ${stackName}`
		});
	} catch (error) {
		console.error('Error creating stack deployment task:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to create stack deployment task'
			},
			{ status: 500 }
		);
	}
};
