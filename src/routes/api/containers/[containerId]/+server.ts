import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getContainer } from '$lib/services/docker/container-service';

export const GET: RequestHandler = async ({ params }) => {
	const containerId = params.containerId;

	try {
		const container = await getContainer(containerId);

		if (!container) {
			return json({ success: false, error: 'Container not found' }, { status: 404 });
		}

		return json(container);
	} catch (error: any) {
		console.error(`API Error getting container ${containerId}:`, error);
		return json(
			{
				success: false,
				error: error.message || 'Failed to get container information'
			},
			{ status: 500 }
		);
	}
};
