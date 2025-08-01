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
			direction: 'asc' as const
		}
	};

	const events = await eventAPI.listPaginated(
		eventRequestOptions.pagination,
		eventRequestOptions.sort,
		eventRequestOptions.filters
	);

	return { events, eventRequestOptions };
};
