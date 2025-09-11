import { environmentAPI, settingsAPI } from '$lib/services/api';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const imageRequestOptions: SearchPaginationSortRequest = {
		pagination: {
			page: 1,
			limit: 20
		},
		sort: {
			column: 'created',
			direction: 'desc' as const
		}
	};
	const images = await environmentAPI.getImages(imageRequestOptions);
	const settings = await settingsAPI.getSettings();
	const imageUsageCounts = await environmentAPI.getImageUsageCounts();

	return { images, imageRequestOptions, settings, imageUsageCounts };
};
