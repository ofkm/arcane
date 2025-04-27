import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { restartContainer } from '$lib/services/docker/container-service';

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
