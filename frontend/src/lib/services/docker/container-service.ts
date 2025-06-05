import { getDockerClient, dockerHost } from './core';
import { NotFoundError, ConflictError, DockerApiError } from '$lib/types/errors';
import type Docker from 'dockerode';

// Add a container cache with TTL
const containerCache = new Map<string, { timestamp: number; data: any }>();
const CONTAINER_CACHE_TTL = 15000; // 15 seconds - slightly shorter than stacks cache

/**
 * Helper function to invalidate container cache entries
 * @param {string} containerId - The ID of the container to invalidate (optional)
 */
function invalidateContainerCache(containerId?: string) {
	if (containerId) {
		// Remove specific container entry
		containerCache.delete(`container-${containerId}`);
	}

	// Always invalidate container lists as they're affected by any change
	containerCache.delete('list-containers-all');
	containerCache.delete('list-containers-running');
}

/**
 * This TypeScript function lists Docker containers and returns an array of Docker.ContainerInfo objects.
 * @param [all=true] - The `all` parameter in the `listContainers` function is a boolean parameter that
 * determines whether to list all containers or only running containers. When `all` is set to `true`,
 * all containers (including stopped containers) will be listed. If `all` is set to `false`, only
 * @returns The `listContainers` function returns a Promise that resolves to an array of
 * `Docker.ContainerInfo` objects.
 */
export async function listContainers(all = true): Promise<Docker.ContainerInfo[]> {
	const cacheKey = `list-containers-${all ? 'all' : 'running'}`;
	const cachedData = containerCache.get(cacheKey);

	// Return cached data if valid
	if (cachedData && Date.now() - cachedData.timestamp < CONTAINER_CACHE_TTL) {
		return cachedData.data as Docker.ContainerInfo[];
	}

	try {
		const docker = await getDockerClient();
		const containersData = await docker.listContainers({ all });

		// Cache the result
		containerCache.set(cacheKey, {
			data: containersData,
			timestamp: Date.now()
		});

		return containersData;
	} catch (error: unknown) {
		console.error('Docker Service: Error listing containers:', error);
		throw new Error(`Failed to list Docker containers using host "${dockerHost}".`);
	}
}

/**
 * This TypeScript function retrieves details of a Docker container by its ID and handles errors
 * appropriately.
 * @param {string} containerId - The `getContainer` function you provided is an asynchronous function
 * that retrieves information about a Docker container based on the `containerId` provided as a
 * parameter. The function uses the Docker API to inspect the container and return relevant details.
 * @returns The function `getContainer` returns a Promise that resolves to a `Docker.ContainerInspectInfo`
 * object, or null if not found.
 */
export async function getContainer(containerId: string): Promise<Docker.ContainerInspectInfo | null> {
	const cacheKey = `container-${containerId}`;
	const cachedData = containerCache.get(cacheKey);

	// Return cached data if valid
	if (cachedData && Date.now() - cachedData.timestamp < CONTAINER_CACHE_TTL) {
		return cachedData.data as Docker.ContainerInspectInfo | null;
	}

	try {
		const docker = await getDockerClient();
		const container = docker.getContainer(containerId);
		const inspectData = await container.inspect();

		// Cache the result
		containerCache.set(cacheKey, {
			data: inspectData,
			timestamp: Date.now()
		});

		return inspectData;
	} catch (error: unknown) {
		console.error(`Docker Service: Error getting container ${containerId}:`, error);
		if (error instanceof Error && 'statusCode' in error && (error as { statusCode?: number }).statusCode === 404) {
			return null;
		}
		throw new Error(`Failed to get container details for ${containerId} using host "${dockerHost}".`);
	}
}

/**
 * The function `startContainer` asynchronously starts a Docker container using its ID and handles any
 * errors that may occur.
 * @param {string} containerId - The `containerId` parameter is a string that represents the unique
 * identifier of the Docker container that you want to start.
 */
export async function startContainer(containerId: string): Promise<void> {
	try {
		const docker = await getDockerClient();
		const container = docker.getContainer(containerId);
		await container.start();

		// Invalidate cache for this container
		invalidateContainerCache(containerId);
	} catch (error: unknown) {
		console.error(`Docker Service: Error starting container ${containerId}:`, error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to start container ${containerId} using host "${dockerHost}". ${errorMessage}`);
	}
}

/**
 * The function `stopContainer` stops a Docker container using its ID and handles any errors that may
 * occur.
 * @param {string} containerId - The `containerId` parameter is a string that represents the unique
 * identifier of the Docker container that you want to stop.
 */
export async function stopContainer(containerId: string): Promise<void> {
	try {
		const docker = await getDockerClient();
		const container = docker.getContainer(containerId);
		await container.stop();

		// Invalidate cache for this container
		invalidateContainerCache(containerId);
	} catch (error: unknown) {
		console.error(`Docker Service: Error stopping container ${containerId}:`, error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to stop container ${containerId} using host "${dockerHost}". ${errorMessage}`);
	}
}

/**
 * The function restarts a Docker container using its ID.
 * @param {string} containerId - The `containerId` parameter is a string that represents the unique
 * identifier of the Docker container that you want to restart.
 */
export async function restartContainer(containerId: string): Promise<void> {
	try {
		const docker = await getDockerClient();
		const container = docker.getContainer(containerId);
		await container.restart();

		// Invalidate cache for this container
		invalidateContainerCache(containerId);
	} catch (error: unknown) {
		console.error(`Docker Service: Error restarting container ${containerId}:`, error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to restart container ${containerId} using host "${dockerHost}". ${errorMessage}`);
	}
}

/**
 * The function `removeContainer` asynchronously removes a Docker container by its ID, with an option
 * to force removal if necessary. It throws specific errors for common issues like 'not found' or 'conflict'.
 * @param {string} containerId - The `containerId` parameter is a string that represents the unique
 * identifier of the container that you want to remove.
 * @param {boolean} [force=false] - The `force` parameter determines whether to forcefully remove the
 * container if it is currently running. If `force` is set to `true`, the container will be stopped
 * (if running) and then removed. If `force` is set to `false` (default), an error will be thrown if
 * the container is running.
 * @throws {NotFoundError} If the container with the specified ID does not exist.
 * @throws {ConflictError} If trying to remove a running container without `force=true`.
 * @throws {DockerApiError} For other errors during the Docker API interaction.
 */
export async function removeContainer(containerId: string, force = false): Promise<void> {
	try {
		const docker = await getDockerClient();
		const container = docker.getContainer(containerId);

		// Pass the force option directly to dockerode's remove method
		await container.remove({ force });

		// Invalidate cache for this container
		invalidateContainerCache(containerId);

		console.log(`Docker Service: Container ${containerId} removed successfully (force=${force}).`);
	} catch (error: unknown) {
		console.error(`Docker Service: Error removing container ${containerId} (force=${force}):`, error);

		// Type guard and handle custom error types
		if (error instanceof Error && 'statusCode' in error) {
			const dockerError = error as Error & { statusCode?: number };

			// Use custom error types for better handling in the API layer
			if (dockerError.statusCode === 404) {
				throw new NotFoundError(`Container ${containerId} not found.`);
			}
			// 409 Conflict typically means trying to remove a running container without force
			if (dockerError.statusCode === 409) {
				throw new ConflictError(`Cannot remove running container ${containerId}. Stop it first or use the force option.`);
			}

			// Throw a more specific Docker API error for other cases
			throw new DockerApiError(`Failed to remove container ${containerId}: ${dockerError.message || 'Unknown Docker error'}`, dockerError.statusCode);
		}

		// Generic error case
		throw new DockerApiError(`Failed to remove container ${containerId}: ${error instanceof Error ? error.message : String(error)}`, 500);
	}
}

/**
 * This TypeScript function retrieves logs from a Docker container based on specified options.
 * @param {string} containerId - The `containerId` parameter is a string that represents the unique
 * identifier of the container for which you want to retrieve logs.
 * @param options - - `tail`: Number of lines to show from the end of the logs, or 'all' to show all
 * logs.
 * @returns The function `getContainerLogs` returns a Promise that resolves to a string containing the
 * logs of the specified Docker container based on the provided options.
 */
export async function getContainerLogs(
	containerId: string,
	options: {
		tail?: number | 'all';
		since?: number;
		until?: number;
		follow?: boolean;
		stdout?: boolean;
		stderr?: boolean;
	} = {}
): Promise<string> {
	try {
		const docker = await getDockerClient();
		const container = docker.getContainer(containerId);

		const logOptions = {
			tail: options.tail === 'all' ? undefined : options.tail || 100,
			stdout: options.stdout !== false,
			stderr: options.stderr !== false,
			timestamps: true,
			since: options.since || 0,
			until: options.until || undefined
		};

		const logsBuffer = options.follow === true ? await container.logs({ ...logOptions, follow: true }) : await container.logs({ ...logOptions, follow: false });
		let logString = logsBuffer.toString();

		if (logOptions.stdout || logOptions.stderr) {
			const lines = logString.split('\n');
			const processedLines = lines
				.map((line) => {
					if (!line) return '';
					if (line.length > 8) {
						return line.substring(8);
					}
					return line;
				})
				.filter(Boolean);

			logString = processedLines.join('\n');
		}

		return logString;
	} catch (error: unknown) {
		console.error(`Docker Service: Error getting logs for container ${containerId}:`, error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to get logs for container ${containerId} using host "${dockerHost}". ${errorMessage}`);
	}
}

/**
 * Creates a Docker container based on the provided Docker-specific configuration options.
 * @param {Docker.ContainerCreateOptions} config - The Docker container creation options,
 * conforming to `dockerode`'s `ContainerCreateOptions` type. This object is passed
 * with minimal modifications to the Docker API.
 * @returns An object with the `id`, `name`, `state`, `status`, and `created` time of the new container.
 * @throws {ConflictError} If the container name is already in use.
 * @throws {Error} For other Docker API errors or issues during creation.
 */
export async function createContainer(config: Docker.ContainerCreateOptions) {
	try {
		const docker = await getDockerClient();

		// The 'config' parameter is already Docker.ContainerCreateOptions.
		// We can pass it (or a copy) directly.
		const containerOptions: Docker.ContainerCreateOptions = { ...config };

		const container = await docker.createContainer(containerOptions);
		await container.start();

		const containerInfo = await container.inspect();

		invalidateContainerCache();

		return {
			id: containerInfo.Id,
			name: containerInfo.Name.substring(1), // Docker names often start with /
			state: containerInfo.State.Status,
			status: containerInfo.State.Running ? 'running' : 'stopped',
			created: containerInfo.Created
		};
	} catch (error: unknown) {
		console.error('Error creating container:', error);

		// Use properties from Docker.ContainerCreateOptions for error messages
		const imageName = config.Image || 'unknown image';
		const containerName = config.name || 'unnamed container';

		if (error instanceof Error) {
			const errorMessage = error.message || '';

			if (errorMessage.includes('IPAMConfig')) {
				// The specific network name would be in config.NetworkingConfig.EndpointsConfig or config.HostConfig.NetworkMode
				throw new Error(`Failed to create container: Invalid IP address configuration. ${errorMessage}`);
			}
			if (errorMessage.includes('NanoCpus')) {
				throw new Error(`Invalid CPU limit specified: ${errorMessage}`);
			}
			if (errorMessage.includes('Memory')) {
				throw new Error(`Invalid Memory limit specified: ${errorMessage}`);
			}
			if (errorMessage.toLowerCase().includes('name is already in use by container') || (error as any).statusCode === 409) {
				throw new ConflictError(`Failed to create container: The name "${containerName}" is already in use.`);
			}
			throw new Error(`Failed to create container with image "${imageName}": ${errorMessage}`);
		}

		throw new Error(`Failed to create container with image "${imageName}": Unknown error`);
	}
}

/**
 * Retrieves a single snapshot of resource usage statistics for a given container.
 * @param {string} containerId - The ID of the container.
 * @returns {Promise<Docker.ContainerStats | null>} A promise that resolves with the stats object, or null if the container is not running or not found.
 * @throws {NotFoundError} If the container does not exist.
 * @throws {DockerApiError} For other errors during the Docker API interaction.
 */
export async function getContainerStats(containerId: string): Promise<Docker.ContainerStats | null> {
	try {
		const docker = await getDockerClient();
		const container = docker.getContainer(containerId);

		// Check if container exists first (inspect is a good way)
		try {
			await container.inspect();
		} catch (inspectError: unknown) {
			if (inspectError instanceof Error && 'statusCode' in inspectError && (inspectError as { statusCode?: number }).statusCode === 404) {
				throw new NotFoundError(`Container ${containerId} not found when trying to get stats.`);
			}
			// Rethrow other inspect errors
			throw inspectError;
		}

		// Get a single stats reading
		// Note: This might throw an error or return empty/zero data if the container is not running.
		const stats = await container.stats({ stream: false });

		// The stats stream might return an empty object {} if the container just stopped.
		// Check for essential properties before returning.
		if (!stats || !stats.memory_stats || !stats.cpu_stats) {
			console.warn(`Docker Service: Received incomplete stats for container ${containerId}. It might not be running.`);
			return null;
		}

		return stats as Docker.ContainerStats;
	} catch (error: unknown) {
		// Handle cases where stats fails because the container isn't running (often a 404 or 500 from Docker API)
		if (error instanceof Error && 'statusCode' in error) {
			const dockerError = error as Error & { statusCode?: number; message?: string };

			if (dockerError.statusCode === 404) {
				// Could be container not found OR container not running (Docker API might return 404 for stats on stopped container)
				console.warn(`Docker Service: Container ${containerId} not found or not running when fetching stats.`);
				return null; // Return null if not running or not found
			}
			if (dockerError.statusCode === 500 && dockerError.message?.includes('is not running')) {
				console.warn(`Docker Service: Container ${containerId} is not running when fetching stats.`);
				return null; // Return null if not running
			}
		}

		// Handle specific NotFoundError from the inspect check
		if (error instanceof NotFoundError) {
			throw error;
		}

		console.error(`Docker Service: Error getting stats for container ${containerId}:`, error);
		// Throw a DockerApiError for unexpected issues
		const statusCode = error instanceof Error && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : 500;
		const message = error instanceof Error ? error.message : String(error);
		throw new DockerApiError(`Failed to get stats for container ${containerId}: ${message || 'Unknown Docker error'}`, statusCode);
	}
}

/**
 * Recreates a container with the same configuration but potentially a newer image.
 * Stops, removes the old container, creates a new one, and starts it.
 * Assumes the image tag used in the original config now points to the desired (potentially updated) image.
 * @param {string} containerId - The ID of the container to recreate.
 * @returns {Promise<Docker.ContainerInfo>} Information about the newly created and started container.
 * @throws {DockerApiError} If any step fails.
 */
export async function recreateContainer(containerId: string): Promise<Docker.ContainerInfo> {
	const docker = await getDockerClient();
	let originalContainer: Docker.ContainerInspectInfo | null = null;

	try {
		console.log(`Recreating container ${containerId}: Fetching original config...`);
		originalContainer = await getContainer(containerId);
		if (!originalContainer) {
			throw new DockerApiError(`Container ${containerId} not found for recreation.`, 404);
		}

		const createOptions: Docker.ContainerCreateOptions = {
			name: originalContainer.Name?.substring(1),
			Image: originalContainer.Config?.Image,
			Env: originalContainer.Config?.Env,
			Labels: originalContainer.Config?.Labels,
			ExposedPorts: originalContainer.Config?.ExposedPorts,
			HostConfig: {
				PortBindings: originalContainer.HostConfig?.PortBindings || {},
				NetworkMode: originalContainer.HostConfig?.NetworkMode || (originalContainer.NetworkSettings?.Networks?.bridge ? 'bridge' : Object.keys(originalContainer.NetworkSettings?.Networks || {})[0] || undefined),
				Binds: originalContainer.HostConfig?.Binds || originalContainer.Mounts?.filter((mount) => mount.Type === 'bind' || mount.Type === 'volume').map((mount) => `${mount.Source}:${mount.Destination}${mount.RW ? '' : ':ro'}`),
				RestartPolicy: originalContainer.HostConfig?.RestartPolicy,
				Memory: originalContainer.HostConfig?.Memory,
				NanoCpus: originalContainer.HostConfig?.NanoCpus
			},
			Cmd: originalContainer.Config?.Cmd,
			Entrypoint: originalContainer.Config?.Entrypoint,
			WorkingDir: originalContainer.Config?.WorkingDir,
			User: originalContainer.Config?.User,
			Volumes: originalContainer.Config?.Volumes,
			Tty: originalContainer.Config?.Tty,
			OpenStdin: originalContainer.Config?.OpenStdin,
			StdinOnce: originalContainer.Config?.StdinOnce
		};

		// If we need to add custom network configuration for non-default networks
		if (originalContainer.NetworkSettings?.Networks && createOptions.HostConfig) {
			interface DockerNetworkConfig {
				IPAddress?: string;
				IPPrefixLen?: number;
				Gateway?: string;
				MacAddress?: string;
				[key: string]: any;
			}
			type NetworkEntry = [string, DockerNetworkConfig];

			const networks = Object.entries(originalContainer.NetworkSettings.Networks) as NetworkEntry[];

			if (networks.length > 0 && networks[0][0] !== 'bridge' && createOptions.HostConfig.NetworkMode !== networks[0][0]) {
				const [networkName, networkConfigValue] = networks[0];
				const networkConfig = networkConfigValue as Docker.EndpointSettings;

				if (createOptions.HostConfig.NetworkMode !== networkName) {
					createOptions.HostConfig.NetworkMode = networkName;
				}

				if (networkConfig.IPAMConfig?.IPv4Address) {
					createOptions.NetworkingConfig = {
						EndpointsConfig: {
							[networkName]: {
								IPAMConfig: {
									IPv4Address: networkConfig.IPAMConfig.IPv4Address
								}
							}
						}
					};
				}
			}
		}

		// Stop the existing container
		try {
			console.log(`Recreating container ${containerId}: Stopping...`);
			await stopContainer(containerId);
		} catch (stopError: unknown) {
			if (stopError instanceof Error && 'statusCode' in stopError && (stopError as { statusCode?: number }).statusCode !== 304 && (stopError as { statusCode?: number }).statusCode !== 404) {
				console.warn(`Could not stop container ${containerId} before removal: ${stopError instanceof Error ? stopError.message : 'Unknown error'}`);
			}
		}

		// Remove the existing container
		console.log(`Recreating container ${containerId}: Removing...`);
		await removeContainer(containerId, true);

		// Create the new container with the extracted config
		console.log(`Recreating container ${containerId}: Creating new container with image ${createOptions.Image}...`);
		const newContainer = await docker.createContainer(createOptions);

		// Start the new container
		console.log(`Recreating container ${containerId}: Starting new container ${newContainer.id}...`);
		await startContainer(newContainer.id);

		// Invalidate container cache after recreation
		invalidateContainerCache();

		console.log(`Recreating container ${containerId}: Successfully recreated and started as ${newContainer.id}.`);

		// Get basic container info to return as Docker.ContainerInfo
		const allContainers = await listContainers(true);
		const newServiceContainer = allContainers.find((c) => c.Id === newContainer.id);

		if (!newServiceContainer) {
			throw new Error(`Container ${newContainer.id} was created but not found in container list`);
		}

		return newServiceContainer;
	} catch (error: unknown) {
		console.error(`Failed to recreate container ${containerId}:`, error);

		const statusCode = error instanceof Error && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : 500;
		const message = error instanceof Error ? error.message : String(error);

		throw new DockerApiError(`Failed to recreate container ${originalContainer?.Name?.substring(1) || containerId}: ${message || 'Unknown error'}`, statusCode);
	}
}
