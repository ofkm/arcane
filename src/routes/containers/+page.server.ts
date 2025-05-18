import { listContainersWithPagination } from '$lib/services/docker/container-service';
import { listImagesWithPagination } from '$lib/services/docker/image-service';
import { listNetworksWithPagination } from '$lib/services/docker/network-service'; // Import paginated version
import { listVolumesWithPagination } from '$lib/services/docker/volume-service'; // Import paginated version
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	try {
		// Get pagination parameters from URL
		const page = parseInt(url.searchParams.get('page') || '1');
		const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
		const stateFilter = url.searchParams.get('state') || undefined;
		const nameFilter = url.searchParams.get('name') || undefined;
		const driverFilter = url.searchParams.get('driver') || undefined;

		const [containerData, volumeData, networkData, imageData] = await Promise.all([
			listContainersWithPagination(page, pageSize, {
				state: stateFilter,
				name: nameFilter
			}),
			listVolumesWithPagination(page, pageSize, {
				name: nameFilter
			}),
			listNetworksWithPagination(page, pageSize, {
				name: nameFilter,
				driver: driverFilter
			}),
			listImagesWithPagination(page, pageSize, {
				name: nameFilter
			})
		]);

		return {
			containers: containerData.containers,
			totalContainers: containerData.total,
			pagination: {
				currentPage: page,
				pageSize,
				totalPages: containerData.totalPages
			},
			volumes: volumeData.volumes,
			totalVolumes: volumeData.total,
			volumePagination: {
				currentPage: page,
				pageSize,
				totalPages: volumeData.totalPages
			},
			networks: networkData.networks,
			totalNetworks: networkData.total,
			networkPagination: {
				currentPage: page,
				pageSize,
				totalPages: networkData.totalPages
			},
			images: imageData.images,
			totalImages: imageData.total,
			imagePagination: {
				currentPage: page,
				pageSize,
				totalPages: imageData.totalPages
			}
		};
	} catch (error) {
		console.error('Error loading data for containers page:', error);
		return {
			containers: [],
			totalContainers: 0,
			pagination: {
				currentPage: 1,
				pageSize: 10,
				totalPages: 0
			},
			volumes: [],
			totalVolumes: 0,
			volumePagination: { currentPage: 1, pageSize: 10, totalPages: 0 },
			networks: [],
			totalNetworks: 0,
			networkPagination: { currentPage: 1, pageSize: 10, totalPages: 0 },
			images: [],
			totalImages: 0,
			imagePagination: { currentPage: 1, pageSize: 10, totalPages: 0 },
			error: error instanceof Error ? error.message : String(error)
		};
	}
};
