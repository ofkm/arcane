import type { PageServerLoad } from './$types';
import { getImage } from '$lib/services/docker/image-service';
import { error } from '@sveltejs/kit';
import { NotFoundError } from '$lib/types/errors';

export const load: PageServerLoad = async ({ params }) => {
	const imageId = params.imageId;

	try {
		const image = await getImage(imageId);

		return {
			image
		};
	} catch (err: any) {
		console.error(`Failed to load image ${imageId}:`, err);
		if (err instanceof NotFoundError) {
			error(404, { message: err.message });
		} else {
			error(err.status || 500, {
				message: err.message || `Failed to load image details for "${imageId}".`
			});
		}
	}
};
