import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createVolume } from '$lib/services/docker/volume-service';
import type { VolumeCreateOptions } from 'dockerode';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
			return json({ error: 'Volume name is required.' }, { status: 400 });
		}

		const options: VolumeCreateOptions = {
			Name: body.name.trim(),
			Driver: body.driver || 'local',
			Labels: body.labels || {},
			DriverOpts: body.driverOpts || {}
		};

		const volumeInfo = await createVolume(options);

		return json(
			{
				success: true,
				volume: {
					...volumeInfo,
					Name: body.name.trim() // Ensure Name is set correctly
				}
			},
			{ status: 201 }
		);
	} catch (error: any) {
		console.error('API Error creating volume:', error);
		return json({ error: `Failed to create volume: ${error.message || 'Unknown error'}` }, { status: 500 });
	}
};
