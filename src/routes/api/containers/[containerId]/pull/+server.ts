import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getContainer } from '$lib/services/docker/container-service';
import { pullImage } from '$lib/services/docker/image-service';

/**
 * This TypeScript function handles a POST request to pull an image associated with a container and
 * returns success or error messages accordingly.
 * @param  - The code snippet you provided is a TypeScript function that handles a POST request. It
 * takes a containerId from the request parameters, retrieves the container information using the
 * containerId, extracts the image name from the container, and then pulls the image. If successful, it
 * returns a success message with the pulled image
 * @returns The code snippet is an asynchronous function that handles a POST request. It attempts to
 * pull an image associated with a container identified by `containerId`. Here is what is being
 * returned based on the execution flow:
 */
export const POST: RequestHandler = async ({ params }) => {
	const containerId = params.containerId;

	try {
		// Get the container to find its image
		const container = await getContainer(containerId);
		if (!container) {
			return json(
				{
					success: false,
					error: `Container not found`
				},
				{ status: 404 }
			);
		}

		// Extract the image name
		const imageName = container.image;

		// Pull the image
		await pullImage(imageName);

		return json({
			success: true,
			message: `Container image ${imageName} pulled successfully`
		});
	} catch (error: any) {
		console.error(`API Error pulling container image for ${containerId}:`, error);
		return json(
			{
				success: false,
				error: error.message || 'Failed to pull container image'
			},
			{ status: 500 }
		);
	}
};
