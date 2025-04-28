import { getDockerClient } from '$lib/services/docker/core';
import type { PruneResult } from '$lib/types/docker/prune.type';

type PruneType = 'containers' | 'images' | 'networks' | 'volumes';
type PruneServiceResult = PruneResult & { type: PruneType; error?: string };
const docker = getDockerClient();

// Refactored pruneSystem function
export async function pruneSystem(types: PruneType[]): Promise<PruneServiceResult[]> {
	const results: PruneServiceResult[] = [];

	// Use a for...of loop for sequential execution
	for (const type of types) {
		let result: PruneResult | null = null;
		let error: string | undefined = undefined;

		try {
			console.log(`Pruning ${type}...`); // Log start

			switch (type) {
				case 'containers':
					// Add any specific filters if needed, e.g., { filters: '{"until": ["24h"]}' }
					result = await docker.pruneContainers();
					break;
				case 'images':
					// Add filters like dangling=true if needed: { filters: '{"dangling": ["true"]}' }
					// Note: Pruning all images might take a long time and remove needed images.
					// Consider adding filters based on settings (e.g., pruneMode)
					result = await docker.pruneImages({ filters: '{"dangling": ["true"]}' }); // Example: Only prune dangling images
					break;
				case 'networks':
					result = await docker.pruneNetworks();
					break;
				case 'volumes':
					// Be cautious with volume pruning! Maybe filter by label?
					// Example: { filters: '{"label!": ["keep=true"]}' }
					result = await docker.pruneVolumes();
					break;
				default:
					console.warn(`Unsupported prune type requested: ${type}`);
					continue; // Skip unsupported types
			}

			console.log(`Pruning ${type} completed.`); // Log completion

			// Add the type to the result object before pushing
			results.push({ ...result, type, error });
		} catch (err: any) {
			console.error(`Error pruning ${type}:`, err);
			error = err.message || `Failed to prune ${type}`;
			// Push an error result for this type
			results.push({
				// Provide default PruneResult fields in case of error
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

	console.log('Docker System Prune results:', results);
	return results;
}

// You might also want a function to get system info if not already present
export async function getSystemInfo() {
	try {
		return await docker.info();
	} catch (err: any) {
		console.error('Error getting Docker system info:', err);
		throw new Error(`Failed to get Docker info: ${err.message}`);
	}
}

// Function to get disk usage
export async function getDiskUsage() {
	try {
		return await docker.df(); // Docker Disk Free
	} catch (err: any) {
		console.error('Error getting Docker disk usage:', err);
		throw new Error(`Failed to get Docker disk usage: ${err.message}`);
	}
}
