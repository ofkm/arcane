import type { PageLoad } from './$types';
import { volumeAPI } from '$lib/services/api';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
	const volumeName = params.volumeName;

	try {
		const [volume, inUse] = await Promise.all([
			volumeAPI.get(volumeName),
			volumeAPI.isInUse(volumeName).catch((err: unknown) => {
				console.error(`Failed to check if volume ${volumeName} is in use:`, err);
				return true; // Default to true for safety
			})
		]);

		return {
			volume,
			inUse
		};
	} catch (err: any) {
		console.error(`Failed to load volume ${volumeName}:`, err);

		// Handle API errors
		if (err.status === 404 || err.name === 'NotFoundError') {
			error(404, {
				message: err.message || `Volume with name "${volumeName}" not found.`
			});
		} else {
			error(err.status || 500, {
				message: err.message || `Failed to load volume details for "${volumeName}".`
			});
		}
	}
};
