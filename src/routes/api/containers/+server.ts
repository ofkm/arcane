import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createContainer } from '$lib/services/docker/container-service';
import type { ContainerConfig } from '$lib/types/docker';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const config = (await request.json()) as ContainerConfig;

		if (!config.name || !config.image) {
			return json({ success: false, error: 'Container name and image are required' }, { status: 400 });
		}

		const container = await createContainer(config);

		return json({
			success: true,
			container
		});
	} catch (error: any) {
		console.error('Error creating container:', error);
		return json(
			{
				success: false,
				error: error.message || 'Failed to create container'
			},
			{ status: 500 }
		);
	}
};
