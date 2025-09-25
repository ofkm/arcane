import { settingsAPI } from '$lib/services/api';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import { containerService } from '$lib/services/container-service';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const containerRequestOptions: SearchPaginationSortRequest = {
		pagination: { page: 1, limit: 20 },
		sort: { column: 'created', direction: 'desc' as const }
	};

	const [containers, containerStatusCounts, settings] = await Promise.all([
		containerService.getContainers(containerRequestOptions),
		containerService.getContainerStatusCounts(),
		settingsAPI.getSettings()
	]);

	return { containers, containerStatusCounts, containerRequestOptions, settings };
};
