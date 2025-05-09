import { promises as fs } from 'node:fs';
import path, { join } from 'node:path';
import { basename } from 'node:path';
import DockerodeCompose from 'dockerode-compose';
import yaml from 'js-yaml';
import { nanoid } from 'nanoid';
import slugify from 'slugify';
import { directoryExists } from '$lib/utils/fs.utils';
import { getDockerClient } from '$lib/services/docker/core';
import { getSettings, ensureStacksDirectory } from '$lib/services/settings-service';
import type { Stack, StackMeta, StackService, StackUpdate } from '$lib/types/docker/stack.type';

/* The above code is declaring a variable `STACKS_DIR` with an empty string as its initial value in
TypeScript. */
let STACKS_DIR = '';

/**
 * The function `initComposeService` initializes the stacks directory and ensures its existence in a
 * TypeScript application.
 */
export async function initComposeService(): Promise<void> {
	try {
		const settings = await getSettings();
		STACKS_DIR = settings.stacksDirectory;
		console.log(`Stacks directory initialized: ${STACKS_DIR}`);

		await ensureStacksDir();
	} catch (err) {
		console.error('Error initializing compose service:', err);
	}
}

/**
 * The function `updateStacksDirectory` updates the `STACKS_DIR` variable with a new directory path and
 * logs the updated directory path to the console.
 * @param {string} directory - The `directory` parameter is a string that represents the new directory
 * path that you want to set for the `STACKS_DIR` variable. When the `updateStacksDirectory` function
 * is called with a valid `directory` value, it updates the `STACKS_DIR` variable to the new directory
 */
export function updateStacksDirectory(directory: string): void {
	if (directory) {
		STACKS_DIR = directory;
		console.log(`Stacks directory updated to: ${STACKS_DIR}`);
	}
}

/**
 * The function `ensureStacksDir` ensures the existence of a directory for storing stacks.
 * @returns The function `ensureStacksDir()` returns the `STACKS_DIR` variable after ensuring that the
 * stacks directory exists.
 */
export async function ensureStacksDir(): Promise<string> {
	try {
		if (!STACKS_DIR) {
			STACKS_DIR = await ensureStacksDirectory();
		} else {
			await fs.mkdir(STACKS_DIR, { recursive: true });
		}
		return STACKS_DIR;
	} catch (err) {
		console.error('Error creating stacks directory:', err);
		throw new Error('Failed to create stacks storage directory');
	}
}

/**
 * Returns the stack directory for a given stackId (unchanged)
 */
async function getStackDir(stackId: string): Promise<string> {
	const stacksDir = await ensureStacksDir();
	const safeId = basename(stackId);
	if (safeId !== stackId) {
		throw new Error('Invalid stack id');
	}
	return join(stacksDir, safeId);
}

/**
 * Returns the path to the compose file, prioritizing compose.yaml, fallback to docker-compose.yml
 */
async function getComposeFilePath(stackId: string): Promise<string> {
	const stackDir = await getStackDir(stackId);
	const newPath = join(stackDir, 'compose.yaml');
	const oldPath = join(stackDir, 'docker-compose.yml');
	try {
		await fs.access(newPath);
		return newPath;
	} catch {
		await fs.access(oldPath);
		return oldPath;
	}
}

/**
 * Returns the path to the meta file, prioritizing .stack.json, fallback to meta.json
 */
async function getStackMetaPath(stackId: string): Promise<string> {
	const stackDir = await getStackDir(stackId);
	const newPath = join(stackDir, '.stack.json');
	const oldPath = join(stackDir, 'meta.json');
	try {
		await fs.access(newPath);
		return newPath;
	} catch {
		await fs.access(oldPath);
		return oldPath;
	}
}

/**
 * Returns the path to the .env file (no fallback needed, just .env)
 */
async function getEnvFilePath(stackId: string): Promise<string> {
	const stackDir = await getStackDir(stackId);
	return join(stackDir, '.env');
}

/**
 * Saves environment variables to a .env file in the stack directory
 * Handles empty content gracefully
 */
async function saveEnvFile(stackId: string, content?: string): Promise<void> {
	const envPath = await getEnvFilePath(stackId);

	// Create a new local variable instead of reassigning the parameter
	const fileContent = content === undefined || content === null ? '' : content;

	await fs.writeFile(envPath, fileContent, 'utf8');
	console.log(`Saved .env file for stack ${stackId}`);
}

/**
 * Loads environment variables from a .env file in the stack directory
 * Returns empty string if the file doesn't exist
 */
async function loadEnvFile(stackId: string): Promise<string> {
	const envPath = await getEnvFilePath(stackId);

	try {
		return await fs.readFile(envPath, 'utf8');
	} catch (err) {
		const nodeErr = err as NodeJS.ErrnoException;
		// Return empty string if file doesn't exist
		if (nodeErr.code === 'ENOENT') {
			console.log(`No .env file found for stack ${stackId}`);
			return '';
		}
		console.error(`Error reading .env file for stack ${stackId}:`, err);
		throw new Error(`Failed to read .env file: ${nodeErr.message}`, { cause: err });
	}
}

/**
 * The function `getComposeInstance` returns a new instance of `DockerodeCompose` using a Docker
 * client, compose file path, and stack ID.
 * @param {string} stackId - The `stackId` parameter is a string that represents the identifier of a
 * Docker stack. It is used to retrieve the compose file path and create a new instance of
 * `DockerodeCompose` with the specified stack identifier.
 * @returns The function `getComposeInstance` is returning a Promise that resolves to an instance of
 * `DockerodeCompose`. The `DockerodeCompose` instance is created using the Docker client obtained from
 * `getDockerClient()`, the compose file path obtained asynchronously from
 * `getComposeFilePath(stackId)`, and the `stackId` parameter.
 */
async function getComposeInstance(stackId: string): Promise<DockerodeCompose> {
	const docker = getDockerClient();
	const composePath = await getComposeFilePath(stackId);
	return new DockerodeCompose(docker, composePath, stackId);
}

/**
 * This TypeScript function retrieves information about services in a Docker stack based on the
 * provided stack ID and compose file content.
 * @param {string} stackId - The `stackId` parameter in the `getStackServices` function is a string
 * that represents the identifier of a stack in a Docker environment. This identifier is used to filter
 * and identify containers associated with the specific stack.
 * @param {string} composeContent - The `composeContent` parameter in the `getStackServices` function
 * is expected to be a string containing the content of a Docker Compose file in YAML format. This file
 * defines the services that make up a stack in Docker. The function parses this content to extract
 * service names and then retrieves information about
 * @returns The `getStackServices` function returns a Promise that resolves to an array of
 * `StackService` objects. Each `StackService` object contains information about a service in a
 * specific stack, including the service ID, name, and state (whether it is running, its status, and
 * exit code). If an error occurs during the process, an empty array is returned.
 */
async function getStackServices(stackId: string, composeContent: string): Promise<StackService[]> {
	const docker = getDockerClient();
	const composeProjectLabel = 'com.docker.compose.project'; // Standard label
	const composeServiceLabel = 'com.docker.compose.service'; // Standard service label

	try {
		const composeData = yaml.load(composeContent) as any;
		if (!composeData || !composeData.services) {
			console.warn(`No services found in compose content for stack ${stackId}`);
			return [];
		}

		const serviceNames = Object.keys(composeData.services);

		// List containers, potentially filtering by label for efficiency if needed
		const containers = await docker.listContainers({
			all: true
			// Optional: Filter directly using Docker API if performance becomes an issue
			// filters: JSON.stringify({ label: [`${composeProjectLabel}=${stackId}`] })
		});

		// Filter containers based on EITHER the project label OR the naming convention
		const stackContainers = containers.filter((container) => {
			const labels = container.Labels || {};
			const names = container.Names || [];
			// Check if any name starts with the conventional prefix (e.g., /stackId_service_1)
			const nameStartsWithPrefix = names.some((name) => name.startsWith(`/${stackId}_`));
			// Check if the standard compose project label matches the stackId
			const hasCorrectLabel = labels[composeProjectLabel] === stackId;
			// Include the container if either condition is true
			return nameStartsWithPrefix || hasCorrectLabel;
		});

		if (stackContainers.length === 0) {
			console.log(`No running or stopped containers found for stack ${stackId} based on name prefix or label.`);
		}

		const services: StackService[] = [];

		for (const containerData of stackContainers) {
			const containerName = containerData.Names?.[0]?.substring(1) || ''; // Remove leading '/'
			const labels = containerData.Labels || {};
			// Prefer the standard compose service label for the service name
			let serviceName = labels[composeServiceLabel];

			// Fallback to parsing from container name if the service label is missing
			if (!serviceName) {
				console.warn(`Container ${containerData.Id} in stack ${stackId} is missing the '${composeServiceLabel}' label. Attempting to parse name.`);
				for (const name of serviceNames) {
					// Match patterns like stackId_serviceName_1 or stackId_serviceName
					// Ensure the match is precise to avoid partial overlaps (e.g., 'web' vs 'web-api')
					const servicePrefixWithUnderscore = `${stackId}_${name}_`;
					const servicePrefixExact = `${stackId}_${name}`;
					if (containerName.startsWith(servicePrefixWithUnderscore) || containerName === servicePrefixExact) {
						serviceName = name;
						break;
					}
				}
			}

			// Final fallback if still no match (less ideal)
			if (!serviceName) {
				serviceName = containerName; // Use the full container name as a last resort
				console.error(`Could not determine service name for container ${containerName} (ID: ${containerData.Id}) in stack ${stackId}. Using full container name.`);
			}

			const service: StackService = {
				id: containerData.Id,
				name: serviceName, // Use the determined service name
				state: {
					Running: containerData.State === 'running',
					Status: containerData.State,
					// Note: listContainers doesn't provide ExitCode reliably, need inspect for that if required later
					ExitCode: containerData.State === 'exited' ? -1 : 0 // Placeholder
				}
			};

			// Avoid adding duplicates if multiple containers map to the same service (e.g., scaled services)
			// Check if a service with the same name already exists
			const existingServiceIndex = services.findIndex((s) => s.name === serviceName);
			if (existingServiceIndex !== -1) {
				// If the existing service is just a placeholder ('not created'), replace it
				if (!services[existingServiceIndex].id) {
					services[existingServiceIndex] = service;
				} else {
					// Handle scaled services - maybe add instance number or just log for now
					console.log(`Multiple containers found for service ${serviceName} in stack ${stackId}. Displaying first found.`);
					// Or potentially create a unique name like serviceName + '-' + instanceNumber
				}
			} else {
				services.push(service);
			}
		}

		// Add placeholders for services defined in compose but not found among listed containers
		for (const name of serviceNames) {
			if (!services.some((s) => s.name === name)) {
				services.push({
					id: '', // No container ID
					name: name,
					state: {
						Running: false,
						Status: 'not created',
						ExitCode: 0
					}
				});
			}
		}

		// Sort services alphabetically by name for consistent order
		services.sort((a, b) => a.name.localeCompare(b.name));

		return services;
	} catch (err) {
		console.error(`Error getting services for stack ${stackId}:`, err);
		return []; // Return empty array on error
	}
}

/**
 * This TypeScript function asynchronously loads information about Docker Compose stacks from a
 * directory and returns an array of Stack objects.
 * @returns The `loadComposeStacks` function returns a Promise that resolves to an array of `Stack`
 * objects. Each `Stack` object represents a stack loaded from the stacks directory. The `Stack` object
 * contains properties such as `id`, `name`, `serviceCount`, `runningCount`, `status`, `createdAt`, and
 * `updatedAt`.
 */
export async function loadComposeStacks(): Promise<Stack[]> {
	const stacksDir = await ensureStacksDir();

	try {
		const stackDirs = await fs.readdir(stacksDir);
		const stacks: Stack[] = [];

		for (const dir of stackDirs) {
			const stackDir = path.join(stacksDir, dir);

			// Skip if not a directory (e.g., .DS_Store or other files)
			let stat;
			try {
				stat = await fs.stat(stackDir);
			} catch {
				continue;
			}
			if (!stat.isDirectory()) continue;

			try {
				const newMetaPath = path.join(stackDir, '.stack.json');
				const newComposePath = path.join(stackDir, 'compose.yaml');

				let metaContent: string;
				let composeContent: string;
				let meta: StackMeta;

				try {
					[metaContent, composeContent] = await Promise.all([fs.readFile(newMetaPath, 'utf8'), fs.readFile(newComposePath, 'utf8')]);
					meta = JSON.parse(metaContent) as StackMeta;
				} catch (newWayErr) {
					// Fallback to old way
					const oldMetaPath = await getStackMetaPath(dir);
					const oldComposePath = await getComposeFilePath(dir);

					[metaContent, composeContent] = await Promise.all([fs.readFile(oldMetaPath, 'utf8'), fs.readFile(oldComposePath, 'utf8')]);
					meta = JSON.parse(metaContent) as StackMeta;
				}

				const services = await getStackServices(dir, composeContent);

				const serviceCount = services.length;
				const runningCount = services.filter((s) => s.state?.Running).length;

				let status: Stack['status'] = 'stopped';
				if (runningCount === serviceCount && serviceCount > 0) {
					status = 'running';
				} else if (runningCount > 0) {
					status = 'partially running';
				}

				const isLegacy = !(await fs.access(path.join(stackDir, '.stack.json')).then(
					() => true,
					() => false
				));

				stacks.push({
					id: dir,
					name: meta.name,
					serviceCount,
					runningCount,
					status,
					createdAt: meta.createdAt,
					updatedAt: meta.updatedAt,
					isLegacy
				});
			} catch (err) {
				console.warn(`Error loading stack ${dir}:`, err);
			}
		}

		return stacks;
	} catch (err) {
		console.error('Error loading stacks:', err);
		throw new Error('Failed to load compose stacks');
	}
}

/**
 * Creates a new stack with a compose file and optional .env file
 */
export async function createStack(name: string, composeContent: string, envContent?: string): Promise<Stack> {
	// Generate a unique ID for references (still needed for APIs)
	const id = nanoid();

	// Create a safe directory name from the stack name
	const dirName = slugify(name, {
		lower: true, // Convert to lowercase
		strict: true, // Strip special chars
		replacement: '-', // Replace spaces with hyphens
		trim: true // Trim leading/trailing spaces
	});

	// Ensure directory name is unique - add suffix if needed
	const stacksDir = await ensureStacksDirectory();
	let counter = 1;
	let uniqueDirName = dirName;

	while (await directoryExists(join(stacksDir, uniqueDirName))) {
		uniqueDirName = `${dirName}-${counter}`;
		counter++;
	}

	// Create stack directory with the name-based folder
	const stackDir = join(stacksDir, uniqueDirName);
	await fs.mkdir(stackDir, { recursive: true });

	// Save compose file
	await fs.writeFile(join(stackDir, 'compose.yaml'), composeContent);

	// Save env file if provided
	if (envContent) {
		await fs.writeFile(join(stackDir, '.env'), envContent);
	}

	// Create stack metadata file with the ID reference
	const meta = {
		id,
		name,
		dirName: uniqueDirName,
		path: stackDir,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};

	await fs.writeFile(join(stackDir, '.stack.json'), JSON.stringify(meta, null, 2));

	let serviceCount = 0;
	try {
		const composeData = yaml.load(composeContent) as any;
		if (composeData?.services) {
			serviceCount = Object.keys(composeData.services).length;
		}
	} catch (parseErr) {
		console.warn(`Could not parse compose file during creation for stack ${meta.name}:`, parseErr);
	}

	return {
		id: meta.id,
		name: meta.name,
		serviceCount: serviceCount,
		runningCount: 0,
		status: 'stopped',
		createdAt: meta.createdAt,
		updatedAt: meta.updatedAt,
		composeContent: composeContent,
		envContent: envContent || '',
		meta
	};
}

/**
 * Gets information about a specific stack including its .env file
 */
export async function getStack(stackId: string): Promise<Stack> {
	try {
		// Try the new way first (.stack.json and compose.yaml)
		const stackDir = await getStackDir(stackId);
		const newMetaPath = path.join(stackDir, '.stack.json');
		const newComposePath = path.join(stackDir, 'compose.yaml');

		let metaContent: string;
		let composeContent: string;
		let envContent: string;
		let meta: StackMeta;

		try {
			[metaContent, composeContent, envContent] = await Promise.all([fs.readFile(newMetaPath, 'utf8'), fs.readFile(newComposePath, 'utf8'), loadEnvFile(stackId)]);
			meta = JSON.parse(metaContent) as StackMeta;
		} catch (newWayErr) {
			// If new way fails, fall back to old way (meta.json and docker-compose.yml)
			const oldMetaPath = await getStackMetaPath(stackId);
			const oldComposePath = await getComposeFilePath(stackId);

			[metaContent, composeContent, envContent] = await Promise.all([fs.readFile(oldMetaPath, 'utf8'), fs.readFile(oldComposePath, 'utf8'), loadEnvFile(stackId)]);
			meta = JSON.parse(metaContent) as StackMeta;
		}

		const services = await getStackServices(stackId, composeContent);
		const serviceCount = services.length;
		const runningCount = services.filter((s) => s.state?.Running).length;

		let status: Stack['status'] = 'stopped';
		if (runningCount === serviceCount && serviceCount > 0) {
			status = 'running';
		} else if (runningCount > 0) {
			status = 'partially running';
		}

		return {
			id: stackId,
			name: meta.name,
			services,
			serviceCount,
			runningCount,
			status,
			createdAt: meta.createdAt,
			updatedAt: meta.updatedAt,
			composeContent,
			envContent,
			meta
		};
	} catch (err) {
		console.error(`Error getting stack ${stackId}:`, err);
		throw new Error(`Stack not found or cannot be accessed`);
	}
}

/**
 * Updates a stack with new configuration and/or .env file
 */
export async function updateStack(stackId: string, updates: StackUpdate): Promise<Stack> {
	const metaPath = await getStackMetaPath(stackId);
	const composePath = await getComposeFilePath(stackId);

	try {
		const metaContent = await fs.readFile(metaPath, 'utf8');
		const meta = JSON.parse(metaContent) as StackMeta;

		const updatedMeta: StackMeta = {
			...meta,
			name: updates.name || meta.name,
			updatedAt: new Date().toISOString(),
			...(updates.autoUpdate !== undefined ? { autoUpdate: updates.autoUpdate } : {})
		};

		const promises = [fs.writeFile(metaPath, JSON.stringify(updatedMeta, null, 2), 'utf8')];

		if (updates.composeContent) {
			promises.push(fs.writeFile(composePath, updates.composeContent, 'utf8'));
		}

		if (updates.envContent !== undefined) {
			promises.push(saveEnvFile(stackId, updates.envContent));
		}

		await Promise.all(promises);

		const composeContent = updates.composeContent || (await fs.readFile(composePath, 'utf8'));
		const envContent = updates.envContent !== undefined ? updates.envContent : await loadEnvFile(stackId);

		const services = await getStackServices(stackId, composeContent);

		const serviceCount = services.length;
		const runningCount = services.filter((s) => s.state?.Running).length;

		let status: Stack['status'] = 'stopped';
		if (runningCount === serviceCount && serviceCount > 0) {
			status = 'running';
		} else if (runningCount > 0) {
			status = 'partially running';
		}

		return {
			id: stackId,
			name: updatedMeta.name,
			serviceCount,
			runningCount,
			status,
			createdAt: updatedMeta.createdAt,
			updatedAt: updatedMeta.updatedAt,
			composeContent,
			envContent
		};
	} catch (err) {
		console.error(`Error updating stack ${stackId}:`, err);
		throw new Error('Failed to update stack');
	}
}

/**
 * The function `startStack` asynchronously starts a Docker stack identified by `stackId`, pulling the
 * latest images and bringing up the services.
 * @param {string} stackId - The `stackId` parameter is a string that represents the identifier of the
 * stack that you want to start.
 * @returns The `startStack` function returns a `Promise<boolean>`.
 */
export async function startStack(stackId: string): Promise<boolean> {
	try {
		const compose = await getComposeInstance(stackId);
		await compose.pull();
		await compose.up();
		return true;
	} catch (err: unknown) {
		console.error(`Error starting stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to start stack: ${errorMessage}`);
	}
}

/**
 * The function `stopStack` stops a Docker stack identified by its ID and returns a boolean indicating
 * success. It manually stops and removes containers associated with the stack due to potential
 * inconsistencies in `dockerode-compose`.
 * @param {string} stackId - The `stackId` parameter is a string that represents the identifier of the
 * stack that you want to stop.
 * @returns The `stopStack` function returns a Promise that resolves to a boolean value. If the stack
 * is stopped successfully, it returns `true`. If an error occurs during the process of stopping the
 * stack, it will log the error, throw a new Error with a message indicating the failure, and the
 * Promise will be rejected.
 */
export async function stopStack(stackId: string): Promise<boolean> {
	console.log(`Attempting to stop stack ${stackId} by manually stopping containers...`);
	const docker = getDockerClient();
	const composeProjectLabel = 'com.docker.compose.project';
	let stoppedCount = 0;
	let removedCount = 0;

	try {
		// 1. Find containers belonging to the stack (using label or name convention)
		const containers = await docker.listContainers({
			all: true, // Include stopped containers as well
			filters: JSON.stringify({
				// Primarily filter by the standard compose project label
				label: [`${composeProjectLabel}=${stackId}`]
			})
		});

		// Fallback: If label filter missed some, double-check by name (less reliable)
		// This part might be less necessary if the label is consistently applied by `up()`
		const allContainers = await docker.listContainers({ all: true });
		const nameFilteredContainers = allContainers.filter(
			(c) =>
				!containers.some((fc) => fc.Id === c.Id) && // Only check containers not already found by label
				(c.Labels?.[composeProjectLabel] === stackId || c.Names?.some((name) => name.startsWith(`/${stackId}_`)))
		);
		const seen = new Set<string>();
		const stackContainers = [...containers, ...nameFilteredContainers].filter((c) => {
			if (seen.has(c.Id)) return false;
			seen.add(c.Id);
			return true;
		});

		if (stackContainers.length === 0) {
			return true; // Nothing to stop
		}

		console.log(`Found ${stackContainers.length} containers for stack ${stackId}. Attempting to stop and remove...`);

		// 2. Stop and Remove each container
		for (const containerInfo of stackContainers) {
			console.log(`Processing container ${containerInfo.Names?.[0]} (ID: ${containerInfo.Id})...`);
			const container = docker.getContainer(containerInfo.Id);
			try {
				// Stop the container if it's running
				if (containerInfo.State === 'running') {
					console.log(`Stopping container ${containerInfo.Id}...`);
					await container.stop(); // Consider adding a timeout option: { t: 10 }
					console.log(`Container ${containerInfo.Id} stopped.`);
					stoppedCount++;
				} else {
					console.log(`Container ${containerInfo.Id} is already stopped (State: ${containerInfo.State}).`);
				}

				// Remove the container
				console.log(`Removing container ${containerInfo.Id}...`);
				await container.remove({ force: true }); // Use force to ensure removal even if stopped uncleanly
				console.log(`Container ${containerInfo.Id} removed.`);
				removedCount++;
			} catch (containerErr) {
				// Log error for specific container but continue with others
				console.error(`Error processing container ${containerInfo.Id} for stack ${stackId}:`, containerErr);
				// Optionally decide if this should cause the whole function to fail
			}
		}

		// 3. (Optional) Remove networks associated with the stack
		try {
			const networks = await docker.listNetworks({
				filters: JSON.stringify({
					label: [`${composeProjectLabel}=${stackId}`]
				})
			});
			if (networks.length > 0) {
				console.log(`Found ${networks.length} networks for stack ${stackId}. Attempting to remove...`);
				for (const networkInfo of networks) {
					console.log(`Removing network ${networkInfo.Name} (ID: ${networkInfo.Id})...`);
					const network = docker.getNetwork(networkInfo.Id);
					try {
						await network.remove();
						console.log(`Network ${networkInfo.Name} removed.`);
					} catch (networkErr) {
						console.error(`Error removing network ${networkInfo.Name} (ID: ${networkInfo.Id}):`, networkErr);
					}
				}
			} else {
				console.log(`No networks found specifically for stack ${stackId}.`);
			}
		} catch (networkListErr) {
			console.error(`Error listing networks for stack ${stackId}:`, networkListErr);
		}

		console.log(`Stack ${stackId} processing complete. Stopped: ${stoppedCount}, Removed: ${removedCount}.`);
		return true; // Indicate overall success even if some individual steps had errors (adjust if needed)
	} catch (err: unknown) {
		// Log the specific error
		console.error(`Error during manual stop/remove for stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to stop stack ${stackId}: ${errorMessage}`);
	}
}

/**
 * The `restartStack` function asynchronously restarts a Docker stack identified by its ID, handling
 * errors and returning a boolean indicating success.
 * @param {string} stackId - The `stackId` parameter is a string that represents the identifier of the
 * stack that you want to restart.
 * @returns The `restartStack` function returns a `Promise<boolean>`.
 */
export async function restartStack(stackId: string): Promise<boolean> {
	console.log(`Attempting to restart stack ${stackId}...`);
	try {
		// Use the manual stop logic
		const stopped = await stopStack(stackId);
		if (!stopped) {
			// If stopStack indicates failure (if you modify it to return false on error)
			console.error(`Restart failed because stop step failed for stack ${stackId}.`);
			return false;
		}

		// Now start it again using compose.up()
		console.log(`Starting stack ${stackId} after stopping...`);
		const compose = await getComposeInstance(stackId);
		await compose.up(); // Assuming compose.up() works correctly
		console.log(`Stack ${stackId} started.`);
		return true;
	} catch (err: unknown) {
		console.error(`Error restarting stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to restart stack: ${errorMessage}`);
	}
}

/**
 * The function `fullyRedployStack` asynchronously stops, pulls latest images, and restarts a
 * specified stack, returning true if successful.
 * @param {string} stackId - The `stackId` parameter in the `fullyRedeployStack` function is a string
 * that represents the identifier of the stack that you want to fully redeploy. This function stops the
 * stack, pulls the latest images, and then starts the stack again to ensure a full redeployment of the
 * specified
 * @returns The `fullyRedeployStack` function returns a `Promise<boolean>`. The function attempts to
 * fully redeploy a stack by stopping it, pulling the latest images, and then starting it again. If all
 * commands succeed, the function resolves the promise with a value of `true`. If an error occurs
 * during the process, the function catches the error, logs it, and then throws a new `
 */
export async function fullyRedeployStack(stackId: string): Promise<boolean> {
	console.log(`Attempting to fully redeploy stack ${stackId}...`);
	try {
		// Use the manual stop logic
		const stopped = await stopStack(stackId);
		if (!stopped) {
			console.error(`Redeploy failed because stop step failed for stack ${stackId}.`);
			return false;
		}

		// Pull the latest images
		console.log(`Pulling images for stack ${stackId}...`);
		const compose = await getComposeInstance(stackId); // Get instance again for pull/up
		await compose.pull();
		console.log(`Images pulled for stack ${stackId}.`);

		// Start the stack again
		console.log(`Starting stack ${stackId} after pull...`);
		await compose.up();
		console.log(`Stack ${stackId} started.`);

		return true;
	} catch (err: unknown) {
		console.error(`Error fully redeploying stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to fully redeploy stack: ${errorMessage}`);
	}
}

/**
 * The function `removeStack` removes a Docker stack by stopping its services and deleting its
 * directory.
 * @param {string} stackId - The `stackId` parameter is a string that represents the unique identifier
 * of the stack that needs to be removed.
 * @returns The `removeStack` function returns a `Promise<boolean>`. The function attempts to remove a
 * stack identified by `stackId`. If the removal process is successful, it resolves the promise with a
 * value of `true`. If an error occurs during the removal process, it catches the error, logs it, and
 * then throws a new `Error` with a message indicating the failure to remove the stack.
 */
export async function removeStack(stackId: string): Promise<boolean> {
	console.log(`Attempting to remove stack ${stackId}...`);
	try {
		// Manually stop and remove containers first
		const stopped = await stopStack(stackId);
		if (!stopped) {
			console.error(`Removal failed because stop/remove container step failed for stack ${stackId}.`);
			// Decide if you want to proceed with directory removal anyway
			// return false; // Option 1: Stop here
		} else {
			console.log(`Containers for stack ${stackId} stopped and removed.`);
		}

		// Now remove the stack directory
		const stackDir = await getStackDir(stackId);
		console.log(`Removing stack directory ${stackDir}...`);
		try {
			await fs.rm(stackDir, { recursive: true, force: true });
			console.log(`Stack directory ${stackDir} removed.`);
		} catch (e) {
			console.error(`Failed to remove stack directory ${stackDir}:`, e);
			// Even if containers were removed, directory removal failed
			throw new Error(`Failed to remove stack directory: ${e instanceof Error ? e.message : String(e)}`);
		}

		return true;
	} catch (err: unknown) {
		// Catch errors from stopStack or directory removal
		console.error(`Error removing stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		// Ensure a specific error message is thrown
		throw new Error(`Failed to remove stack ${stackId}: ${errorMessage}`);
	}
}

/**
 * The function `discoverExternalStacks` asynchronously discovers external Docker stacks and their
 * services, categorizing them based on their running status.
 * @returns The `discoverExternalStacks` function returns a Promise that resolves to an array of
 * `Stack` objects representing external stacks discovered by querying Docker containers. The `Stack`
 * objects contain information about the external stacks, such as the stack name, services, service
 * count, running service count, status (running, stopped, partially running), and timestamps for
 * creation and update. If an error occurs during the discovery
 */
export async function discoverExternalStacks(): Promise<Stack[]> {
	try {
		const docker = getDockerClient();
		const containers = await docker.listContainers({ all: true });

		const composeProjectLabel = 'com.docker.compose.project';
		const composeServiceLabel = 'com.docker.compose.service';

		const projectMap: Record<string, any[]> = {};

		containers.forEach((container) => {
			const labels = container.Labels || {};
			const projectName = labels[composeProjectLabel];

			if (projectName) {
				if (!projectMap[projectName]) {
					projectMap[projectName] = [];
				}

				projectMap[projectName].push({
					id: container.Id,
					name: labels[composeServiceLabel] || container.Names[0]?.substring(1),
					state: {
						Running: container.State === 'running',
						Status: container.State,
						ExitCode: 0
					}
				});
			}
		});

		const externalStacks: Stack[] = [];

		for (const [projectName, services] of Object.entries(projectMap)) {
			const stackDir = await getStackDir(projectName);
			try {
				await fs.access(stackDir);
				// Stack is managed by Arcane, skip it
				continue;
			} catch {
				// Stack is not managed by Arcane, include it
			}

			const serviceCount = services.length;
			const runningCount = services.filter((s) => s.state.Running).length;

			let status: Stack['status'] = 'stopped';
			if (runningCount === serviceCount && serviceCount > 0) {
				status = 'running';
			} else if (runningCount > 0) {
				status = 'partially running';
			}

			externalStacks.push({
				id: projectName,
				name: projectName,
				services,
				serviceCount,
				runningCount,
				status,
				isExternal: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		}

		return externalStacks;
	} catch (err) {
		console.error('Error discovering external stacks:', err);
		return [];
	}
}

/**
 * The function `importExternalStack` imports an external Docker stack by retrieving containers,
 * reading the compose file, and creating a new stack in Arcane's managed stacks.
 * @param {string} stackId - The `stackId` parameter is a string that represents the identifier of the
 * external stack that you want to import. It is used to locate the stack and its associated containers
 * in the Docker environment.
 * @returns The `importExternalStack` function returns a Promise that resolves to a `Stack` object.
 */
export async function importExternalStack(stackId: string): Promise<Stack> {
	// 1. First, check if we can find the stack by ID
	const docker = getDockerClient();
	const containers = await docker.listContainers({ all: true });

	// Filter containers that belong to this stack
	const stackContainers = containers.filter((container) => {
		const labels = container.Labels || {};
		return labels['com.docker.compose.project'] === stackId;
	});

	if (stackContainers.length === 0) {
		throw new Error(`No containers found for stack '${stackId}'`);
	}

	// 2. Try to locate the compose file (if available)
	let composeFilePath = '';
	const container = stackContainers[0];
	const labels = container.Labels || {};

	if (labels['com.docker.compose.project.config_files']) {
		composeFilePath = labels['com.docker.compose.project.config_files'];
	}

	// 3. Read the compose file if available, or create a new one
	let composeContent = '';

	if (composeFilePath) {
		try {
			composeContent = await fs.readFile(composeFilePath, 'utf8');
		} catch (err) {
			console.warn(`Couldn't read compose file at ${composeFilePath}:`, err);
			// Will generate a new one below
		}
	}

	// 4. If we couldn't read the compose file, generate one based on container inspection
	if (!composeContent) {
		// Create a basic compose file from container inspection
		const services: Record<string, any> = {};

		for (const container of stackContainers) {
			const containerLabels = container.Labels || {};
			const serviceName = containerLabels['com.docker.compose.service'] || container.Names[0]?.replace(`/${stackId}_`, '').replace('_1', '') || `service_${container.Id.substring(0, 8)}`;

			// Inspect the container to get more details
			const containerDetails = await docker.getContainer(container.Id).inspect();

			services[serviceName] = {
				image: container.Image
				// Add other properties based on containerDetails
			};
		}

		// Generate the compose file content
		composeContent = `# Generated compose file for imported stack: ${stackId}
# This was automatically generated by Arcane from an external stack
# You may need to adjust it manually for correct operation

version: '3'
services:
${yaml.dump({ services }).substring(10)}`; // Remove the services: line
	}

	// 5. Create a new stack in Arcane's managed stacks
	return await createStack(stackId, composeContent);
}

/**
 * Lists all managed and optionally external stacks
 */
export async function listStacks(includeExternal = false): Promise<Stack[]> {
	// Get managed stacks
	const managedStacks = await loadComposeStacks();

	// Add meta information to managed stacks
	const enrichedManagedStacks = await Promise.all(
		managedStacks.map(async (stack) => {
			try {
				// Read the meta file to get autoUpdate property
				const metaPath = await getStackMetaPath(stack.id);
				const metaContent = await fs.readFile(metaPath, 'utf8');
				const meta = JSON.parse(metaContent) as StackMeta;

				// Return stack with meta included
				return {
					...stack,
					meta
				};
			} catch (err) {
				console.warn(`Failed to read meta for stack ${stack.id}:`, err);
				return stack; // Return stack without meta if there was an error
			}
		})
	);

	// Get external stacks if requested
	let externalStacks: Stack[] = [];
	if (includeExternal) {
		externalStacks = await discoverExternalStacks();
	}

	// Combine managed and external stacks
	return [...enrichedManagedStacks, ...externalStacks];
}

/**
 * Checks if any service in the stack is currently running.
 * @param {string} stackId - The stack/project name or directory.
 * @returns {Promise<boolean>} - True if any container in the stack is running.
 */
export async function isStackRunning(stackId: string): Promise<boolean> {
	const docker = getDockerClient();
	const composeProjectLabel = 'com.docker.compose.project';

	try {
		// Find containers belonging to the stack (by label or name convention)
		const containers = await docker.listContainers({
			all: true,
			filters: JSON.stringify({
				label: [`${composeProjectLabel}=${stackId}`]
			})
		});

		// Fallback: Also check by name prefix if label is missing
		const allContainers = await docker.listContainers({ all: true });
		const nameFilteredContainers = allContainers.filter((c) => !containers.some((fc) => fc.Id === c.Id) && (c.Labels?.[composeProjectLabel] === stackId || c.Names?.some((name) => name.startsWith(`/${stackId}_`))));

		const stackContainers = [...containers, ...nameFilteredContainers];
		// If any container is running, the stack is considered running
		return stackContainers.some((c) => c.State === 'running');
	} catch (err) {
		console.error(`Error checking if stack ${stackId} is running:`, err);
		return false;
	}
}
