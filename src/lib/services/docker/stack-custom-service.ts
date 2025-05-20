import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import Dockerode from 'dockerode';
import { getComposeFilePath, getStackDir, loadEnvFile, parseYamlContent, normalizeHealthcheckTest } from './stack-service';
import { getDockerClient } from './core';

const stackCache = new Map();

// Helper function to parse environment file content
export function parseEnvContent(envContent: string | null): Record<string, string> {
	const envVars: Record<string, string> = {};
	if (envContent) {
		envContent.split('\n').forEach((line) => {
			const trimmedLine = line.trim();
			if (trimmedLine && !trimmedLine.startsWith('#')) {
				const [key, ...valueParts] = trimmedLine.split('=');
				const value = valueParts.join('=');
				if (key) {
					envVars[key.trim()] = value?.trim() || '';
				}
			}
		});
	}
	return envVars;
}

/**
 * Custom stack deployment function using dockerode directly
 */
export async function deployStack(stackId: string): Promise<boolean> {
	const stackDir = await getStackDir(stackId);
	const originalCwd = process.cwd();
	let deploymentStarted = false;

	try {
		// Load and normalize compose file
		const composePath = await getComposeFilePath(stackId);
		if (!composePath) {
			throw new Error(`Compose file not found for stack ${stackId}`);
		}

		const composeContent = await fs.readFile(composePath, 'utf8');
		const envContent = await loadEnvFile(stackId);

		// Parse env variables and create getter
		const envVars = parseEnvContent(envContent);
		const getEnvVar = (key: string): string | undefined => envVars[key] || process.env[key];

		// Normalize and parse compose content
		const normalizedContent = normalizeHealthcheckTest(composeContent, getEnvVar);
		if (normalizedContent !== composeContent) {
			await fs.writeFile(composePath, normalizedContent, 'utf8');
		}

		// Parse normalized content
		const composeData = parseYamlContent(normalizedContent, getEnvVar);
		if (!composeData) {
			throw new Error(`Failed to parse compose file for stack ${stackId}`);
		}

		// Store environment variables in compose data for later use
		composeData._envVars = envVars;

		// Change directory for relative paths
		process.chdir(stackDir);
		console.log(`Temporarily changed CWD to: ${stackDir} for stack operations`);

		// Get docker client
		const docker = await getDockerClient();
		deploymentStarted = true;

		// Deploy in sequence:
		// 1. Create networks
		await createStackNetworks(docker, stackId, composeData.networks || {});

		// 2. Pull images
		await pullStackImages(docker, composeData.services || {});

		// 3. Create volumes (if needed)
		await createStackVolumes(docker, stackId, composeData.volumes || {});

		// 4. Create and start containers with proper network config
		await createAndStartContainers(docker, stackId, composeData, stackDir);

		// If everything succeeds, invalidate cache
		stackCache.delete('compose-stacks');
		return true;
	} catch (err) {
		if (deploymentStarted) {
			try {
				await cleanupFailedDeployment(stackId);
			} catch (cleanupErr) {
				console.error(`Error cleaning up failed deployment for stack ${stackId}:`, cleanupErr);
			}
		}

		console.error(`Error deploying stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to deploy stack: ${errorMessage}`);
	} finally {
		process.chdir(originalCwd);
		console.log(`Restored CWD to: ${originalCwd}`);
	}
}

/**
 * Creates all networks defined in the compose file
 */
async function createStackNetworks(docker: Dockerode, stackId: string, networks: Record<string, any>): Promise<void> {
	// Always create a default network if no networks are defined
	if (Object.keys(networks).length === 0) {
		const defaultNetworkName = `${stackId}_default`;
		console.log(`No networks defined, creating default network: ${defaultNetworkName}`);

		try {
			await docker.createNetwork({
				Name: defaultNetworkName,
				Driver: 'bridge',
				Labels: {
					'com.docker.compose.project': stackId,
					'com.docker.compose.network': 'default'
				}
			});
		} catch (err: any) {
			if (err.statusCode === 409) {
				console.log(`Default network ${defaultNetworkName} already exists, reusing it.`);
			} else {
				throw err;
			}
		}
		return;
	}

	// Process defined networks
	for (const [networkName, networkConfig] of Object.entries(networks)) {
		// Skip external networks
		if (networkConfig.external) {
			console.log(`Using external network: ${networkName}`);
			continue;
		}

		// Network creation logic
		const networkToCreate = {
			Name: networkConfig.name || `${stackId}_${networkName}`,
			Driver: networkConfig.driver || 'bridge',
			Labels: {
				'com.docker.compose.project': stackId,
				'com.docker.compose.network': networkName
			},
			Options: networkConfig.driver_opts || {}
		};

		try {
			console.log(`Creating network: ${networkToCreate.Name}`);
			await docker.createNetwork(networkToCreate);
		} catch (err: any) {
			if (err.statusCode === 409) {
				console.log(`Network ${networkToCreate.Name} already exists, reusing it.`);
			} else {
				throw err;
			}
		}
	}
}

/**
 * Pulls all images defined in the compose file
 */
async function pullStackImages(docker: Dockerode, services: Record<string, any>): Promise<void> {
	const pullPromises = Object.entries(services)
		.filter(([_, serviceConfig]) => serviceConfig.image)
		.map(async ([serviceName, serviceConfig]) => {
			const serviceImage = serviceConfig.image;
			console.log(`Pulling image for service ${serviceName}: ${serviceImage}`);

			try {
				await new Promise((resolve, reject) => {
					docker.pull(serviceImage, {}, (pullError, stream) => {
						if (pullError) {
							reject(pullError);
							return;
						}
						if (!stream) {
							reject(new Error(`Docker pull did not return a stream.`));
							return;
						}

						docker.modem.followProgress(
							stream,
							(progressError, output) => {
								if (progressError) {
									reject(progressError);
								} else {
									resolve(output);
								}
							},
							(event) => {
								if (event.progress) {
									console.log(`${serviceImage}: ${event.status} ${event.progress}`);
								} else if (event.status) {
									console.log(`${serviceImage}: ${event.status}`);
								}
							}
						);
					});
				});
			} catch (err) {
				console.warn(`Warning: Failed to pull image ${serviceImage}:`, err);
			}
		});

	await Promise.all(pullPromises);
}

/**
 * Creates volumes defined in the compose file
 */
async function createStackVolumes(docker: Dockerode, stackId: string, volumes: Record<string, any>): Promise<void> {
	for (const [volumeName, volumeConfig] of Object.entries(volumes)) {
		if (volumeConfig?.external) {
			console.log(`Using external volume: ${volumeName}`);
			continue;
		}

		const volumeToCreate = {
			Name: volumeConfig?.name || `${stackId}_${volumeName}`,
			Driver: volumeConfig?.driver || 'local',
			DriverOpts: volumeConfig?.driver_opts || {},
			Labels: {
				'com.docker.compose.project': stackId,
				'com.docker.compose.volume': volumeName,
				...volumeConfig?.labels
			}
		};

		try {
			console.log(`Creating volume: ${volumeToCreate.Name}`);
			await docker.createVolume(volumeToCreate);
		} catch (err: any) {
			if (err.statusCode === 409) {
				console.log(`Volume ${volumeToCreate.Name} already exists, reusing it.`);
			} else {
				throw err;
			}
		}
	}
}

/**
 * Creates and starts all containers with proper network configuration
 */
async function createAndStartContainers(docker: Dockerode, stackId: string, composeData: any, stackDir: string): Promise<void> {
	const services = composeData.services || {};

	// Build dependency order - services with depends_on should start after their dependencies
	const serviceList = buildServiceStartOrder(services);

	for (const serviceName of serviceList) {
		const serviceConfig = services[serviceName];
		console.log(`Creating container for service: ${serviceName}`);

		// Generate container name
		const containerName = serviceConfig.container_name || `${stackId}_${serviceName}`;

		// Check if container already exists
		const existingContainers = await docker.listContainers({
			all: true,
			filters: { name: [containerName] }
		});

		if (existingContainers.length > 0) {
			console.log(`Container ${containerName} already exists. Removing it.`);
			const container = docker.getContainer(existingContainers[0].Id);
			if (existingContainers[0].State === 'running') {
				await container.stop();
			}
			await container.remove();
		}

		// Build container creation options
		const createOptions = await buildContainerOptions(docker, stackId, serviceName, serviceConfig, stackDir, composeData);

		// Create the container
		const container = await docker.createContainer(createOptions);
		console.log(`Created container ${containerName} with ID: ${container.id}`);

		// Connect to additional networks if specified
		if (serviceConfig.networks && !serviceConfig.network_mode) {
			for (const [networkName, networkConfig] of Object.entries(serviceConfig.networks)) {
				// Skip the default network which is already connected
				if (networkName === 'default') continue;

				// Get actual network name
				const actualNetworkName = composeData.networks?.[networkName]?.name || (composeData.networks?.[networkName]?.external ? networkName : `${stackId}_${networkName}`);

				try {
					// Verify network exists before connecting
					const networks = await docker.listNetworks({
						filters: JSON.stringify({ name: [actualNetworkName] })
					});

					if (networks.length === 0) {
						console.warn(`Network ${actualNetworkName} not found, creating it now...`);
						await docker.createNetwork({
							Name: actualNetworkName,
							Driver: 'bridge',
							Labels: {
								'com.docker.compose.project': stackId,
								'com.docker.compose.network': networkName
							}
						});
					}

					console.log(`Connecting container ${containerName} to network: ${actualNetworkName}`);
					const network = docker.getNetwork(actualNetworkName);
					await network.connect({
						Container: container.id,
						EndpointConfig: buildEndpointConfig(networkConfig)
					});
				} catch (err) {
					console.error(`Failed to connect container to network ${actualNetworkName}:`, err);
					throw err;
				}
			}
		}

		// Start the container
		console.log(`Starting container: ${containerName}`);
		await container.start();
	}
}

/**
 * Build endpoint configuration for network connection
 */
function buildEndpointConfig(networkConfig: any): any {
	if (!networkConfig) return {};

	const config: any = {};

	if (networkConfig.ipv4_address) {
		config.IPAddress = networkConfig.ipv4_address;
	}

	if (networkConfig.aliases && Array.isArray(networkConfig.aliases)) {
		config.Aliases = networkConfig.aliases;
	}

	return config;
}

/**
 * Builds the optimal service start order based on dependencies
 */
function buildServiceStartOrder(services: Record<string, any>): string[] {
	const visited = new Set<string>();
	const result: string[] = [];

	// DFS function to process services
	function visit(serviceName: string) {
		if (visited.has(serviceName)) return;
		visited.add(serviceName);

		// Process dependencies first
		const deps = services[serviceName]?.depends_on || {};
		if (typeof deps === 'object') {
			// Handle both array format and object format of depends_on
			const depNames = Array.isArray(deps) ? deps : Object.keys(deps);
			for (const dep of depNames) {
				visit(dep);
			}
		}

		result.push(serviceName);
	}

	// Visit all services
	Object.keys(services).forEach(visit);

	return result;
}

/**
 * Builds container creation options from service configuration
 */
async function buildContainerOptions(docker: Dockerode, stackId: string, serviceName: string, serviceConfig: any, stackDir: string, composeData: any): Promise<any> {
	const options: any = {
		name: serviceConfig.container_name || `${stackId}_${serviceName}`,
		Image: serviceConfig.image,
		Tty: serviceConfig.tty || false,
		OpenStdin: serviceConfig.stdin_open || false,
		StopSignal: serviceConfig.stop_signal,
		StopTimeout: serviceConfig.stop_grace_period ? parseInt(serviceConfig.stop_grace_period.replace(/s$/, '')) : undefined,
		Hostname: serviceConfig.hostname || serviceName,
		Domainname: serviceConfig.domainname,
		User: serviceConfig.user,
		WorkingDir: serviceConfig.working_dir,
		Labels: {
			'com.docker.compose.project': stackId,
			'com.docker.compose.service': serviceName,
			...serviceConfig.labels
		}
	};

	// Handle command
	if (serviceConfig.command) {
		if (typeof serviceConfig.command === 'string') {
			options.Cmd = serviceConfig.command.split(/\s+/);
		} else {
			options.Cmd = serviceConfig.command;
		}
	}

	// Handle entrypoint
	if (serviceConfig.entrypoint) {
		if (typeof serviceConfig.entrypoint === 'string') {
			options.Entrypoint = serviceConfig.entrypoint.split(/\s+/);
		} else {
			options.Entrypoint = serviceConfig.entrypoint;
		}
	}

	// Handle environment variables
	if (serviceConfig.environment) {
		options.Env = [];
		if (Array.isArray(serviceConfig.environment)) {
			options.Env = serviceConfig.environment;
		} else {
			for (const [key, value] of Object.entries(serviceConfig.environment)) {
				options.Env.push(`${key}=${value}`);
			}
		}
	}

	// Add .env file variables to container environment
	const envVars = composeData._envVars || {};
	for (const [key, value] of Object.entries(envVars)) {
		// Only add if not already set by service config
		if (!options.Env || !options.Env.some((env: string) => env.startsWith(`${key}=`))) {
			options.Env = options.Env || [];
			options.Env.push(`${key}=${value}`);
		}
	}

	// Handle ports
	if (serviceConfig.ports) {
		options.ExposedPorts = {};
		options.HostConfig = options.HostConfig || {};
		options.HostConfig.PortBindings = {};

		for (const portMapping of serviceConfig.ports) {
			let hostPort, containerPort, protocol;

			if (typeof portMapping === 'string') {
				const parts = portMapping.split(':');
				if (parts.length === 1) {
					containerPort = parts[0];
					hostPort = parts[0];
				} else {
					hostPort = parts[0];
					containerPort = parts[1];
				}

				// Handle protocol specification
				const protocolParts = containerPort.split('/');
				if (protocolParts.length > 1) {
					containerPort = protocolParts[0];
					protocol = protocolParts[1];
				} else {
					protocol = 'tcp';
				}
			} else {
				hostPort = portMapping.published;
				containerPort = portMapping.target;
				protocol = portMapping.protocol || 'tcp';
			}

			const containerPortWithProtocol = `${containerPort}/${protocol}`;
			options.ExposedPorts[containerPortWithProtocol] = {};
			options.HostConfig.PortBindings[containerPortWithProtocol] = [{ HostPort: hostPort.toString() }];
		}
	}

	// Handle volumes
	if (serviceConfig.volumes) {
		options.HostConfig = options.HostConfig || {};
		options.HostConfig.Binds = [];

		for (const volume of serviceConfig.volumes) {
			let source, target, mode;

			if (typeof volume === 'string') {
				const parts = volume.split(':');
				if (parts.length === 1) {
					// Anonymous volume
					target = parts[0];
					options.Volumes = options.Volumes || {};
					options.Volumes[target] = {};
					continue;
				} else {
					source = parts[0];
					target = parts[1];
					mode = parts[2] || 'rw';
				}
			} else {
				source = volume.source;
				target = volume.target;
				mode = volume.read_only ? 'ro' : 'rw';
			}

			// Handle named volumes vs bind mounts
			if (source.startsWith('.') || source.startsWith('/')) {
				// It's a bind mount - resolve relative paths
				if (source.startsWith('.')) {
					source = path.resolve(stackDir, source);
				}
			} else {
				// It's a named volume
				if (composeData.volumes && composeData.volumes[source]) {
					// Use the full volume name from the volumes section
					const volumeConfig = composeData.volumes[source];
					if (volumeConfig && !volumeConfig.external) {
						source = volumeConfig.name || `${stackId}_${source}`;
					}
				} else {
					// Fallback to default Docker volume naming
					source = `${stackId}_${source}`;
				}
			}

			options.HostConfig.Binds.push(`${source}:${target}:${mode}`);
		}
	}

	// Handle restart policy
	if (serviceConfig.restart) {
		options.HostConfig = options.HostConfig || {};
		options.HostConfig.RestartPolicy = parseRestartPolicy(serviceConfig.restart);
	}

	// Handle network mode
	if (serviceConfig.network_mode) {
		options.HostConfig = options.HostConfig || {};
		options.HostConfig.NetworkMode = serviceConfig.network_mode;
	} else {
		// Determine the network to use
		let networkName;

		if (serviceConfig.networks && Object.keys(serviceConfig.networks).length > 0) {
			// Use the first specified network
			const defaultNetwork = Object.keys(serviceConfig.networks)[0];
			const networkConfig = composeData.networks?.[defaultNetwork];

			if (networkConfig) {
				networkName = networkConfig.name || (networkConfig.external ? defaultNetwork : `${stackId}_${defaultNetwork}`);
			} else {
				// If network config not found but name specified, use stack-prefixed name
				networkName = `${stackId}_${defaultNetwork}`;
			}
		} else {
			// No networks specified, use the default network
			networkName = `${stackId}_default`;
		}

		console.log(`Setting network mode for ${serviceName} to: ${networkName}`);
		options.HostConfig = options.HostConfig || {};
		options.HostConfig.NetworkMode = networkName;
	}

	// Handle devices
	if (serviceConfig.devices) {
		options.HostConfig = options.HostConfig || {};
		options.HostConfig.Devices = serviceConfig.devices.map((device: string) => {
			const parts = device.split(':');
			if (parts.length === 1) {
				return { PathOnHost: parts[0], PathInContainer: parts[0], CgroupPermissions: 'rwm' };
			} else if (parts.length === 2) {
				return { PathOnHost: parts[0], PathInContainer: parts[1], CgroupPermissions: 'rwm' };
			} else {
				return { PathOnHost: parts[0], PathInContainer: parts[1], CgroupPermissions: parts[2] };
			}
		});
	}

	// Handle capabilities
	if (serviceConfig.cap_add || serviceConfig.cap_drop) {
		options.HostConfig = options.HostConfig || {};
		if (serviceConfig.cap_add) {
			options.HostConfig.CapAdd = serviceConfig.cap_add;
		}
		if (serviceConfig.cap_drop) {
			options.HostConfig.CapDrop = serviceConfig.cap_drop;
		}
	}

	// Handle privileged mode
	if (serviceConfig.privileged) {
		options.HostConfig = options.HostConfig || {};
		options.HostConfig.Privileged = true;
	}

	// Handle healthcheck
	if (serviceConfig.healthcheck) {
		options.Healthcheck = {
			Test: serviceConfig.healthcheck.test,
			Interval: parseTimeString(serviceConfig.healthcheck.interval, 30000000000), // 30s default
			Timeout: parseTimeString(serviceConfig.healthcheck.timeout, 30000000000), // 30s default
			Retries: serviceConfig.healthcheck.retries || 3,
			StartPeriod: parseTimeString(serviceConfig.healthcheck.start_period, 0) // 0 default
		};

		if (serviceConfig.healthcheck.disable === true) {
			options.Healthcheck = { Test: ['NONE'] };
		}
	}

	// Handle logging
	if (serviceConfig.logging) {
		options.HostConfig = options.HostConfig || {};
		options.HostConfig.LogConfig = {
			Type: serviceConfig.logging.driver || 'json-file',
			Config: serviceConfig.logging.options || {}
		};
	}

	return options;
}

/**
 * Parses a time string to nanoseconds (Docker API format)
 */
function parseTimeString(timeStr: string | undefined, defaultValue: number): number {
	if (!timeStr) return defaultValue;

	const match = timeStr.match(/^(\d+)(ms|s|m|h)$/);
	if (!match) return defaultValue;

	const value = parseInt(match[1]);
	const unit = match[2];

	const multipliers: Record<string, number> = {
		ms: 1000000, // milliseconds to nanoseconds
		s: 1000000000, // seconds to nanoseconds
		m: 60000000000, // minutes to nanoseconds
		h: 3600000000000 // hours to nanoseconds
	};

	return value * multipliers[unit];
}

/**
 * Parses restart policy string to Docker format
 */
function parseRestartPolicy(policy: string): any {
	if (policy === 'no' || policy === 'none') {
		return { Name: 'no' };
	} else if (policy === 'always') {
		return { Name: 'always' };
	} else if (policy === 'unless-stopped') {
		return { Name: 'unless-stopped' };
	} else if (policy.startsWith('on-failure')) {
		const parts = policy.split(':');
		if (parts.length > 1) {
			return { Name: 'on-failure', MaximumRetryCount: parseInt(parts[1]) };
		} else {
			return { Name: 'on-failure' };
		}
	}

	// Default
	return { Name: 'no' };
}

/**
 * Cleans up containers from a failed stack deployment
 */
async function cleanupFailedDeployment(stackId: string): Promise<void> {
	console.log(`Cleaning up containers for failed deployment of stack ${stackId}...`);
	const docker = await getDockerClient();
	const composeProjectLabel = 'com.docker.compose.project';

	try {
		// Find containers belonging to this stack
		const containers = await docker.listContainers({
			all: true,
			filters: JSON.stringify({
				label: [`${composeProjectLabel}=${stackId}`]
			})
		});

		// Also find by name convention as fallback
		const containersByName = await docker.listContainers({
			all: true,
			filters: JSON.stringify({
				name: [`${stackId}_`]
			})
		});

		// Combine the results (removing duplicates)
		const allContainerIds = new Set([...containers.map((c) => c.Id), ...containersByName.map((c) => c.Id)]);

		// Stop and remove all containers
		for (const containerId of allContainerIds) {
			const container = docker.getContainer(containerId);

			try {
				const containerInfo = await container.inspect();
				if (containerInfo.State.Running) {
					console.log(`Stopping container ${containerInfo.Name}...`);
					await container.stop();
				}

				console.log(`Removing container ${containerInfo.Name}...`);
				await container.remove();
			} catch (err) {
				console.warn(`Error cleaning up container ${containerId}:`, err);
			}
		}

		console.log(`Cleanup completed for stack ${stackId}.`);
	} catch (err) {
		console.error(`Error during cleanup of stack ${stackId}:`, err);
		throw err;
	}
}

/**
 * Stops a stack by stopping and removing all containers
 */
export async function stopStack(stackId: string): Promise<boolean> {
	console.log(`Stopping stack ${stackId}...`);
	try {
		await cleanupFailedDeployment(stackId);
		stackCache.delete('compose-stacks');
		return true;
	} catch (err) {
		console.error(`Error stopping stack ${stackId}:`, err);
		throw new Error(`Failed to stop stack: ${err instanceof Error ? err.message : String(err)}`);
	}
}
