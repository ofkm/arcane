import { environmentAPI } from '$lib/services/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const resources = await environmentAPI.getAllResources();

		return {
			containers: resources.containers || [],
			volumes: resources.volumes || [],
			networks: resources.networks || [],
			images: resources.images || []
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
