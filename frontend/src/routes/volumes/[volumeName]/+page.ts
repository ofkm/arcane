import type { PageLoad } from './$types';
import { getVolume, removeVolume, isVolumeInUse } from '$lib/services/docker/volume-service';
import { error, fail, redirect } from '@sveltejs/kit';
import { NotFoundError, ConflictError, DockerApiError } from '$lib/types/errors';

export const load: PageLoad = async ({ params }) => {
	const volumeName = params.volumeName;

	try {
		const [volume, inUse] = await Promise.all([
			getVolume(volumeName),
			isVolumeInUse(volumeName).catch((err: unknown) => {
				console.error(`Failed to check if volume ${volumeName} is in use:`, err);
				return true;
			})
		]);

		return {
			volume,
			inUse
		};
	} catch (err: unknown) {
		console.error(`Failed to load volume ${volumeName}:`, err);
		if (err instanceof NotFoundError) {
			error(404, { message: err.message });
		} else if (err instanceof DockerApiError) {
			error(err.status || 500, { message: err.message });
		} else if (err instanceof Error) {
			error(500, { message: err.message || `Failed to load volume details for "${volumeName}".` });
		} else {
			error(500, { message: `An unexpected error occurred while loading volume "${volumeName}".` });
		}
	}
};
