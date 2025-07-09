import { environmentAPI } from '$lib/services/api';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    const networkRequestOptions: SearchPaginationSortRequest = {
        pagination: {
            page: 1,
            limit: 20
        },
        sort: {
            column: 'Name',
            direction: 'asc' as const
        }
    };

    const networks = await environmentAPI.getNetworks(
        networkRequestOptions.pagination,
        networkRequestOptions.sort,
        networkRequestOptions.search,
        networkRequestOptions.filters
    );

    return { networks, networkRequestOptions };
};