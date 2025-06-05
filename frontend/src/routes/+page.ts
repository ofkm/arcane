import type { PageLoad } from './$types';
import { containerAPI, imageAPI, systemAPI, settingsAPI } from '$lib/services/api';
import type { EnhancedImageInfo } from '$lib/types/docker';
import type { ContainerInfo } from 'dockerode';
import type { Settings } from '$lib/types/settings.type';

// Define the type for images returned from the API
type APIImageInfo = {
	Id: string;
	repo: string;
	tag: string;
	size: number;
	created: string;
	// Add other properties that your API returns for images
};

type DockerInfoType = Awaited<ReturnType<typeof systemAPI.getDockerInfo>>;

type DashboardData = {
	dockerInfo: DockerInfoType | null;
	containers: ContainerInfo[];
	images: EnhancedImageInfo[];
	settings: Pick<Settings, 'pruneMode'> | null;
	error?: string;
};

export const load: PageLoad = async (): Promise<DashboardData> => {
	try {
		const [dockerInfo, containersData, imagesData, settings] = await Promise.all([
			systemAPI.getDockerInfo().catch((e) => {
				console.error('Dashboard: Failed to get Docker info:', e.message);
				return null;
			}),
			containerAPI.list(true).catch((e): ContainerInfo[] => {
				console.error('Dashboard: Failed to list containers:', e.message);
				return [] as ContainerInfo[];
			}) as Promise<ContainerInfo[]>,
			imageAPI.list().catch((e): APIImageInfo[] => {
				console.error('Dashboard: Failed to list images:', e.message);
				return [] as APIImageInfo[];
			}),
			settingsAPI.getSettings().catch((e) => {
				console.error('Dashboard: Failed to get settings:', e.message);
				return null;
			})
		]);

		const enhancedImages = await Promise.all(
			imagesData.map(async (image: APIImageInfo): Promise<EnhancedImageInfo> => {
				// Check if image is in use via API
				const inUse = await containerAPI.isImageInUse(image.Id).catch(() => false);

				// Get maturity data from API instead of database
				let maturity = undefined;
				try {
					maturity = await imageAPI.checkMaturity(image.Id);
				} catch (maturityError) {
					// If maturity check fails, try to get existing data
					console.warn(`Dashboard: Failed to check maturity for image ${image.Id}:`, maturityError);

					// If the image has a valid repo and tag, we might want to trigger a background check
					if (image.repo && image.repo !== '<none>' && image.tag && image.tag !== '<none>') {
						// You could add a background check here if needed
						// This would be non-blocking and update the data for next time
						imageAPI.checkMaturity(image.Id).catch(() => {
							// Silent fail for background operation
						});
					}
					maturity = undefined;
				}

				return {
					...image,
					Id: image.Id,
					RepoTags: [`${image.repo}:${image.tag}`],
					RepoDigests: [],
					ParentId: '', // Provide a default or fetch if available
					Created: Number(image.created),
					Size: image.size,
					SharedSize: 0,
					VirtualSize: image.size,
					Labels: {},
					Containers: 0,
					inUse,
					maturity
				};
			})
		);

		if (!dockerInfo) {
			return {
				dockerInfo: null,
				containers: [] as ContainerInfo[],
				images: enhancedImages,
				settings: settings ? { pruneMode: settings.pruneMode } : null,
				error: 'Failed to connect to Docker Engine. Please check settings and ensure Docker is running.'
			};
		}

		return {
			dockerInfo,
			containers: containersData,
			images: enhancedImages,
			settings: settings ? { pruneMode: settings.pruneMode } : null
		};
	} catch (err: any) {
		console.error('Dashboard: Unexpected error loading data:', err);
		return {
			dockerInfo: null,
			containers: [] as ContainerInfo[],
			images: [], // Return empty EnhancedImageInfo array on error
			settings: null,
			error: err.message || 'An unexpected error occurred while loading dashboard data.'
		};
	}
};
