import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createVolume } from '$lib/services/docker/volume-service';
import type { VolumeCreateOptions } from 'dockerode';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: VolumeCreateOptions = await request.json();

		if (!body.Name) {
			return json({ error: 'Volume name is required.' }, { status: 409 });
		}

		const volumeInfo = await createVolume(body);

		return json(
			{
				success: true,
				volume: {
					...volumeInfo,
					Name: volumeInfo.name
				}
			},
			{ status: 201 }
		);
	} catch (error: any) {
		console.error('API Error creating volume:', error);
		return json({ error: `Failed to create volume: ${error.message || 'Unknown error'}` }, { status: 500 });
	}
};
