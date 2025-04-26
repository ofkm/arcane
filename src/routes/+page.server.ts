import type { PageServerLoad } from './$types';
import { listContainers } from '$lib/services/docker/container-service';
import { getDockerInfo } from '$lib/services/docker/core';
import { listImages } from '$lib/services/docker/image-service';
import type { ServiceContainer, ServiceImage } from '$lib/types/docker';

// Infer the Docker Info type from the return type of getDockerInfo
type DockerInfoType = Awaited<ReturnType<typeof getDockerInfo>>;

// Define a type for the combined data using the inferred type
type DashboardData = {
	dockerInfo: DockerInfoType | null; // Use the inferred type
	containers: ServiceContainer[];
	images: ServiceImage[];
	error?: string;
};

export const load: PageServerLoad = async (): Promise<DashboardData> => {
	try {
		// Fetch all data concurrently
		const [dockerInfo, containers, images] = await Promise.all([
			getDockerInfo().catch((e) => {
				console.error('Dashboard: Failed to get Docker info:', e.message);
				return null; // Return null on error for this specific piece
			}),
			listContainers(true).catch((e) => {
				console.error('Dashboard: Failed to list containers:', e.message);
				return []; // Return empty array on error
			}),
			listImages().catch((e) => {
				console.error('Dashboard: Failed to list images:', e.message);
				return []; // Return empty array on error
			})
		]);

		// Check if the primary connection failed
		if (!dockerInfo) {
			return {
				dockerInfo: null,
				containers: [],
				images: [],
				error: 'Failed to connect to Docker Engine. Please check settings and ensure Docker is running.'
			};
		}

		return {
			dockerInfo,
			containers,
			images
		};
	} catch (err: any) {
		// Catch any unexpected errors during Promise.all or processing
		console.error('Dashboard: Unexpected error loading data:', err);
		return {
			dockerInfo: null,
			containers: [],
			images: [],
			error: err.message || 'An unexpected error occurred while loading dashboard data.'
		};
	}
};
