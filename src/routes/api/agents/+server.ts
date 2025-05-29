import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAgents } from '$lib/services/agent/agent-manager';
import { agentWSManager } from '$lib/services/agent/websocket-service';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const agents = await listAgents();
		const connectedAgents = agentWSManager.getConnectedAgents();

		// Merge connected status with agent data
		const agentsWithStatus = agents.map((agent) => ({
			...agent,
			connected: connectedAgents.some((ca) => ca.id === agent.id)
		}));

		return json({ agents: agentsWithStatus });
	} catch (error) {
		console.error('Error fetching agents:', error);
		return json({ error: 'Failed to fetch agents' }, { status: 500 });
	}
};
