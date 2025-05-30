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

		const agent = await getAgent(agentId);
		if (!agent) {
			return json({ error: 'Agent not found' }, { status: 404 });
		}

		if (agent.status !== 'online') {
			return json({ error: `Agent is not online (status: ${agent.status})` }, { status: 400 });
		}

		const envVars: Record<string, string> = {};
		if (envContent) {
			envContent.split('\n').forEach((line: string) => {
				const trimmedLine = line.trim();
				if (trimmedLine && !trimmedLine.startsWith('#')) {
					const [key, ...valueParts] = trimmedLine.split('=');
					if (key && valueParts.length > 0) {
						envVars[key.trim()] = valueParts.join('=').trim();
					}
				}
			});
		}

		// Step 1: Create the project with compose content and env vars
		const createTask = await sendTaskToAgent(agentId, 'compose_create_project', {
			project_name: stackName,
			compose_content: composeContent,
			env_vars: envVars
		});

		console.log(`📋 Stack creation task ${createTask.id} created for agent ${agentId}: ${stackName}`);

		// Step 2: Start the project with compose_up
		const startTask = await sendTaskToAgent(agentId, 'compose_up', {
			project_name: stackName
		});

		console.log(`🚀 Stack start task ${startTask.id} created for agent ${agentId}: ${stackName}`);

		// Create deployment record (using the start task ID as the primary reference)
		const deployment = await createStackDeployment(agentId, stackName, composeContent, envContent, startTask.id);

		return json({
			success: true,
			createTask,
			startTask,
			deployment,
			message: `Stack "${stackName}" created and started on agent`
		});
	} catch (error) {
		console.error('Error creating and starting stack:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to create and start stack'
			},
			{ status: 500 }
		);
	}
};
