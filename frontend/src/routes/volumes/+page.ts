import { environmentAPI } from '$lib/services/api';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const volumeRequestOptions: SearchPaginationSortRequest = {
		pagination: {
			page: 1,
			limit: 20
		},
		sort: {
			column: 'name',
			direction: 'asc' as const
		}
	};

	const volumes = await environmentAPI.getVolumes(volumeRequestOptions);
	const volumeUsageCounts = await environmentAPI.getVolumeUsageCounts();

	return { volumes, volumeRequestOptions, volumeUsageCounts };
};
