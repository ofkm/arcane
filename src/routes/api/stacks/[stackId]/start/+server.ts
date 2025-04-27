import { startStack } from '$lib/services/docker/stack-service';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ params }) => {
	const id = params.stackId;

	try {
		await startStack(id);
		return json({ success: true, message: `Stack started successfully` });
	} catch (error: any) {
		console.error(`API Error starting stack ${id}:`, error);
		return json({ success: false, error: error.message || 'Failed to start stack' }, { status: 500 });
	}
};
