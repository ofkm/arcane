import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { stopContainer } from '$lib/services/docker/container-service';

export const POST: RequestHandler = async ({ params }) => {
	const containerId = params.containerId;

	try {
		await stopContainer(containerId);
		return json({
			success: true,
			message: `Container stopped successfully`
		});
	} catch (error: any) {
		console.error(`API Error stopping container ${containerId}:`, error);
		return json(
			{
				success: false,
				error: error.message || 'Failed to stop container'
			},
			{ status: 500 }
		);
	}
};
