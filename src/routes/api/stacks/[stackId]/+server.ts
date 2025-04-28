import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { updateStack } from '$lib/services/docker/stack-service';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const { stackId } = params;
	const { name, composeContent, autoUpdate } = await request.json();

	try {
		await updateStack(stackId, { name, composeContent, autoUpdate });
		return json({ success: true, message: 'Stack updated successfully' });
	} catch (error: any) {
		console.error('Error updating stack:', error);
		return json({ success: false, error: error.message || 'Failed to update stack' }, { status: 500 });
	}
};
