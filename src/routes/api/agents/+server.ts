import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAgents } from '$lib/services/agent/agent-manager';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const agents = await listAgents();

		// Mark agents as offline if they haven't sent a heartbeat recently
		const now = new Date();
		const timeout = 5 * 60 * 1000; // 5 minutes

		const agentsWithStatus = agents.map((agent) => {
			const lastSeen = new Date(agent.lastSeen);
			const timeSinceLastSeen = now.getTime() - lastSeen.getTime();

			return {
				...agent,
				status: timeSinceLastSeen > timeout ? 'offline' : agent.status
			};
		});

		return json({ agents: agentsWithStatus });
	} catch (error) {
		console.error('Error fetching agents:', error);
		return json({ error: 'Failed to fetch agents' }, { status: 500 });
	}
};
