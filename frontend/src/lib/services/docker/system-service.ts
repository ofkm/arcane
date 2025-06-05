import { getDockerClient } from '$lib/services/docker/core';
import type { PruneResult } from '$lib/types/docker/prune.type';
import { getSettings } from '$lib/services/settings-service';
import type { Settings } from '$lib/types/settings.type';

type PruneType = 'containers' | 'images' | 'networks' | 'volumes';
type PruneServiceResult = PruneResult & { type: PruneType; error?: string };
const docker = await getDockerClient();

export async function pruneSystem(types: PruneType[]): Promise<PruneServiceResult[]> {
	const results: PruneServiceResult[] = [];

	let pruneMode: Settings['pruneMode'] = 'dangling';
	try {
		const currentSettings = await getSettings();
		if (currentSettings?.pruneMode) {
			pruneMode = currentSettings.pruneMode;
		}
	} catch (settingsError: unknown) {
		const msg = settingsError instanceof Error ? settingsError.message : String(settingsError);
		console.warn(`Could not fetch settings for prune operation, defaulting to 'dangling' image prune mode. Error: ${msg}`);
	}

	console.log(`Using image prune mode: ${pruneMode}`);

	let message = 'System pruned successfully.';
	const settings = await getSettings();

	for (const type of types) {
		let result: PruneResult | null = null;
		let error: string | undefined = undefined;
		let filterValue: string | undefined;
		let logMessage: string | undefined;

		try {
			console.log(`Pruning ${type}...`);

			switch (type) {
				case 'containers':
					result = await docker.pruneContainers();
					break;
				case 'images': {
					const imagePruneOptions = {
						filters: {
							// Ensure 'dangling' is a string 'true' or 'false'
							dangling: [settings.pruneMode === 'dangling' ? 'true' : 'false']
						}
					};
					const imagePruneResult = await docker.pruneImages(imagePruneOptions);
					if (imagePruneResult.ImagesDeleted && imagePruneResult.ImagesDeleted.length > 0) {
						results.push({
							...(imagePruneResult || { SpaceReclaimed: 0 }),
							type,
							error
						} as PruneServiceResult);
					}
					break;
				}
				case 'networks':
					result = await docker.pruneNetworks();
					break;
				case 'volumes':
					result = await docker.pruneVolumes();
					break;
				default:
					console.warn(`Unsupported prune type requested: ${type}`);
					continue;
			}

			console.log(`Pruning ${type} completed.`);
			results.push({ ...(result || { SpaceReclaimed: 0 }), type, error } as PruneServiceResult);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(`Error pruning ${type}:`, err);
			error = msg || `Failed to prune ${type}`;
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
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error('Error getting Docker system info:', err);
		throw new Error(`Failed to get Docker info: ${msg}`);
	}
}

export async function getDiskUsage() {
	try {
		return await docker.df();
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error('Error getting Docker disk usage:', err);
		throw new Error(`Failed to get Docker disk usage: ${msg}`);
	}
}
