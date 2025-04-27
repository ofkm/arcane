import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { stopStack } from '$lib/services/docker/stack-service';

export const POST: RequestHandler = async ({ params }) => {
	const id = params.stackId;

	try {
		const success = await stopStack(id);
		if (success) {
			return json({ success: true, message: `Stack stopped successfully` });
		} else {
			return json({ success: false, error: 'Failed to stop stack' }, { status: 500 });
		}
	} catch (error: any) {
		console.error(`API Error stopping stack ${id}:`, error);
		return json({ success: false, error: error.message || 'Failed to stop stack' }, { status: 500 });
	}
};
