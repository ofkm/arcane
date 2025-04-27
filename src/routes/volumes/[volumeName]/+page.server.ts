import type { PageServerLoad, Actions } from './$types';
import { getVolume, removeVolume, isVolumeInUse } from '$lib/services/docker/volume-service'; // #file:/Users/kylemendell/dev/ofkm/arcane/src/lib/services/docker/volume-service.ts
import { error, fail, redirect } from '@sveltejs/kit';
import { NotFoundError, ConflictError, DockerApiError } from '$lib/types/errors'; // #file:/Users/kylemendell/dev/ofkm/arcane/src/lib/types/errors.ts

export const load: PageServerLoad = async ({ params }) => {
	const volumeName = params.volumeName;

	try {
		// Fetch volume details and check if it's in use in parallel
		const [volume, inUse] = await Promise.all([
			getVolume(volumeName),
			isVolumeInUse(volumeName).catch((err) => {
				console.error(`Failed to check if volume ${volumeName} is in use:`, err);
				return true; // Assume in use if check fails, for safety
			})
		]);

		return {
			volume,
			inUse // Pass the in-use status to the page
		};
	} catch (err: any) {
		console.error(`Failed to load volume ${volumeName}:`, err);
		if (err instanceof NotFoundError) {
			error(404, { message: err.message });
		} else {
			error(err.status || 500, {
				message: err.message || `Failed to load volume details for "${volumeName}".`
			});
		}
	}
};

// Add action for removing the volume from its details page
export const actions: Actions = {
	remove: async ({ params, url }) => {
		const volumeName = params.volumeName;
		const force = url.searchParams.get('force') === 'true';
		try {
			await removeVolume(volumeName, force);
			// Redirect back to the main volumes list after successful removal
			redirect(303, '/volumes');
		} catch (err: any) {
			// Handle specific errors from removeVolume
			if (err instanceof NotFoundError || err instanceof ConflictError || err instanceof DockerApiError) {
				return fail(err.status || 500, { error: err.message });
			}
			// Fallback for unexpected errors
			return fail(500, { error: err.message || 'An unexpected error occurred during removal.' });
		}
	}
};
