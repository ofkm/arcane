import { systemAPI, settingsAPI, environmentAPI } from '$lib/services/api';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    const containerRequestOptions: SearchPaginationSortRequest = {
            pagination: {
                page: 1,
                limit: 5
            },
            sort: {
                column: 'created',
                direction: 'desc' as const
            }
        },
        imageRequestOptions: SearchPaginationSortRequest = {
            pagination: {
                page: 1,
                limit: 5
            },
            sort: {
                column: 'Created',
                direction: 'desc' as const
            }
        };

    try {
        const [dockerInfoResult, containersResult, imagesResult, settingsResult] =
            await Promise.allSettled([
                systemAPI.getDockerInfo(),
                environmentAPI.getContainers(
                    containerRequestOptions.pagination,
                    containerRequestOptions.sort,
                    containerRequestOptions.search,
                    containerRequestOptions.filters
                ),
                environmentAPI.getImages(
                    imageRequestOptions.pagination,
                    imageRequestOptions.sort,
                    imageRequestOptions.search,
                    imageRequestOptions.filters
                ),
                settingsAPI.getSettings()
            ]);

        const dockerInfo = dockerInfoResult.status === 'fulfilled' ? dockerInfoResult.value : null;
        const containers = containersResult.status === 'fulfilled' ? containersResult.value : [];
        const images = imagesResult.status === 'fulfilled' ? imagesResult.value : [];
        const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;

        return {
            dockerInfo,
            containers,
            images,
            settings,
            containerRequestOptions,
            imageRequestOptions
        };
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        return {
            dockerInfo: null,
            containers: [],
            images: [],
            settings: null,
            containerRequestOptions,
            imageRequestOptions,
            error: error instanceof Error ? error.message : String(error)
        };
    }
};
