import type { PageServerLoad, Actions } from './$types';
import { getVolume, removeVolume, isVolumeInUse } from '$lib/services/docker/volume-service';
import { error, fail, redirect } from '@sveltejs/kit';
import { NotFoundError, ConflictError, DockerApiError } from '$lib/types/errors';

export const load: PageServerLoad = async ({ params }) => {
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

export const actions: Actions = {
	remove: async ({ params, url }) => {
		const volumeName = params.volumeName;
		const force = url.searchParams.get('force') === 'true';
		try {
			await removeVolume(volumeName, force);
			redirect(303, '/volumes');
		} catch (err: unknown) {
			if (err instanceof NotFoundError || err instanceof ConflictError || err instanceof DockerApiError) {
				return fail(err.status || 500, { error: err.message });
			}
			const message = err instanceof Error ? err.message : 'An unexpected error occurred during removal.';
			return fail(500, { error: message });
		}
	}
};
