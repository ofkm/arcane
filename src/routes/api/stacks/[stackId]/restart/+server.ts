import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { restartStack } from '$lib/services/docker/stack-service';

export const POST: RequestHandler = async ({ params }) => {
	const id = params.stackId;

	try {
		const success = await restartStack(id);
		if (success) {
			return json({ success: true, message: `Stack restarted successfully` });
		} else {
			return json({ success: false, error: 'Failed to restart stack' }, { status: 500 });
		}
	} catch (error: any) {
		console.error(`API Error restarting stack ${id}:`, error);
		return json({ success: false, error: error.message || 'Failed to restart stack' }, { status: 500 });
	}
};
