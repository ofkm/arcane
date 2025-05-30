import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAgent } from '$lib/services/agent/agent-manager';
import { updateAgentHeartbeat } from '$lib/services/agent/agent-manager';

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

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { agent_id, status, timestamp } = await request.json();

		if (!agent_id) {
			return json({ error: 'agent_id is required' }, { status: 400 });
		}

		await updateAgentHeartbeat(agent_id);
		console.log(`💓 Heartbeat received from ${agent_id}`);

		return json({
			success: true,
			message: 'Heartbeat received'
		});
	} catch (error) {
		console.error('Failed to process heartbeat:', error);
		return json(
			{
				error: 'Failed to process heartbeat',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
