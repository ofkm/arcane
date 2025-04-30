import { getDockerClient } from '$lib/services/docker/core';
import type { PruneResult } from '$lib/types/docker/prune.type';
import { getSettings } from '$lib/services/settings-service';
import type { Settings } from '$lib/types/settings.type';

type PruneType = 'containers' | 'images' | 'networks' | 'volumes';
type PruneServiceResult = PruneResult & { type: PruneType; error?: string };
const docker = getDockerClient();

/**
 * Prunes specified Docker resources sequentially, fetching settings to determine image prune mode.
 * @param {PruneType[]} types - Array of resource types to prune.
 * @returns {Promise<PruneServiceResult[]>} Results of each pruning operation.
 */
export async function pruneSystem(types: PruneType[]): Promise<PruneServiceResult[]> {
	const results: PruneServiceResult[] = [];

	// Fetch settings first
	let pruneMode: Settings['pruneMode'] = 'dangling'; // Default prune mode
	try {
		// Fetch settings INSIDE the function
		const currentSettings = await getSettings();
		if (currentSettings?.pruneMode) {
			pruneMode = currentSettings.pruneMode;
		}
	} catch (settingsError: any) {
		console.warn(`Could not fetch settings for prune operation, defaulting to 'dangling' image prune mode. Error: ${settingsError.message}`);
	}

	console.log(`Using image prune mode: ${pruneMode}`);

	// Use a for...of loop for sequential execution
	for (const type of types) {
		let result: PruneResult | null = null;
		let error: string | undefined = undefined;

		try {
			console.log(`Pruning ${type}...`);

			switch (type) {
				case 'containers':
					result = await docker.pruneContainers();
					break;
				case 'images':
					const filterValue = pruneMode === 'all' ? 'false' : 'true';
					const logMessage = pruneMode === 'all' ? 'Pruning all unused images (docker image prune -a)...' : 'Pruning dangling images (docker image prune)...';
					console.log(logMessage);
					const pruneOptions = {
						filters: { dangling: [filterValue] }
					};

					result = await docker.pruneImages(pruneOptions);
					break;
				case 'networks':
					result = await docker.pruneNetworks();
					break;
				case 'volumes':
					// result = await docker.pruneVolumes();
					break;
				default:
					console.warn(`Unsupported prune type requested: ${type}`);
					continue;
			}

			console.log(`Pruning ${type} completed.`);
			results.push({ ...(result || {}), type, error } as PruneServiceResult);
		} catch (err: any) {
			console.error(`Error pruning ${type}:`, err);
			error = err.message || `Failed to prune ${type}`;
			results.push({
				ContainersDeleted: type === 'containers' ? [] : undefined,
				ImagesDeleted: type === 'images' ? [] : undefined,
				NetworksDeleted: type === 'networks' ? [] : undefined,
				VolumesDeleted: type === 'volumes' ? [] : undefined,
				SpaceReclaimed: 0,
				type,
				error
			});
		}
	}
	return results;
}

export async function getSystemInfo() {
	try {
		return await docker.info();
	} catch (err: any) {
		console.error('Error getting Docker system info:', err);
		throw new Error(`Failed to get Docker info: ${err.message}`);
	}
}

export async function getDiskUsage() {
	try {
		return await docker.df();
	} catch (err: any) {
		console.error('Error getting Docker disk usage:', err);
		throw new Error(`Failed to get Docker disk usage: ${err.message}`);
	}
}
