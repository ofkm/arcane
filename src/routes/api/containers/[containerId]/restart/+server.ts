import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { restartContainer } from '$lib/services/docker/container-service';

/**
 * The POST request handler restarts a container based on the provided containerId and returns a
 * success message or an error message if the restart fails.
 * @param  - The code snippet you provided is a TypeScript function that handles a POST request. It
 * takes a `containerId` from the request parameters, attempts to restart a container with that ID
 * using the `restartContainer` function, and then returns a success message if the restart is
 * successful. If an error occurs during
 * @returns The code snippet is defining a POST request handler function that restarts a container
 * based on the provided `containerId`. If the container restart is successful, it returns a JSON
 * response with a success message. If an error occurs during the restart process, it logs the error
 * and returns a JSON response indicating the failure along with an error message.
 */
export const POST: RequestHandler = async ({ params }) => {
	const containerId = params.containerId;

	try {
		await restartContainer(containerId);
		return json({
			success: true,
			message: `Container restarted successfully`
		});
	} catch (error: any) {
		console.error(`API Error restarting container ${containerId}:`, error);
		return json(
			{
				success: false,
				error: error.message || 'Failed to restart container'
			},
			{ status: 500 }
		);
	}
};
