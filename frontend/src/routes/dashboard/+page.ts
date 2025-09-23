import { settingsAPI, environmentAPI } from '$lib/services/api';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const containerRequestOptions: SearchPaginationSortRequest = {
			pagination: {
				page: 1,
				limit: 5
			},
			sort: {
				column: 'created',
				direction: 'desc' as const
			}
		},
		imageRequestOptions: SearchPaginationSortRequest = {
			pagination: {
				page: 1,
				limit: 5
			},
			sort: {
				column: 'size',
				direction: 'desc' as const
			}
		};

	const containers = await environmentAPI.getContainers(containerRequestOptions);
	const images = await environmentAPI.getImages(imageRequestOptions);
	const containerStatusCounts = await environmentAPI.getContainerStatusCounts();

	const [dockerInfoResult, settingsResult] = await Promise.allSettled([
		environmentAPI.getDockerInfo(),
		settingsAPI.getSettings()
	]);

	const dockerInfo = dockerInfoResult.status === 'fulfilled' ? dockerInfoResult.value : null;
	const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;

	return {
		dockerInfo,
		containers,
		images,
		settings,
		containerRequestOptions,
		imageRequestOptions,
		containerStatusCounts
	};
};
