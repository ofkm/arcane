import { environmentAPI } from '$lib/services/api';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    const imageRequestOptions: SearchPaginationSortRequest = {
        pagination: {
            page: 1,
            limit: 20
        },
        sort: {
            column: 'Created',
            direction: 'desc' as const
        }
    };

    const images = await environmentAPI.getImages(
        imageRequestOptions.pagination,
        imageRequestOptions.sort,
        imageRequestOptions.search,
        imageRequestOptions.filters
    );

    return { images, imageRequestOptions };
};