import { environmentAPI } from '$lib/services/api';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    const stackRequestOptions: SearchPaginationSortRequest = {
        pagination: {
            page: 1,
            limit: 20
        },
        sort: {
            column: 'created_at',
            direction: 'desc' as const
        }
    };

    const stacks = await environmentAPI.getStacks(
        stackRequestOptions.pagination,
        stackRequestOptions.sort,
        stackRequestOptions.search,
        stackRequestOptions.filters
    );

    return { stacks, stackRequestOptions };
};