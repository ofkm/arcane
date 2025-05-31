import type { PageServerLoad } from './$types';
import { listAgents } from '$lib/services/agent/agent-manager';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user has admin role
	if (!locals.user?.roles.includes('admin')) {
		throw error(403, {
			message: 'Unauthorized access'
		});
	}

	try {
		// Load agents with actual status calculation
		const agents = await listAgents();

		// Calculate actual status on server side
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
			agents: agentsWithStatus
		};
	} catch (err) {
		console.error('SSR: Failed to load agents:', err);
		throw error(500, {
			message: err instanceof Error ? err.message : 'Failed to load agents'
		});
	}
};
