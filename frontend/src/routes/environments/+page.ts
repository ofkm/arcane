import type { PageLoad } from './$types';
import { environmentManagementAPI } from '$lib/services/api';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';

export const load: PageLoad = async () => {
	const environmentRequestOptions: SearchPaginationSortRequest = {
		pagination: {
			page: 1,
			limit: 20
		},
		sort: {
			column: 'timestamp',
			direction: 'desc' as const
		}
	};

	const environments = await environmentManagementAPI.getEnvironments(environmentRequestOptions);

	return { environments, environmentRequestOptions };
};
