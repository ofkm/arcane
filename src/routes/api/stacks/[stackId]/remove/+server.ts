import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { removeStack } from '$lib/services/docker/stack-service';

export const DELETE: RequestHandler = async ({ params }) => {
	const id = params.stackId;

	if (!id) {
		return json({ success: false, error: 'Stack ID is required' }, { status: 400 });
	}

	try {
		const success = await removeStack(id);
		if (success) {
			return json({ success: true, message: `Stack removed successfully` });
		} else {
			return json({ success: false, error: 'Failed to remove stack' }, { status: 400 });
		}
	} catch (error: any) {
		console.error(`API Error removing stack ${id}:`, error);
		return json({ success: false, error: error.message || 'Failed to remove stack' }, { status: 409 });
	}
};
