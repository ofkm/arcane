import { getDockerClient, dockerHost } from './core';
import type { ContainerConfig, ContainerCreate } from '$lib/types/docker';
import type { ServiceContainer } from '$lib/types/docker/container.type';
// Import custom errors - remove unused ContainerStateError
import { NotFoundError, ConflictError, DockerApiError } from '$lib/types/errors';
import type Docker from 'dockerode';

/**
 * This TypeScript function lists Docker containers and returns an array of ServiceContainer objects.
 * @param [all=true] - The `all` parameter in the `listContainers` function is a boolean parameter that
 * determines whether to list all containers or only running containers. When `all` is set to `true`,
 * all containers (including stopped containers) will be listed. If `all` is set to `false`, only
 * @returns The `listContainers` function returns a Promise that resolves to an array of
 * `ServiceContainer` objects. Each `ServiceContainer` object contains properties such as `id`,
 * `names`, `name`, `image`, `imageId`, `command`, `created`, `state`, `status`, and `ports`, which are
 * extracted from the Docker containers retrieved using the Docker client.
 */
export async function listContainers(all = true): Promise<ServiceContainer[]> {
	try {
		const docker = await getDockerClient();
		const containersData = await docker.listContainers({ all });
		return containersData.map(
			(c): ServiceContainer => ({
				id: c.Id,
				names: c.Names,
				name: c.Names[0]?.substring(1) || c.Id.substring(0, 12),
				image: c.Image,
				imageId: c.ImageID,
				command: c.Command,
				created: c.Created,
				state: c.State,
				status: c.Status,
				ports: c.Ports
			})
		);
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
 * @returns The function `getContainer` returns an object containing various details of the Docker
 * container with the specified `containerId`. The object includes properties such as `id`, `name`,
 * `created`, `path`, `args`, `state`, `image`, `config`, `networkSettings`, and `mounts`. If an error
 * occurs during the process, it will be caught and handled accordingly. If the
 */
export async function getContainer(containerId: string) {
	try {
		const docker = await getDockerClient();
		const container = docker.getContainer(containerId);
		const inspectData = await container.inspect();
		return {
			id: inspectData.Id,
			name: inspectData.Name.substring(1),
			created: inspectData.Created,
			path: inspectData.Path,
			args: inspectData.Args,
			state: inspectData.State,
			image: inspectData.Image,
			config: inspectData.Config,
			networkSettings: inspectData.NetworkSettings,
			mounts: inspectData.Mounts,
			labels: inspectData.Config.Labels
		};
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
 * The function `createContainer` in TypeScript creates a Docker container based on the provided
 * configuration and returns information about the created container.
 * @param {ContainerConfig} config - The `config` parameter in the `createContainer` function is an
 * object that contains various properties used to configure and create a Docker container. Here are
 * the properties that can be included in the `config` object:
 * @returns The `createContainer` function returns an object with the following properties:
 * - `id`: The ID of the created container
 * - `name`: The name of the container
 * - `state`: The status of the container (e.g., "running", "stopped")
 * - `status`: Indicates whether the container is running or stopped
 * - `created`: The timestamp indicating when the container was created
 */
export async function createContainer(config: ContainerConfig) {
	try {
		const docker = await getDockerClient();

		const containerOptions: ContainerCreate = {
			name: config.name,
			Image: config.image,
			Env: config.envVars?.map((env) => `${env.key}=${env.value}`) || [],
			Labels: config.labels || {},
			Cmd: config.command,
			User: config.user,
			Healthcheck: config.healthcheck
				? {
						Test: config.healthcheck.Test,
						Interval: config.healthcheck.Interval,
						Timeout: config.healthcheck.Timeout,
						Retries: config.healthcheck.Retries,
						StartPeriod: config.healthcheck.StartPeriod
					}
				: undefined,
			HostConfig: {
				RestartPolicy: {
					Name: config.restart || 'no'
				},
				Memory: config.memoryLimit,
				NanoCpus: config.cpuLimit ? Math.round(config.cpuLimit * 1_000_000_000) : undefined
			}
		};

		// Set up port bindings if provided
		if (config.ports?.length) {
			const exposedPorts: Record<string, Record<string, never>> = {};
			const portBindings: Record<string, Array<{ HostPort: string }>> = {};
			for (const p of config.ports) {
				const key = `${p.containerPort}/tcp`;
				exposedPorts[key] = {};
				portBindings[key] = [{ HostPort: p.hostPort }];
			}
			containerOptions.ExposedPorts = exposedPorts;
			containerOptions.HostConfig = {
				...(containerOptions.HostConfig ?? {}),
				PortBindings: portBindings
			};
		}

		// Set up volume mounts if provided
		if (config.volumes && config.volumes.length > 0) {
			containerOptions.HostConfig = containerOptions.HostConfig || {};
			containerOptions.HostConfig.Binds = config.volumes.map((vol) => `${vol.source}:${vol.target}${vol.readOnly ? ':ro' : ''}`);
		}

		// Set up network if provided
		if (config.network) {
			containerOptions.HostConfig = containerOptions.HostConfig || {};
			if (!containerOptions.NetworkingConfig) {
				containerOptions.HostConfig.NetworkMode = config.network;
			}

			if (config.networkConfig && config.network !== 'host' && config.network !== 'none' && config.network !== 'bridge') {
				containerOptions.NetworkingConfig = {
					EndpointsConfig: {
						[config.network]: {
							IPAMConfig: {
								IPv4Address: config.networkConfig.ipv4Address || undefined,
								IPv6Address: config.networkConfig.ipv6Address || undefined
							}
						}
					}
				};
				containerOptions.HostConfig.NetworkMode = undefined;
			}
		}

		// Create and start the container
		const container = await docker.createContainer(containerOptions);
		await container.start();

		// Get the container details
		const containerInfo = await container.inspect();

		return {
			id: containerInfo.Id,
			name: containerInfo.Name.substring(1),
			state: containerInfo.State.Status,
			status: containerInfo.State.Running ? 'running' : 'stopped',
			created: containerInfo.Created
		};
	} catch (error: unknown) {
		console.error('Error creating container:', error);

		if (error instanceof Error) {
			const errorMessage = error.message || '';

			if (errorMessage.includes('IPAMConfig')) {
				throw new Error(`Failed to create container: Invalid IP address configuration for network "${config.network}". ${errorMessage}`);
			}
			// Add more specific error handling for resource limits if needed
			if (errorMessage.includes('NanoCpus')) {
				throw new Error(`Invalid CPU limit specified: ${errorMessage}`);
			}
			if (errorMessage.includes('Memory')) {
				throw new Error(`Invalid Memory limit specified: ${errorMessage}`);
			}
			throw new Error(`Failed to create container with image "${config.image}": ${errorMessage}`);
		}

		throw new Error(`Failed to create container with image "${config.image}": Unknown error`);
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
 * @returns {Promise<ServiceContainer>} Information about the newly created and started container.
 * @throws {DockerApiError} If any step fails.
 */
export async function recreateContainer(containerId: string): Promise<ServiceContainer> {
	const docker = await getDockerClient();
	let originalContainer = null;

	try {
		console.log(`Recreating container ${containerId}: Fetching original config...`);
		// 1. Get existing container details
		originalContainer = await getContainer(containerId);
		if (!originalContainer) {
			throw new DockerApiError(`Container ${containerId} not found for recreation.`, 404);
		}

		// Extract necessary config parts
		const createOptions: Docker.ContainerCreateOptions = {
			name: originalContainer.name,
			Image: originalContainer.config.Image,
			Env: originalContainer.config.Env,
			Labels: originalContainer.labels,
			ExposedPorts: originalContainer.config.ExposedPorts,
			HostConfig: {
				PortBindings: originalContainer.networkSettings?.Ports || {},
				NetworkMode: originalContainer.networkSettings?.Networks?.bridge ? 'bridge' : Object.keys(originalContainer.networkSettings?.Networks || {})[0] || undefined,
				Binds: originalContainer.mounts?.filter((mount) => mount.Type === 'bind' || mount.Type === 'volume').map((mount) => `${mount.Source}:${mount.Destination}${mount.RW ? '' : ':ro'}`)
			},
			Cmd: originalContainer.config.Cmd,
			Entrypoint: originalContainer.config.Entrypoint,
			WorkingDir: originalContainer.config.WorkingDir,
			User: originalContainer.config.User,
			Volumes: originalContainer.config.Volumes,
			Tty: originalContainer.config.Tty,
			OpenStdin: originalContainer.config.OpenStdin,
			StdinOnce: originalContainer.config.StdinOnce
		};

		// If we need to add custom network configuration for non-default networks
		if (originalContainer.networkSettings?.Networks) {
			const networks = Object.entries(originalContainer.networkSettings.Networks);
			// If container uses a non-default network, set it up
			if (networks.length > 0 && networks[0][0] !== 'bridge') {
				const [networkName, networkConfig] = networks[0];
				createOptions.HostConfig!.NetworkMode = networkName;

				// If network has specific IP assignments, add NetworkingConfig
				if (networkConfig.IPAddress) {
					createOptions.NetworkingConfig = {
						EndpointsConfig: {
							[networkName]: {
								IPAMConfig: {
									IPv4Address: networkConfig.IPAddress
								}
							}
						}
					};
				}
			}
		}

		// 2. Stop the existing container (optional but safer)
		try {
			console.log(`Recreating container ${containerId}: Stopping...`);
			await stopContainer(containerId);
		} catch (stopError: unknown) {
			// Ignore "already stopped" errors
			if (stopError instanceof Error && 'statusCode' in stopError && (stopError as { statusCode?: number }).statusCode !== 304 && (stopError as { statusCode?: number }).statusCode !== 404) {
				console.warn(`Could not stop container ${containerId} before removal: ${stopError instanceof Error ? stopError.message : 'Unknown error'}`);
			}
		}

		// 3. Remove the existing container
		console.log(`Recreating container ${containerId}: Removing...`);
		await removeContainer(containerId, true); // Use force to ensure removal even if stop failed

		// 4. Create the new container with the extracted config
		console.log(`Recreating container ${containerId}: Creating new container with image ${createOptions.Image}...`);
		const newContainer = await docker.createContainer(createOptions);

		// 5. Start the new container
		console.log(`Recreating container ${containerId}: Starting new container ${newContainer.id}...`);
		await startContainer(newContainer.id);

		console.log(`Recreating container ${containerId}: Successfully recreated and started as ${newContainer.id}.`);

		// 6. Get basic container info to return as ServiceContainer
		const containers = await listContainers(true); // Get all containers including the new one
		const newServiceContainer = containers.find((c) => c.id === newContainer.id);

		if (!newServiceContainer) {
			throw new Error(`Container ${newContainer.id} was created but not found in container list`);
		}

		return newServiceContainer;
	} catch (error: unknown) {
		console.error(`Failed to recreate container ${containerId}:`, error);

		const statusCode = error instanceof Error && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : 500;
		const message = error instanceof Error ? error.message : String(error);

		throw new DockerApiError(`Failed to recreate container ${originalContainer?.name || containerId}: ${message || 'Unknown error'}`, statusCode);
	}
}
