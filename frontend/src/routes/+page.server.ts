import type { PageServerLoad } from './$types';
import { listContainers } from '$lib/services/docker/container-service';
import { getDockerInfo } from '$lib/services/docker/core';
import { isImageInUse, listImages, checkImageMaturity } from '$lib/services/docker/image-service';
import { getSettings } from '$lib/services/settings-service';
import { imageMaturityDb } from '$lib/services/database/image-maturity-db-service';
import type { EnhancedImageInfo, ServiceImage } from '$lib/types/docker';
import type { ContainerInfo } from 'dockerode';

type DockerInfoType = Awaited<ReturnType<typeof getDockerInfo>>;
type SettingsType = NonNullable<Awaited<ReturnType<typeof getSettings>>>;

type DashboardData = {
	dockerInfo: DockerInfoType | null;
	containers: ContainerInfo[];
	images: EnhancedImageInfo[];
	settings: Pick<SettingsType, 'pruneMode'> | null;
	error?: string;
};

export const load: PageServerLoad = async (): Promise<DashboardData> => {
	try {
		const [dockerInfo, containersData, imagesData, settings] = await Promise.all([
			getDockerInfo().catch((e) => {
				console.error('Dashboard: Failed to get Docker info:', e.message);
				return null;
			}),
			listContainers(true).catch((e) => {
				console.error('Dashboard: Failed to list containers:', e.message);
				return [] as ContainerInfo[];
			}),
			listImages().catch((e) => {
				console.error('Dashboard: Failed to list images:', e.message);
				return [] as ServiceImage[];
			}),
			getSettings().catch((e) => {
				console.error('Dashboard: Failed to get settings:', e.message);
				return null;
			})
		]);

		const enhancedImages = await Promise.all(
			imagesData.map(async (image): Promise<EnhancedImageInfo> => {
				const inUse = await isImageInUse(image.Id);

				const record = await imageMaturityDb.getImageMaturity(image.Id);
				let maturity = record ? imageMaturityDb.recordToImageMaturity(record) : undefined;

				if (maturity === undefined) {
					try {
						if (image.repo !== '<none>' && image.tag !== '<none>') {
							maturity = await checkImageMaturity(image.Id);
						}
					} catch (maturityError) {
						console.error(`Dashboard: Failed to check maturity for image ${image.Id}:`, maturityError);
						maturity = undefined;
					}
				}

				return {
					...image,
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
