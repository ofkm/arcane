import { getDockerClient, dockerHost } from './core';
import type { ContainerConfig, ContainerCreate } from '$lib/types/docker';
import type { ServiceContainer } from '$lib/types/docker/container.type';
// Import custom errors
import { NotFoundError, ConflictError, DockerApiError } from '$lib/types/errors';

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
		const docker = getDockerClient();
		const containers = await docker.listContainers({ all });
		return containers.map(
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
	} catch (error: any) {
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
		const docker = getDockerClient();
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
			mounts: inspectData.Mounts
		};
	} catch (error: any) {
		console.error(`Docker Service: Error getting container ${containerId}:`, error);
		if (error.statusCode === 404) {
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
		const docker = getDockerClient();
		const container = docker.getContainer(containerId);
		await container.start();
	} catch (error: any) {
		console.error(`Docker Service: Error starting container ${containerId}:`, error);
		throw new Error(`Failed to start container ${containerId} using host "${dockerHost}". ${error.message || ''}`);
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
		const docker = getDockerClient();
		const container = docker.getContainer(containerId);
		await container.stop();
	} catch (error: any) {
		console.error(`Docker Service: Error stopping container ${containerId}:`, error);
		throw new Error(`Failed to stop container ${containerId} using host "${dockerHost}". ${error.message || ''}`);
	}
}

/**
 * The function restarts a Docker container using its ID.
 * @param {string} containerId - The `containerId` parameter is a string that represents the unique
 * identifier of the Docker container that you want to restart.
 */
export async function restartContainer(containerId: string): Promise<void> {
	try {
		const docker = getDockerClient();
		const container = docker.getContainer(containerId);
		await container.restart();
	} catch (error: any) {
		console.error(`Docker Service: Error restarting container ${containerId}:`, error);
		throw new Error(`Failed to restart container ${containerId} using host "${dockerHost}". ${error.message || ''}`);
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
		const docker = getDockerClient();
		const container = docker.getContainer(containerId);

		// Pass the force option directly to dockerode's remove method
		await container.remove({ force });

		console.log(`Docker Service: Container ${containerId} removed successfully (force=${force}).`);
	} catch (error: any) {
		console.error(`Docker Service: Error removing container ${containerId} (force=${force}):`, error);

		// Use custom error types for better handling in the API layer
		if (error.statusCode === 404) {
			throw new NotFoundError(`Container ${containerId} not found.`);
		}
		// 409 Conflict typically means trying to remove a running container without force
		if (error.statusCode === 409) {
			throw new ConflictError(`Cannot remove running container ${containerId}. Stop it first or use the force option.`);
		}

		// Throw a more specific Docker API error for other cases
		throw new DockerApiError(`Failed to remove container ${containerId}: ${error.message || 'Unknown Docker error'}`, error.statusCode);
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
		const docker = getDockerClient();
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
	} catch (error: any) {
		console.error(`Docker Service: Error getting logs for container ${containerId}:`, error);
		throw new Error(`Failed to get logs for container ${containerId} using host "${dockerHost}". ${error.message || ''}`);
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
		const docker = getDockerClient();

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
			const exposedPorts: Record<string, {}> = {};
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
	} catch (error: any) {
		console.error('Error creating container:', error);
		if (error.message && error.message.includes('IPAMConfig')) {
			throw new Error(`Failed to create container: Invalid IP address configuration for network "${config.network}". ${error.message}`);
		}
		// Add more specific error handling for resource limits if needed
		if (error.message && error.message.includes('NanoCpus')) {
			throw new Error(`Invalid CPU limit specified: ${error.message}`);
		}
		if (error.message && error.message.includes('Memory')) {
			throw new Error(`Invalid Memory limit specified: ${error.message}`);
		}
		throw new Error(`Failed to create container with image "${config.image}": ${error.message}`);
	}
}
