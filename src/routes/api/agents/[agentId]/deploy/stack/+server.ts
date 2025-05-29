import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deployStackToAgent } from '$lib/services/agent/agent-manager';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const { stackName, composeContent, envContent } = await request.json();

		// Deploy the stack to the agent
		const task = await deployStackToAgent(params.agentId, stackName, composeContent, envContent);

		return json({
			success: true,
			task,
			message: `Stack deployment task created: ${task.id}`
		});
	} catch (error) {
		console.error('Error deploying stack to agent:', error);
		return json({ error: error instanceof Error ? error.message : 'Failed to deploy stack' }, { status: 500 });
	}
};
