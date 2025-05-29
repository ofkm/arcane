import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAgent } from '$lib/services/agent/agent-manager';
import type { Deployment } from '$lib/types/deployment.type';

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

		// For now, return mock data since we don't have a deployments table yet
		// In a real implementation, you'd query your database for deployments
		const mockDeployments: Deployment[] = [
			{
				id: 'deploy-1',
				name: 'nginx-web',
				type: 'container',
				status: 'running',
				agentId: agentId,
				createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
				metadata: {
					containerName: 'nginx-web',
					imageName: 'nginx:alpine',
					ports: ['80:80']
				}
			},
			{
				id: 'deploy-2',
				name: 'redis-cache',
				type: 'image',
				status: 'completed',
				agentId: agentId,
				createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
				metadata: {
					imageName: 'redis:alpine'
				}
			}
		];

		return json({
			success: true,
			deployments: mockDeployments
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
