import type { PageLoad } from './$types';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import { environmentManagementService } from '$lib/services/env-mgmt-service';

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

	const environments = await environmentManagementService.getEnvironments(environmentRequestOptions);

	return { environments, environmentRequestOptions };
};
