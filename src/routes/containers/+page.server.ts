import { fail } from '@sveltejs/kit';
import { listContainers, createContainer } from '$lib/services/docker/container-service';
import { listImages } from '$lib/services/docker/image-service';
import { listNetworks } from '$lib/services/docker/network-service';
import { listVolumes } from '$lib/services/docker/volume-service';
import type { PageServerLoad, Actions } from './$types';
import type { ContainerConfig } from '$lib/types/docker';

export const load: PageServerLoad = async () => {
	try {
		// This is always executed server-side for SSR
		const [containers, volumes, networks, images] = await Promise.all([listContainers(true), listVolumes(), listNetworks(), listImages()]);

		return {
			containers,
			volumes,
			networks,
			images
		};
	} catch (error: any) {
		console.error('Error loading container data:', error);
		return {
			containers: [],
			volumes: [],
			networks: [],
			images: [],
			error: error.message
		};
	}
};
