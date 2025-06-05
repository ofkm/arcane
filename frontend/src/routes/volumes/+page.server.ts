import type { PageServerLoad } from './$types';
import { listVolumes, isVolumeInUse } from '$lib/services/docker/volume-service';
import type { VolumeInspectInfo } from 'dockerode';

type EnhancedVolumeInfo = VolumeInspectInfo & {
	inUse: boolean;
};

type VolumePageData = {
	volumes: EnhancedVolumeInfo[];
	error?: string;
};

export const load: PageServerLoad = async (): Promise<VolumePageData> => {
	try {
		const volumesData = await listVolumes();

		const enhancedVolumes = await Promise.all(
			volumesData.map(async (volume): Promise<EnhancedVolumeInfo> => {
				const inUse = await isVolumeInUse(volume.Name);
				return {
					...volume,
					inUse
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
