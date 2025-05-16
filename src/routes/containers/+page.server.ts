import { listContainers } from '$lib/services/docker/container-service';
import { listImages } from '$lib/services/docker/image-service';
import { listNetworks } from '$lib/services/docker/network-service';
import { listVolumes } from '$lib/services/docker/volume-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const [containers, volumes, networks, images] = await Promise.all([listContainers(true), listVolumes(), listNetworks(), listImages()]);

		return {
			containers,
			volumes,
			networks,
			images
		};
	} catch (error) {
		console.error('Error loading container data:', error);
		return {
			containers: [],
			volumes: [],
			networks: [],
			images: [],
			error: error instanceof Error ? error.message : String(error)
		};
	}
};
