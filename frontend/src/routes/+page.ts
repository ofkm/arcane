import { systemAPI, settingsAPI, environmentAPI } from '$lib/services/api';

export const load = async () => {
	try {
		const [dockerInfo, resources, settings] = await Promise.all([systemAPI.getDockerInfo(), environmentAPI.getAllResources(), settingsAPI.getSettings()]);

		return {
			dockerInfo,
			containers: resources.containers || [],
			images: resources.images || [],
			settings
		};
	} catch (error) {
		console.error('Error loading dashboard data:', error);
		return {
			dockerInfo: null,
			containers: [],
			images: [],
			settings: null,
			error: error instanceof Error ? error.message : String(error)
		};
	}
};
