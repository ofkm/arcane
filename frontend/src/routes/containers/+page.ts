import { environmentAPI } from '$lib/services/api';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    const containerRequestOptions: SearchPaginationSortRequest = {
        pagination: {
            page: 1,
            limit: 20
        },
        sort: {
            column: 'created',
            direction: 'desc' as const
        }
    };

    const containers = await environmentAPI.getContainers(
        containerRequestOptions.pagination,
        containerRequestOptions.sort,
        containerRequestOptions.search,
        containerRequestOptions.filters
    );

    return { containers, containerRequestOptions };
};