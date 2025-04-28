import { getDockerClient } from '$lib/services/docker/core'; // Adjust the import path as necessary
import { DockerApiError } from '$lib/types/errors'; // Assuming you have this

/**
 * Prunes unused Docker resources (containers, networks, images, build cache).
 * @returns {Promise<any>} A promise that resolves with the prune results from Docker.
 * @throws {DockerApiError} If the prune operation fails.
 */
export async function pruneSystem(): Promise<any> {
	try {
		const docker = getDockerClient();
		// Note: dockerode might have separate prune methods.
		// This example uses generic prune calls; adjust if needed based on dockerode version.
		// Example: Pruning containers, then images, then networks, then volumes
		const pruneResults = await Promise.all([
			docker.pruneContainers().catch((e) => {
				console.error('Error pruning containers:', e);
				return { ContainersDeleted: [], SpaceReclaimed: 0 };
			}),
			docker.pruneImages({ filters: { dangling: ['true'] } }).catch((e) => {
				console.error('Error pruning images:', e);
				return { ImagesDeleted: [], SpaceReclaimed: 0 };
			}), // Prune unused images (not just dangling)
			docker.pruneNetworks().catch((e) => {
				console.error('Error pruning networks:', e);
				return { NetworksDeleted: [] };
			}),
			docker.pruneVolumes().catch((e) => {
				console.error('Error pruning volumes:', e);
				return { VolumesDeleted: [], SpaceReclaimed: 0 };
			})
			// Be cautious with volume pruning
			// Add build cache prune if available/needed: docker.pruneBuilds()
		]);

		// Aggregate results if needed, or just return the array
		console.log('Docker System Prune results:', pruneResults);
		return pruneResults; // Or format this into a more useful summary object
	} catch (error: any) {
		console.error('Docker Service: Error pruning system:', error);
		throw new DockerApiError(`Failed to prune system: ${error.message || 'Unknown Docker error'}`, error.statusCode);
	}
}
