import { imageService } from '$lib/services/image-service';
import { settingsService } from '$lib/services/settings-service';
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
	const images = await imageService.getImages(imageRequestOptions);
	const settings = await settingsService.getSettings();
	const imageUsageCounts = await imageService.getImageUsageCounts();

	return { images, imageRequestOptions, settings, imageUsageCounts };
};
