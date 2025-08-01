import { eventAPI } from '$lib/services/api';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const eventRequestOptions: SearchPaginationSortRequest = {
		pagination: {
			page: 1,
			limit: 20
		},
		sort: {
			column: 'timestamp',
			direction: 'desc' as const
		}
	};

	const events = await eventAPI.listPaginated(
		eventRequestOptions.pagination,
		eventRequestOptions.sort,
		eventRequestOptions.search,
		eventRequestOptions.filters
	);

	return { events, eventRequestOptions };
};
