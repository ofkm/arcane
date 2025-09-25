import { containerRegistryService } from '$lib/services/container-registry-service';
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

	const registries = await containerRegistryService.getRegistries(registryRequestOptions);

	return { registries, registryRequestOptions };
};
