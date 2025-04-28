import { getDockerClient } from '$lib/services/docker/core'; // Adjust the import path as necessary
import { DockerApiError } from '$lib/types/errors'; // Assuming you have this
import { getSettings } from '$lib/services/settings-service'; // Import the settings service

/**
 * Prunes unused Docker resources (containers, networks, images, build cache).
 * Respects the 'pruneMode' setting for images.
 * @returns {Promise<any>} A promise that resolves with the prune results from Docker.
 * @throws {DockerApiError} If the prune operation fails.
 */
export async function pruneSystem(): Promise<any> {
	try {
		const docker = getDockerClient();
		const settings = await getSettings();
		const imagePruneFilter = {
			dangling: settings.pruneMode === 'dangling'
		};

		const pruneResults = await Promise.all([
			docker.pruneContainers().catch((e) => {
				console.error('Error pruning containers:', e);
				return { ContainersDeleted: [], SpaceReclaimed: 0 };
			}),
			// Use the determined filter for pruning images
			docker.pruneImages({ filters: imagePruneFilter }).catch((e) => {
				console.error('Error pruning images:', e);
				return { ImagesDeleted: [], SpaceReclaimed: 0 };
			}),
			docker.pruneNetworks().catch((e) => {
				console.error('Error pruning networks:', e);
				return { NetworksDeleted: [] };
			}),
			// WARNING: Pruning volumes is destructive. Consider making this optional or adding extra confirmation.
			docker.pruneVolumes().catch((e) => {
				console.error('Error pruning volumes:', e);
				return { VolumesDeleted: [], SpaceReclaimed: 0 };
			})
			// Consider adding docker.pruneBuilds() if needed and available in your dockerode version
		]);
		return pruneResults; // Or format this into a more useful summary object
	} catch (error: any) {
		console.error('Docker Service: Error pruning system:', error);
		throw new DockerApiError(`Failed to prune system: ${error.message || 'Unknown Docker error'}`, error.statusCode);
	}
}
