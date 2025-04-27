import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { updateStack } from '$lib/services/docker/stack-service';
import { NotFoundError, ServiceError } from '$lib/types/errors';
import { startStack } from '$lib/services/docker/stack-service';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const stackId = params.stackId;

	try {
		const body = await request.json();
		const { name, composeContent } = body;

		// Basic validation
		if (!stackId) {
			return json({ error: 'Stack ID is required' }, { status: 400 });
		}
		if (typeof name !== 'string' || name.trim() === '') {
			return json({ error: 'Stack name is required' }, { status: 400 });
		}
		// Allow empty compose content? Assuming yes for now.
		if (typeof composeContent !== 'string') {
			return json({ error: 'Invalid composeContent format' }, { status: 400 });
		}

		const updatedStack = await updateStack(stackId, { name: name.trim(), composeContent });

		return json({ message: 'Stack updated successfully', stack: updatedStack }, { status: 200 });
	} catch (error: any) {
		console.error(`Error updating stack ${stackId}:`, error);

		if (error instanceof SyntaxError) {
			// Handle invalid JSON
			return json({ error: 'Invalid request body' }, { status: 400 });
		}
		if (error instanceof NotFoundError) {
			return json({ error: error.message }, { status: 404 });
		}
		if (error instanceof ServiceError) {
			// Handle errors from stack-service
			return json({ error: error.message }, { status: 500 });
		}

		return json({ error: 'Failed to update stack' }, { status: 500 });
	}
};
