import { getDockerClient, dockerHost } from '$lib/services/docker/core';
import type { ServiceVolume } from '$lib/types/docker/volume.type';
import type { VolumeCreateOptions } from 'dockerode';

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
		const docker = getDockerClient();
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
        const docker = getDockerClient();
        const containers = await docker.listContainers({ all: true });

        // Inspect each container to check its mounts
        for (const containerInfo of containers) {
            const container = docker.getContainer(containerInfo.Id);
            const details = await container.inspect();

            // Check if any mount points to our volume
            const volumeMounts = details.Mounts.filter((mount) => mount.Type === 'volume' && mount.Name === volumeName);

            if (volumeMounts.length > 0) {
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
export async function createVolume(options: VolumeCreateOptions): Promise<any> {
    try {
        const docker = getDockerClient();
        // createVolume returns the volume data directly - no need to inspect
        const volume = await docker.createVolume(options);

        console.log(`Docker Service: Volume "${options.Name}" created successfully.`);

        // Return the creation response which contains basic info
        return {
            Name: volume.Name,
            Driver: volume.Driver,
            Mountpoint: volume.Mountpoint,
            Labels: volume.Labels || {},
            Scope: volume.Scope || 'local',
            CreatedAt: new Date().toISOString() // Since inspect would give us this
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
 * @param {boolean} [force=false] - The `force` parameter in the `removeVolume` function is a boolean
 * parameter that determines whether to forcefully remove the volume even if it is in use by a
 * container. By default, its value is set to `false`, meaning that the volume will not be removed if
 * it is in use. If
 */
export async function removeVolume(name: string, force: boolean = false): Promise<void> {
	try {
		const docker = getDockerClient();
		const volume = docker.getVolume(name);
		await volume.remove({ force });
		console.log(`Docker Service: Volume "${name}" removed successfully.`);
	} catch (error: any) {
		console.error(`Docker Service: Error removing volume "${name}":`, error);
		if (error.statusCode === 409) {
			throw new Error(`Volume "${name}" is in use by a container. Use force option to remove.`);
		}
		throw new Error(`Failed to remove volume "${name}" using host "${dockerHost}". ${error.message || error.reason || ''}`);
	}
}

/**
 * The function `pullImage` asynchronously pulls a Docker image using a specified image reference and
 * optional platform.
 * @param {string} imageRef - The `imageRef` parameter in the `pullImage` function is a string that
 * represents the reference to the Docker image that you want to pull. It typically includes the image
 * name and tag, such as `nginx:latest` or `myapp:v1.0`.
 * @param {string} [platform] - The `platform` parameter in the `pullImage` function is an optional
 * parameter that specifies the platform for which the image should be pulled. This parameter allows
 * you to specify the architecture, operating system, and variant of the platform for which the image
 * is intended. If provided, the Docker client will attempt
 */
export async function pullImage(imageRef: string, platform?: string): Promise<void> {
	try {
		const docker = getDockerClient();

		const pullOptions: any = {};
		if (platform) {
			pullOptions.platform = platform;
		}

		console.log(`Docker Service: Pulling image "${imageRef}"...`);

		// Pull the image - this returns a stream
		const stream = await docker.pull(imageRef, pullOptions);

		// Wait for the pull to complete by consuming the stream
		await new Promise((resolve, reject) => {
			docker.modem.followProgress(stream, (err: any, output: any) => {
				if (err) {
					reject(err);
				} else {
					resolve(output);
				}
			});
		});

		console.log(`Docker Service: Image "${imageRef}" pulled successfully.`);
	} catch (error: any) {
		console.error(`Docker Service: Error pulling image "${imageRef}":`, error);

		// Handle specific error cases
		if (error.statusCode === 404) {
			throw new Error(`Image "${imageRef}" not found in registry.`);
		}

		throw new Error(`Failed to pull image "${imageRef}". ${error.message || error.reason || ''}`);
	}
}