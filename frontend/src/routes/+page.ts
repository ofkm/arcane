import { containerAPI, imageAPI, systemAPI, settingsAPI } from '$lib/services/api';

export const load = async () => {
	try {
		// Remove systemStats from initial load for faster dashboard loading
		const [dockerInfo, containers, images, settings] = await Promise.all([
			systemAPI.getDockerInfo(),
			containerAPI.list(true),
			imageAPI.list(),
			settingsAPI.getSettings()
		]);

		return {
			dockerInfo,
			containers,
			images,
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
