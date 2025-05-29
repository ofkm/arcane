import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAgent } from '$lib/services/agent/agent-manager';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		const agent = await getAgent(params.agentId);
		if (!agent) {
			return json({ error: 'Agent not found' }, { status: 404 });
		}

		// Just return the agent as-is, since status already indicates if it's online
		return json({ agent });
	} catch (error) {
		console.error('Error fetching agent:', error);
		return json({ error: 'Failed to fetch agent' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user?.roles.includes('admin')) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	try {
		// TODO: Implement agent deletion
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting agent:', error);
		return json({ error: 'Failed to delete agent' }, { status: 500 });
	}
};
