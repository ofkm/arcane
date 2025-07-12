import { containerRegistryAPI } from '$lib/services/api';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    const registryRequestOptions: SearchPaginationSortRequest = {
        pagination: {
            page: 1,
            limit: 20
        },
        sort: {
            column: 'url',
            direction: 'asc' as const
        }
    };

    const registries = await containerRegistryAPI.getRegistries(
        registryRequestOptions.pagination,
        registryRequestOptions.sort,
        registryRequestOptions.search,
        registryRequestOptions.filters
    );

    return { registries, registryRequestOptions };
};
