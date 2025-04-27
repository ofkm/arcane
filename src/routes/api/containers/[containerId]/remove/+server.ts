import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { removeContainer } from '$lib/services/docker/container-service';

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
			{ status: 500 }
		);
	}
};
