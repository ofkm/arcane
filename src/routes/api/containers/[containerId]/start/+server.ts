import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { startContainer } from '$lib/services/docker/container-service';

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
