import { containerAPI, imageAPI, networkAPI, volumeAPI } from '$lib/services/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const [containers, volumes, networks, images] = await Promise.all([
			containerAPI.list(true),
			volumeAPI.list(),
			networkAPI.list(),
			imageAPI.list()
		]);

		return {
			containers,
			volumes,
			networks,
			images
		};
	} catch (error) {
		console.error('Error loading container data:', error);
		return {
			containers: [],
			volumes: [],
			networks: [],
			images: [],
			error: error instanceof Error ? error.message : String(error)
		};
	}
};
