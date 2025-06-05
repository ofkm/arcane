import { json } from '@sveltejs/kit';
import { listAgents } from '$lib/services/agent/agent-manager';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const agents = await listAgents();

		return json({
			success: true,
			agents,
			count: agents.length
		});
	} catch (error) {
		console.error('API: Failed to list agents:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				agents: []
			},
			{ status: 500 }
		);
	}
};
