import { getDockerClient, dockerHost } from '$lib/services/docker/core';
import type { ServiceVolume } from '$lib/types/docker/volume.type';
import type { VolumeCreateOptions, VolumeInspectInfo } from 'dockerode'; // Import VolumeInspectInfo
// Import custom errors
import { NotFoundError, ConflictError, DockerApiError } from '$lib/types/errors'; // #file:/Users/kylemendell/dev/ofkm/arcane/src/lib/types/errors.ts

/**
 * This TypeScript function asynchronously lists Docker volumes and maps the response to a custom
 * ServiceVolume type.
 * @returns The `listVolumes` function returns a Promise that resolves to an array of `ServiceVolume`
 * objects. Each `ServiceVolume` object contains properties such as `name`, `driver`, `scope`,
 * `mountpoint`, and `labels` extracted from the volumes obtained from the Docker client. If an error
 * occurs during the process, an error message is logged and a new Error is thrown with a failure
 */
export async function listVolumes(): Promise<ServiceVolume[]> {
	try {
		const docker = await getDockerClient();
		const volumeResponse = await docker.listVolumes();
		const volumes = volumeResponse.Volumes || [];

		return volumes.map(
			(vol): ServiceVolume => ({
				name: vol.Name,
				driver: vol.Driver,
				scope: vol.Scope,
				mountpoint: vol.Mountpoint,
				labels: vol.Labels
			})
		);
	} catch (error: any) {
		console.error('Docker Service: Error listing volumes:', error);
		throw new Error(`Failed to list Docker volumes using host "${dockerHost}".`);
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
			const details = await docker.getContainer(containerInfo.Id).inspect();
			if (details.Mounts?.some((m) => m.Type === 'volume' && m.Name === volumeName)) {
				return true;
			}
		}
		return false;
	} catch (error) {
		console.error(`Error checking if volume ${volumeName} is in use:`, error);
		// Default to assuming it's in use for safety
		return true;
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
		const inspectInfo = await volume.inspect();
		console.log(`Docker Service: Inspected volume "${volumeName}" successfully.`);
		return inspectInfo;
	} catch (error: any) {
		console.error(`Docker Service: Error inspecting volume "${volumeName}":`, error);
		if (error.statusCode === 404) {
			throw new NotFoundError(`Volume "${volumeName}" not found.`);
		}
		throw new DockerApiError(`Failed to inspect volume "${volumeName}": ${error.message || 'Unknown Docker error'}`, error.statusCode);
	}
}

/**
 * The function `createVolume` creates a Docker volume with specified options and returns basic
 * information about the created volume.
 * @param {VolumeCreateOptions} options - The `options` parameter in the `createVolume` function is of
 * type `VolumeCreateOptions`. This object likely contains the necessary information to create a volume
 * in Docker, such as the volume name, driver, labels, and scope. The function uses this information to
 * create a volume using the Docker client
 * @returns The `createVolume` function returns an object with the following properties:
 * - Name: The name of the created volume
 * - Driver: The driver used for the volume
 * - Mountpoint: The mountpoint of the volume
 * - Labels: Any labels associated with the volume (defaults to an empty object if none provided)
 * - Scope: The scope of the volume (defaults to 'local' if not
 */
export async function createVolume(options: VolumeCreateOptions): Promise<ServiceVolume> {
	try {
		const docker = await getDockerClient();
		// createVolume returns the volume data directly - no need to inspect
		const volume = await docker.createVolume(options);

		console.log(`Docker Service: Volume "${options.Name}" created successfully.`);

		// Return the creation response which contains basic info
		return {
			name: volume.Name,
			driver: volume.Driver,
			mountpoint: volume.Mountpoint,
			labels: volume.Labels || {},
			scope: volume.Scope || 'local'
		};
	} catch (error: any) {
		console.error(`Docker Service: Error creating volume "${options.Name}":`, error);
		// Check for specific Docker errors, like volume already exists (often 409)
		if (error.statusCode === 409) {
			throw new Error(`Volume "${options.Name}" already exists.`);
		}
		throw new Error(
			`Failed to create volume "${options.Name}" using host "${dockerHost}". ${
				error.message || error.reason || '' // Include reason if available
			}`
		);
	}
}

/**
 * The function `removeVolume` asynchronously removes a Docker volume by name, with an optional force
 * flag to handle volume in use errors.
 * @param {string} name - The `name` parameter is a string that represents the name of the volume you
 * want to remove.
 * @param {boolean} [force=false] - The `force` parameter determines whether to forcefully remove the volume even if it is in use by a
 * container.
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
	} catch (error: any) {
		console.error(`Docker Service: Error removing volume "${name}" (force=${force}):`, error);
		if (error.statusCode === 404) {
			throw new NotFoundError(`Volume "${name}" not found.`);
		}
		if (error.statusCode === 409) {
			// This usually means the volume is in use
			throw new ConflictError(`Volume "${name}" is in use by a container. Stop the container or use the force option to remove.`);
		}
		throw new DockerApiError(`Failed to remove volume "${name}": ${error.message || error.reason || 'Unknown Docker error'}`, error.statusCode);
	}
}
