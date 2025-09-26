import { eventService } from '$lib/services/event-service';
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

	const events = await eventService.getEvents(eventRequestOptions);

	return { events, eventRequestOptions };
};
