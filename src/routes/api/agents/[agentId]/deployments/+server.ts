import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAgent } from '$lib/services/agent/agent-manager';
import { getDeployments } from '$lib/services/deployment-service';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const agentId = params.agentId;

		// Verify agent exists
		const agent = await getAgent(agentId);
		if (!agent) {
			return json({ error: 'Agent not found' }, { status: 404 });
		}

		// Get real deployments from the service
		const deployments = await getDeployments(agentId);

		return json({
			success: true,
			deployments
		});
	} catch (error) {
		console.error('Error fetching deployments:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to fetch deployments'
			},
			{ status: 500 }
		);
	}
};
