import { listContainersWithPagination } from '$lib/services/docker/container-service';
import { listImages } from '$lib/services/docker/image-service';
import { listNetworks } from '$lib/services/docker/network-service';
import { listVolumes } from '$lib/services/docker/volume-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	try {
		// Get pagination parameters from URL
		const page = parseInt(url.searchParams.get('page') || '1');
		const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
		const stateFilter = url.searchParams.get('state') || undefined;
		const nameFilter = url.searchParams.get('name') || undefined;

		// Get paginated containers and other resources
		const [containerData, volumes, networks, images] = await Promise.all([
			listContainersWithPagination(page, pageSize, {
				state: stateFilter,
				name: nameFilter
			}),
			listVolumes(),
			listNetworks(),
			listImages()
		]);

		return {
			containers: containerData.containers,
			totalContainers: containerData.total,
			pagination: {
				currentPage: page,
				pageSize,
				totalPages: containerData.totalPages
			},
			volumes,
			networks,
			images
		};
	} catch (error) {
		console.error('Error loading container data:', error);
		return {
			containers: [],
			totalContainers: 0,
			pagination: {
				currentPage: 1,
				pageSize: 25,
				totalPages: 0
			},
			volumes: [],
			networks: [],
			images: [],
			error: error instanceof Error ? error.message : String(error)
		};
	}
};
