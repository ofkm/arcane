import { systemAPI, settingsAPI, environmentAPI } from '$lib/services/api';

export const load = async () => {
	// try {
	// 	const [dockerInfoResult, containersResult, imagesResult, settingsResult] =
	// 		await Promise.allSettled([
	// 			systemAPI.getDockerInfo(),
	// 			environmentAPI.getContainers(),
	// 			environmentAPI.getImages(),
	// 			settingsAPI.getSettings()
	// 		]);
	// 	const dockerInfo = dockerInfoResult.status === 'fulfilled' ? dockerInfoResult.value : null;
	// 	const containers = containersResult.status === 'fulfilled' ? containersResult.value : [];
	// 	const images = imagesResult.status === 'fulfilled' ? imagesResult.value : [];
	// 	const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
	// 	return {
	// 		dockerInfo,
	// 		containers,
	// 		images,
	// 		settings
	// 	};
	// } catch (error) {
	// 	console.error('Error loading dashboard data:', error);
	// 	return {
	// 		dockerInfo: null,
	// 		containers: [],
	// 		images: [],
	// 		settings: null,
	// 		error: error instanceof Error ? error.message : String(error)
	// 	};
	// }
};
