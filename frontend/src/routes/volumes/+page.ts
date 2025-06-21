import { environmentAPI } from '$lib/services/api';
import type { PageLoad } from './$types';
import type { VolumeInspectInfo } from 'dockerode';

type EnhancedVolumeInfo = VolumeInspectInfo & {
	inUse: boolean;
	CreatedAt: string;
};

type VolumePageData = {
	volumes: EnhancedVolumeInfo[];
	error?: string;
};

export const load: PageLoad = async (): Promise<VolumePageData> => {
	try {
		const volumesData = await environmentAPI.getVolumes();
		const volumes = Array.isArray(volumesData) ? volumesData : [];

		const enhancedVolumes = await Promise.all(
			volumes.map(async (volume): Promise<EnhancedVolumeInfo> => {
				const inUse = await environmentAPI.getVolumeUsage(volume.Name);

				return {
					...volume,
					inUse: inUse.data ? inUse.data.inUse : false
				};
			})
		);

		return {
			volumes: enhancedVolumes
		};
	} catch (err: unknown) {
		console.error('Failed to load volumes:', err);
		const message = err instanceof Error ? err.message : 'Failed to connect to Docker or list volumes.';
		return {
			volumes: [],
			error: message
		};
	}
};
