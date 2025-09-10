import { environmentAPI } from '$lib/services/api';
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
	};

	const containers = await environmentAPI.getContainers(containerRequestOptions);
	const runningContainers = await environmentAPI.getRunningContainers();

	return { containers, runningContainers, containerRequestOptions };
};
