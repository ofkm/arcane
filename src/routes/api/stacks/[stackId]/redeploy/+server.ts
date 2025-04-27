import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { fullyRedeployStack } from '$lib/services/docker/stack-service';

export const POST: RequestHandler = async ({ params }) => {
	const id = params.stackId;

	try {
		const success = await fullyRedeployStack(id);
		if (success) {
			return json({ success: true, message: `Stack redeployed successfully` });
		} else {
			return json({ success: false, error: 'Failed to redeploy stack' }, { status: 500 });
		}
	} catch (error: any) {
		console.error(`API Error redeploying stack ${id}:`, error);
		return json({ success: false, error: error.message || 'Failed to redeploy stack' }, { status: 500 });
	}
};
