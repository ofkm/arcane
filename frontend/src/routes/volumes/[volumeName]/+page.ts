import type { PageLoad } from './$types';
import { environmentAPI } from '$lib/services/api';
import { error } from '@sveltejs/kit';
import type { VolumeUsageDto } from '$lib/types/volume.type';

export const load: PageLoad = async ({ params }) => {
	const { volumeName } = params;

	try {
		const volumeBase = await environmentAPI.getVolume(volumeName);
		const usageRes = await environmentAPI.getVolumeUsage(volumeName);

		const usage: VolumeUsageDto = (
			usageRes && typeof usageRes === 'object' && 'data' in usageRes ? (usageRes as any).data : usageRes
		) as VolumeUsageDto;

		const volume = {
			...volumeBase,
			containers: Array.isArray(usage?.containers) ? usage.containers : []
		};

		let containersDetailed: { id: string; name: string }[] = [];
		if (volume.containers.length > 0) {
			containersDetailed = await Promise.all(
				volume.containers.map(async (id: string) => {
					try {
						const c = await environmentAPI.getContainer(id);
						const idVal = (c?.id || c?.Id || id) as string;
						const nameVal = (c?.name ||
							c?.Name ||
							(c?.Names && c?.Names[0]?.replace?.(/^\//, '')) ||
							idVal?.substring(0, 12)) as string;
						return { id: idVal, name: nameVal };
					} catch {
						return { id, name: id.substring(0, 12) };
					}
				})
			);
		}

		return {
			volume,
			containersDetailed
		};
	} catch (err: any) {
		console.error('Failed to load volume:', err);
		if (err.status === 404) throw err;
		throw error(500, err.message || 'Failed to load volume details');
	}
};
