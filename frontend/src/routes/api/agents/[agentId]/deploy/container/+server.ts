import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendTaskToAgent, getAgent } from '$lib/services/agent/agent-manager';
import { createContainerDeployment } from '$lib/services/deployment-service';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const data = await request.json();
		const agentId = params.agentId;

		const { imageName, containerName, ports = [], volumes = [], envVars = [], detached = true, autoRemove = false, restartPolicy = 'no' } = data;

		if (!imageName) {
			return json({ error: 'Image name is required' }, { status: 400 });
		}

		// Verify agent exists and is online
		const agent = await getAgent(agentId);
		if (!agent) {
			return json({ error: 'Agent not found' }, { status: 404 });
		}

		if (agent.status !== 'online') {
			return json({ error: `Agent is not online (status: ${agent.status})` }, { status: 400 });
		}

		// Build Docker run command arguments
		const args = ['run'];

		// Add detached flag
		if (detached) {
			args.push('-d');
		}

		// Add auto remove flag
		if (autoRemove) {
			args.push('--rm');
		}

		// Add restart policy
		if (restartPolicy && restartPolicy !== 'no') {
			args.push('--restart', restartPolicy);
		}

		// Add container name
		if (containerName) {
			args.push('--name', containerName);
		}

		// Add port mappings
		ports.forEach((port: { host: string; container: string }) => {
			if (port.host && port.container) {
				args.push('-p', `${port.host}:${port.container}`);
			}
		});

		// Add volume mounts
		volumes.forEach((volume: { host: string; container: string }) => {
			if (volume.host && volume.container) {
				args.push('-v', `${volume.host}:${volume.container}`);
			}
		});

		// Add environment variables
		envVars.forEach((env: { key: string; value: string }) => {
			if (env.key && env.value) {
				args.push('-e', `${env.key}=${env.value}`);
			}
		});

		// Add image name
		args.push(imageName);

		// Create the container run task
		const task = await sendTaskToAgent(agentId, 'docker_command', {
			command: 'run',
			args: args.slice(1) // Remove 'run' since it's the command
		});

		// Create deployment record
		const deployment = await createContainerDeployment(
			agentId,
			containerName || imageName,
			imageName,
			ports.map((p: any) => `${p.host}:${p.container}`),
			volumes.map((v: any) => `${v.host}:${v.container}`),
			task.id
		);

		console.log(`🐳 Container deployment task ${task.id} created for agent ${agentId}: ${containerName || imageName}`);

		return json({
			success: true,
			task,
			deployment,
			message: `Container deployment task created: ${containerName || imageName}`
		});
	} catch (error) {
		console.error('Error creating container deployment task:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to create container deployment task'
			},
			{ status: 500 }
		);
	}
};
