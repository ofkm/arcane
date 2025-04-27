import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { removeContainer } from '$lib/services/docker/container-service';

/**
 * This TypeScript function handles the deletion of a container with optional force parameter and
 * returns success or error messages accordingly.
 * @param  - The code snippet you provided is an example of a DELETE request handler function in
 * JavaScript using an asynchronous function. Here's a breakdown of the key components:
 * @returns The DELETE request handler is returning a JSON response with either a success message if
 * the container was removed successfully or an error message if there was a failure in removing the
 * container. The response includes a `success` key indicating the operation's success status and a
 * `message` key with a corresponding message. If an error occurs, the response includes a `success`
 * key set to false, an `error`
 */
export const DELETE: RequestHandler = async ({ params, url }) => {
	const containerId = params.containerId;
	const force = url.searchParams.has('force') ? url.searchParams.get('force') === 'true' : false;

	try {
		await removeContainer(containerId, force);
		return json({
			success: true,
			message: `Container removed successfully`
		});
	} catch (error: any) {
		console.error(`API Error removing container ${containerId}:`, error);
		return json(
			{
				success: false,
				error: error.message || 'Failed to remove container'
			},
			{ status: 409 }
		);
	}
};
