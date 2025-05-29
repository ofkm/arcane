import type { PageServerLoad } from './$types';
import { listAgents } from '$lib/services/agent/agent-manager';

export const load: PageServerLoad = async () => {
	try {
		const agents = await listAgents();

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

		return {
			agents: agentsWithStatus,
			error: null
		};
	} catch (err) {
		console.error('SSR: Failed to load agents:', err);
		return {
			agents: [],
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
};
