import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { startContainer } from '$lib/services/docker/container-service';

/**
 * This TypeScript function handles a POST request to start a container and returns a success message
 * or an error message with appropriate status code.
 * @param  - The code snippet you provided is a TypeScript function that handles a POST request. It
 * expects a parameter object with a `containerId` property. Inside the function, it attempts to start
 * a container using the `startContainer` function with the provided `containerId`. If the operation is
 * successful, it returns
 * @returns The code snippet is a TypeScript function that handles a POST request to start a container
 * based on the provided `containerId`.
 */
export const POST: RequestHandler = async ({ params }) => {
	const containerId = params.containerId;

	try {
		await startContainer(containerId);
		return json({
			success: true,
			message: `Container started successfully`
		});
	} catch (error: any) {
		console.error(`API Error starting container ${containerId}:`, error);
		return json(
			{
				success: false,
				error: error.message || 'Failed to start container'
			},
			{ status: 500 }
		);
	}
};
