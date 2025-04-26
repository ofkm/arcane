import type { PageServerLoad } from './$types';
import { listVolumes, isVolumeInUse } from '$lib/services/docker/volume-service';
import type { ServiceVolume } from '$lib/types/docker';

// Enhanced type with usage info
type EnhancedVolumeInfo = ServiceVolume & {
	inUse: boolean;
};

type VolumePageData = {
	volumes: EnhancedVolumeInfo[];
	error?: string;
};

export const load: PageServerLoad = async (): Promise<VolumePageData> => {
	try {
		const volumes = await listVolumes();

		// Enhance volumes with usage information
		const enhancedVolumes = await Promise.all(
			volumes.map(async (volume): Promise<EnhancedVolumeInfo> => {
				const inUse = await isVolumeInUse(volume.name);
				return {
					...volume,
					inUse
				};
			})
		);

		return {
			volumes: enhancedVolumes
		};
	} catch (err: any) {
		console.error('Failed to load volumes:', err);
		return {
			volumes: [],
			error: err.message || 'Failed to connect to Docker or list volumes.'
		};
	}
};
