import type { PageServerLoad } from './$types';
import { listContainers } from '$lib/services/docker/container-service';
import { getDockerInfo } from '$lib/services/docker/core';
import { listImages } from '$lib/services/docker/image-service';
import { getSettings } from '$lib/services/settings-service';
import type { ServiceContainer, ServiceImage } from '$lib/types/docker';

type DockerInfoType = Awaited<ReturnType<typeof getDockerInfo>>;
type SettingsType = NonNullable<Awaited<ReturnType<typeof getSettings>>>;

// Update DashboardData type
type DashboardData = {
	dockerInfo: DockerInfoType | null;
	containers: ServiceContainer[];
	images: ServiceImage[];
	settings: Pick<SettingsType, 'pruneMode'> | null;
	error?: string;
};

export const load: PageServerLoad = async (): Promise<DashboardData> => {
	try {
		// Fetch all data concurrently, including settings
		const [dockerInfo, containers, images, settings] = await Promise.all([
			getDockerInfo().catch((e) => {
				console.error('Dashboard: Failed to get Docker info:', e.message);
				return null;
			}),
			listContainers(true).catch((e) => {
				// Ensure options object if needed
				console.error('Dashboard: Failed to list containers:', e.message);
				return [];
			}),
			listImages().catch((e) => {
				console.error('Dashboard: Failed to list images:', e.message);
				return [];
			}),
			getSettings().catch((e) => {
				// Fetch settings
				console.error('Dashboard: Failed to get settings:', e.message);
				return null; // Handle settings fetch error
			})
		]);

		// Check if the primary connection failed
		if (!dockerInfo) {
			return {
				dockerInfo: null,
				containers: [],
				images: [],
				settings: settings ? { pruneMode: settings.pruneMode } : null, // Still return settings if available
				error: 'Failed to connect to Docker Engine. Please check settings and ensure Docker is running.'
			};
		}

		return {
			dockerInfo,
			containers,
			images,
			settings: settings ? { pruneMode: settings.pruneMode } : null // Pass only pruneMode
		};
	} catch (err: any) {
		console.error('Dashboard: Unexpected error loading data:', err);
		return {
			dockerInfo: null,
			containers: [],
			images: [],
			settings: null,
			error: err.message || 'An unexpected error occurred while loading dashboard data.'
		};
	}
};
