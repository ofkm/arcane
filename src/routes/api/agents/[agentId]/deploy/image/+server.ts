import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pullImageOnAgent, getAgent } from '$lib/services/agent/agent-manager';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const { imageName } = await request.json();
		const agentId = params.agentId;

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

		// Create the image pull task
		const task = await pullImageOnAgent(agentId, imageName);

		console.log(`📋 Image pull task ${task.id} created for agent ${agentId}: ${imageName}`);

		return json({
			success: true,
			task,
			message: `Image pull task created: ${imageName}`
		});
	} catch (error) {
		console.error('Error creating image pull task:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to create image pull task'
			},
			{ status: 500 }
		);
	}
};
