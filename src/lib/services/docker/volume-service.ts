import { getDockerClient, dockerHost } from '$lib/services/docker/core';
// ServiceVolume might still be used by other parts of the application,
// but this service will primarily return Dockerode's VolumeInspectInfo.
// import type { ServiceVolume } from '$lib/types/docker/volume.type';
import type { VolumeCreateOptions, VolumeInspectInfo } from 'dockerode';
// Import custom errors
import { NotFoundError, ConflictError, DockerApiError } from '$lib/types/errors'; // #file:/Users/kylemendell/dev/ofkm/arcane/src/lib/types/errors.ts

/**
 * Asynchronously lists Docker volumes.
 * @returns A Promise that resolves to an array of `VolumeInspectInfo` objects from Docker.
 * @throws {Error} If an error occurs during the process.
 */
export async function listVolumes(): Promise<VolumeInspectInfo[]> {
	try {
		const docker = await getDockerClient();
		const volumeResponse = await docker.listVolumes();
		// The Volumes array in the response directly contains objects conforming to VolumeInspectInfo
		return volumeResponse.Volumes || [];
	} catch (error: unknown) {
		console.error('Docker Service: Error listing volumes:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to list Docker volumes using host "${dockerHost}". ${errorMessage}`);
	}
}

/**
 * The function `isVolumeInUse` checks if a specified volume is currently in use by any Docker
 * containers.
 * @param {string} volumeName - The `volumeName` parameter in the `isVolumeInUse` function is a string
 * that represents the name of the volume you want to check if it is in use by any Docker containers.
 * @returns The `isVolumeInUse` function returns a Promise that resolves to a boolean value. The
 * function checks if a specified volume is being used by any Docker containers. If the volume is found
 * to be in use by any container, the function returns `true`. If the volume is not in use by any
 * container, the function returns `false`. In case of any errors during the process, the function
 */
export async function isVolumeInUse(volumeName: string): Promise<boolean> {
	try {
		const docker = await getDockerClient();
		const containers = await docker.listContainers({ all: true });
		// Inspect each container to check its mounts
		for (const containerInfo of containers) {
			// Use getContainer and inspect to get detailed mount information
			const details = await docker.getContainer(containerInfo.Id).inspect();
			if (details.Mounts?.some((m) => m.Type === 'volume' && m.Name === volumeName)) {
				return true;
			}
		}
		return false;
	} catch (error: unknown) {
		console.error(`Error checking if volume ${volumeName} is in use:`, error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		// Rethrow or handle more gracefully depending on requirements.
		// Defaulting to true might be too restrictive if the check itself fails.
		// Consider throwing a new error or returning a specific error state.
		throw new Error(`Failed to check if volume ${volumeName} is in use: ${errorMessage}`);
	}
}

/**
 * Retrieves detailed information about a specific Docker volume by its name.
 * @param {string} volumeName - The name of the volume to inspect.
 * @returns {Promise<VolumeInspectInfo>} A promise that resolves with the detailed volume information.
 * @throws {NotFoundError} If the volume with the specified name does not exist.
 * @throws {DockerApiError} For other errors during the Docker API interaction.
 */
export async function getVolume(volumeName: string): Promise<VolumeInspectInfo> {
	try {
		const docker = await getDockerClient();
		const volume = docker.getVolume(volumeName);
		const inspectInfo = await volume.inspect(); // This directly returns VolumeInspectInfo
		console.log(`Docker Service: Inspected volume "${volumeName}" successfully.`);
		return inspectInfo;
	} catch (error: unknown) {
		console.error(`Docker Service: Error inspecting volume "${volumeName}":`, error);
		if ((error as { statusCode?: number }).statusCode === 404) {
			throw new NotFoundError(`Volume "${volumeName}" not found.`);
		}
		const errorMessage = (error as { message?: string; reason?: string }).message || (error as { reason?: string }).reason || 'Unknown Docker error';
		throw new DockerApiError(`Failed to inspect volume "${volumeName}": ${errorMessage}`, (error as { statusCode?: number }).statusCode);
	}
}

/**
 * Creates a Docker volume with specified options.
 * @param {VolumeCreateOptions} options - The `VolumeCreateOptions` object containing configuration for the new volume.
 * @returns {Promise<VolumeInspectInfo>} A promise that resolves with the `VolumeInspectInfo` of the created volume.
 * @throws {ConflictError} If a volume with the same name already exists.
 * @throws {DockerApiError} For other Docker API errors or issues during creation.
 */
export async function createVolume(options: VolumeCreateOptions): Promise<VolumeInspectInfo> {
	try {
		const docker = await getDockerClient();
		// docker.createVolume(options) returns a Promise<any>, which resolves to the API response body.
		// This body is effectively the VolumeInspectInfo for the created volume.
		const volumeInfo = (await docker.createVolume(options)) as VolumeInspectInfo;

		console.log(`Docker Service: Volume "${options.Name}" created successfully.`);
		return volumeInfo;
	} catch (error: unknown) {
		console.error(`Docker Service: Error creating volume "${options.Name}":`, error);
		if ((error as { statusCode?: number }).statusCode === 409) {
			throw new ConflictError(`Volume "${options.Name}" already exists.`);
		}
		const errorMessage = (error as { message?: string; reason?: string }).message || (error as { reason?: string }).reason || 'Unknown Docker error';
		throw new DockerApiError(`Failed to create volume "${options.Name}" using host "${dockerHost}". ${errorMessage}`, (error as { statusCode?: number }).statusCode);
	}
}

/**
 * Removes a Docker volume by name.
 * @param {string} name - The name of the volume to remove.
 * @param {boolean} [force=false] - If true, forces removal even if the volume is in use.
 * @throws {NotFoundError} If the volume does not exist.
 * @throws {ConflictError} If the volume is in use and force is false.
 * @throws {DockerApiError} For other Docker API errors.
 */
export async function removeVolume(name: string, force = false): Promise<void> {
	try {
		const docker = await getDockerClient();
		const volume = docker.getVolume(name);
		await volume.remove({ force });
		console.log(`Docker Service: Volume "${name}" removed successfully (force=${force}).`);
	} catch (error: unknown) {
		console.error(`Docker Service: Error removing volume "${name}" (force=${force}):`, error);
		if ((error as { statusCode?: number }).statusCode === 404) {
			throw new NotFoundError(`Volume "${name}" not found.`);
		}
		if ((error as { statusCode?: number }).statusCode === 409) {
			throw new ConflictError(`Volume "${name}" is in use. Use the force option to remove if necessary.`);
		}
		const errorMessage = (error as { message?: string; reason?: string }).message || (error as { reason?: string }).reason || 'Unknown Docker error';
		throw new DockerApiError(`Failed to remove volume "${name}": ${errorMessage}`, (error as { statusCode?: number }).statusCode);
	}
}
