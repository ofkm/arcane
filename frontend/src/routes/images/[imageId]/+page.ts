import type { PageLoad } from './$types';
import { imageAPI } from '$lib/services/api';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
	const imageId = params.imageId;

	try {
		const image = await imageAPI.get(imageId);

		return {
			image
		};
	} catch (err: any) {
		console.error(`Failed to load image ${imageId}:`, err);

		// Handle API errors
		if (err.status === 404 || err.name === 'NotFoundError') {
			error(404, {
				message: err.message || `Image with ID "${imageId}" not found.`
			});
		} else {
			error(err.status || 500, {
				message: err.message || `Failed to load image details for "${imageId}".`
			});
		}
	}
};
