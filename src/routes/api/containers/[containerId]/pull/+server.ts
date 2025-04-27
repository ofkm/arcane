import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getContainer } from '$lib/services/docker/container-service';
import { pullImage } from '$lib/services/docker/image-service';

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
