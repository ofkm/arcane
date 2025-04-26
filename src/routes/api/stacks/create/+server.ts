import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createStack } from '$lib/services/docker/stack-service';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const name = body.name?.toString();
		const composeContent = body.composeContent?.toString();

		if (!name) {
			throw error(400, 'Stack name is required');
		}

		if (!composeContent) {
			throw error(400, 'Compose file content is required');
		}

		const newStack = await createStack(name, composeContent);

		return json({
			success: true,
			stack: newStack,
			message: `Stack "${newStack.name}" created successfully.`
		});
	} catch (err: any) {
		// Handle specific SvelteKit errors or re-throw them
		if (err.status >= 400 && err.status < 600) {
			throw err;
		}
		// Handle errors from createStack
		console.error('API Error creating stack:', err);
		throw error(500, err.message || 'Failed to create stack');
	}
};
