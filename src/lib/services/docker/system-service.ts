import { getDockerClient } from '$lib/services/docker/core';
import { DockerApiError } from '$lib/types/errors';
import { getSettings } from '$lib/services/settings-service';

type PruneType = 'containers' | 'images' | 'networks' | 'volumes';

/**
 * Prunes selected Docker resources.
 * Respects the 'pruneMode' setting for images if 'images' type is included.
 * @param {PruneType[]} typesToPrune - An array of resource types to prune.
 * @returns {Promise<any>} A promise that resolves with the prune results.
 * @throws {DockerApiError} If any prune operation fails.
 */
export async function pruneSystem(typesToPrune: PruneType[]): Promise<any> {
	if (!typesToPrune || typesToPrune.length === 0) {
		console.log('Prune system called with no types selected.');
		return { message: 'No resource types selected for pruning.' };
	}

	try {
		const docker = getDockerClient();
		const settings = await getSettings(); // Needed for image prune mode

		const prunePromises: Promise<any>[] = [];

		if (typesToPrune.includes('containers')) {
			console.log('Adding container prune to tasks.');
			prunePromises.push(
				docker.pruneContainers().catch((e) => {
					console.error('Error pruning containers:', e);
					return { type: 'containers', error: e.message, ContainersDeleted: [], SpaceReclaimed: 0 };
				})
			);
		}

		if (typesToPrune.includes('images')) {
			const imagePruneFilter = { dangling: settings.pruneMode === 'dangling' };
			console.log(`Adding image prune (${settings.pruneMode}) to tasks.`);
			prunePromises.push(
				docker.pruneImages({ filters: imagePruneFilter }).catch((e) => {
					console.error('Error pruning images:', e);
					return { type: 'images', error: e.message, ImagesDeleted: [], SpaceReclaimed: 0 };
				})
			);
		}

		if (typesToPrune.includes('networks')) {
			console.log('Adding network prune to tasks.');
			prunePromises.push(
				docker.pruneNetworks().catch((e) => {
					console.error('Error pruning networks:', e);
					return { type: 'networks', error: e.message, NetworksDeleted: [] };
				})
			);
		}

		if (typesToPrune.includes('volumes')) {
			console.warn('Adding VOLUME prune to tasks.');
			prunePromises.push(
				docker.pruneVolumes().catch((e) => {
					console.error('Error pruning volumes:', e);
					return { type: 'volumes', error: e.message, VolumesDeleted: [], SpaceReclaimed: 0 };
				})
			);
		}

		// Add build cache prune if needed and selected
		// if (typesToPrune.includes('builds')) { ... }

		const results = await Promise.all(prunePromises);
		console.log('Docker System Prune results:', results);

		// Check for individual errors within results
		const errors = results.filter((r) => r && r.error);
		if (errors.length > 0) {
			// Optionally throw a combined error or return structured error info
			console.error(`Errors occurred during prune: ${errors.map((e) => `${e.type}: ${e.error}`).join('; ')}`);
			// Decide how to handle partial failures - here we return results including errors
		}

		return results; // Return array of results (or errors) for each type
	} catch (error: any) {
		// Catch errors during setup (getDockerClient, getSettings)
		console.error('Docker Service: Error setting up system prune:', error);
		throw new DockerApiError(`Failed to initiate system prune: ${error.message || 'Unknown Docker error'}`, error.statusCode);
	}
}
