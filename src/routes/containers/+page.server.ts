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

export const actions: Actions = {
	create: async ({ request }) => {
		try {
			const formData = await request.formData();
			const containerDataString = formData.get('containerData');

			if (!containerDataString) {
				return fail(400, {
					success: false,
					error: 'No container data provided'
				});
			}

			const containerData = JSON.parse(containerDataString.toString()) as ContainerConfig;

			// Validate required fields
			if (!containerData.name || !containerData.image) {
				return fail(400, {
					success: false,
					error: 'Container name and image are required'
				});
			}

			// Create the container
			const container = await createContainer(containerData);

			return {
				success: true,
				container
			};
		} catch (error: any) {
			console.error('Error creating container:', error);
			return fail(500, {
				success: false,
				error: error.message || 'Failed to create container'
			});
		}
	}
};
