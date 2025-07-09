import type { PageLoad } from './$types';
import { environmentAPI } from '$lib/services/api';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
	const { volumeName } = params;

	try {
		const volume = await environmentAPI.getVolume(volumeName);

		if (!volume) {
			throw error(404, 'Volume not found');
		}
		const inUseResponse = await environmentAPI.getVolumeUsage(volumeName);

		return {
			volume: volume.data,
			inUse: inUseResponse.data ? inUseResponse.data.inUse : false
		};
	} catch (err: any) {
		console.error('Failed to load volume:', err);
		if (err.status === 404) {
			throw err;
		}
		throw error(500, err.message || 'Failed to load volume details');
	}
};
