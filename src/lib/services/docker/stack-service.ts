import { promises as fs } from 'node:fs';
import path, { join, dirname } from 'node:path';
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
		if (!path.isAbsolute(directory)) {
			STACKS_DIR = path.resolve(directory); // Resolve to absolute path
		} else {
			STACKS_DIR = directory;
		}
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
		// Ensure STACKS_DIR is initialized and is an absolute path
		if (!STACKS_DIR || !path.isAbsolute(STACKS_DIR)) {
			let dirPath = STACKS_DIR || (await ensureStacksDirectory()); // ensureStacksDirectory is from settings-service

			if (!path.isAbsolute(dirPath)) {
				// Resolve relative to the project's root or initial CWD.
				// path.resolve() called with a single relative path resolves it against process.cwd().
				// This should ideally happen once when the application starts or when settings are loaded.
				dirPath = path.resolve(dirPath);
			}
			STACKS_DIR = dirPath; // Store the absolute path
		}

		// Now STACKS_DIR is guaranteed to be absolute.
		await fs.mkdir(STACKS_DIR, { recursive: true });
		return STACKS_DIR; // Return the absolute path
	} catch (err) {
		console.error('Error creating stacks directory:', err);
		throw new Error('Failed to create stacks storage directory');
	}
}

/**
 * Returns the stack directory for a given stackId (unchanged)
 */
async function getStackDir(stackId: string): Promise<string> {
	const stacksDirAbs = await ensureStacksDir(); // This now returns an absolute path
	const safeId = path.basename(stackId); // Use path.basename for safety
	if (safeId !== stackId) {
		// This check might be too strict if stackId can be a path itself.
		// Consider if stackId is just a name or could be more complex.
		// For now, assuming stackId is a simple name.
		console.warn(`Original stackId "${stackId}" was sanitized to "${safeId}". Ensure this is expected.`);
		// throw new Error('Invalid stack id'); // Or handle differently
	}
	return path.join(stacksDirAbs, safeId);
}

/**
 * Returns the path to the compose file, prioritizing compose.yaml, fallback to docker-compose.yml.
 * Returns null if neither is found.
 */
async function getComposeFilePath(stackId: string): Promise<string | null> {
	const stackDirAbs = await getStackDir(stackId); // Will be absolute
	const newPath = path.join(stackDirAbs, 'compose.yaml');
	const oldPath = path.join(stackDirAbs, 'docker-compose.yml');
	try {
		await fs.access(newPath);
		return newPath;
	} catch {
		// If compose.yaml is not found, try docker-compose.yml
		try {
			await fs.access(oldPath);
			return oldPath;
		} catch {
			// Neither compose.yaml nor docker-compose.yml found
			return null;
		}
	}
}

/**
 * Returns the path to the meta file, prioritizing .stack.json, fallback to meta.json.
 * Returns null if neither is found.
 */
async function getStackMetaPath(stackId: string): Promise<string | null> {
	const stackDir = await getStackDir(stackId);
	const newPath = join(stackDir, '.stack.json');
	const oldPath = join(stackDir, 'meta.json');
	try {
		await fs.access(newPath);
		return newPath;
	} catch {
		// .stack.json not accessible, try meta.json
		try {
			await fs.access(oldPath);
			return oldPath;
		} catch {
			// meta.json also not accessible
			return null;
		}
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
	if (!composePath) {
		throw new Error(`Compose file not found for stack ${stackId}`);
	}
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
		const stackDirEntries = await fs.readdir(stacksDir, { withFileTypes: true });
		const stacks: Stack[] = [];

		for (const entry of stackDirEntries) {
			if (!entry.isDirectory()) {
				continue;
			}
			const dirName = entry.name; // This is the stack's ID and name
			const stackDir = path.join(stacksDir, dirName);

			let composeFilePath: string | null = null;
			let composeContent: string | null = null;

			const potentialComposePaths = [path.join(stackDir, 'compose.yaml'), path.join(stackDir, 'docker-compose.yml')];

			for (const p of potentialComposePaths) {
				try {
					await fs.access(p);
					composeContent = await fs.readFile(p, 'utf8');
					composeFilePath = p;
					break;
				} catch {
					// File not accessible or doesn't exist, try next
				}
			}

			if (!composeContent || !composeFilePath) {
				console.warn(`No compose file found in directory ${dirName}, skipping.`);
				continue;
			}

			// All stacks are now treated based on directory and compose file presence
			const services = await getStackServices(dirName, composeContent);
			const serviceCount = services.length;
			const runningCount = services.filter((s) => s.state?.Running).length;

			let status: Stack['status'] = 'stopped';
			if (serviceCount === 0) {
				status = 'unknown'; // Or 'stopped' if preferred for empty compose
			} else if (runningCount === serviceCount) {
				status = 'running';
			} else if (runningCount > 0) {
				status = 'partially running';
			}

			let dirStat;
			try {
				dirStat = await fs.stat(stackDir);
			} catch (statErr) {
				console.error(`Could not stat directory ${stackDir}:`, statErr);
				const now = new Date().toISOString();
				dirStat = { birthtime: new Date(now), mtime: new Date(now) }; // Fallback
			}

			stacks.push({
				id: dirName,
				name: dirName, // Name is the directory name
				serviceCount,
				runningCount,
				status,
				createdAt: dirStat.birthtime.toISOString(),
				updatedAt: dirStat.mtime.toISOString(), // Use directory mtime as a general update timestamp
				isExternal: false
				// composeContent and envContent are loaded on demand by getStack
			});
		}

		return stacks;
	} catch (err) {
		console.error('Error loading stacks from STACKS_DIR:', err);
		throw new Error('Failed to load compose stacks');
	}
}

/**
 * Creates a new stack with a compose file and optional .env file
 */
export async function createStack(name: string, composeContent: string, envContent?: string): Promise<Stack> {
	// Create a safe directory name from the stack name
	const dirName = slugify(name, {
		lower: true, // Convert to lowercase
		strict: true, // Strip special chars
		replacement: '-', // Replace spaces with hyphens
		trim: true // Trim leading/trailing spaces
	});

	const stacksDir = await ensureStacksDirectory();
	let counter = 1;
	let uniqueDirName = dirName;

	while (await directoryExists(join(stacksDir, uniqueDirName))) {
		uniqueDirName = `${dirName}-${counter}`;
		counter++;
	}

	const stackDir = join(stacksDir, uniqueDirName);
	await fs.mkdir(stackDir, { recursive: true });

	await fs.writeFile(join(stackDir, 'compose.yaml'), composeContent);

	if (envContent) {
		await fs.writeFile(join(stackDir, '.env'), envContent);
	}

	// No .stack.json is created.

	let serviceCount = 0;
	try {
		const composeData = yaml.load(composeContent) as any;
		if (composeData?.services) {
			serviceCount = Object.keys(composeData.services).length;
		}
	} catch (parseErr) {
		console.warn(`Could not parse compose file during creation for stack ${uniqueDirName}:`, parseErr);
	}

	const dirStat = await fs.stat(stackDir);

	return {
		id: uniqueDirName, // ID is the directory name
		name: uniqueDirName, // Name is also the directory name
		serviceCount: serviceCount,
		runningCount: 0, // New stacks are initially stopped
		status: 'stopped',
		createdAt: dirStat.birthtime.toISOString(),
		updatedAt: dirStat.mtime.toISOString(),
		composeContent: composeContent,
		envContent: envContent || '',
		isExternal: false
	};
}

/**
 * Gets information about a specific stack including its .env file
 */
export async function getStack(stackId: string): Promise<Stack> {
	const stackDir = await getStackDir(stackId); // stackId is dirName

	try {
		const composePath = await getComposeFilePath(stackId);
		if (!composePath) {
			throw new Error(`Stack '${stackId}' is missing a compose file (compose.yaml or docker-compose.yml).`);
		}
		const composeContent = await fs.readFile(composePath, 'utf8');
		const envContent = await loadEnvFile(stackId);

		const services = await getStackServices(stackId, composeContent);
		const serviceCount = services.length;
		const runningCount = services.filter((s) => s.state?.Running).length;

		let status: Stack['status'] = 'stopped';
		if (serviceCount === 0) {
			status = 'unknown';
		} else if (runningCount === serviceCount) {
			status = 'running';
		} else if (runningCount > 0) {
			status = 'partially running';
		}

		const dirStat = await fs.stat(stackDir);

		return {
			id: stackId, // Directory name
			name: stackId, // Directory name
			services,
			serviceCount,
			runningCount,
			status,
			createdAt: dirStat.birthtime.toISOString(),
			updatedAt: dirStat.mtime.toISOString(), // Or could be composePath mtime
			composeContent,
			envContent,
			isExternal: false
		};
	} catch (err) {
		console.error(`Error in getStack for stackId '${stackId}':`, err);
		if (err instanceof Error && err.message.includes('missing a compose file')) {
			throw err;
		}
		throw new Error(`Stack '${stackId}' not found or cannot be accessed.`);
	}
}

/**
 * Updates a stack with new configuration and/or .env file
 */
export async function updateStack(currentStackId: string, updates: StackUpdate): Promise<Stack> {
	let effectiveStackId = currentStackId;
	let stackAfterRename: Stack | null = null;

	// 1. Handle potential rename first
	if (updates.name) {
		const newSlugifiedName = slugify(updates.name, {
			lower: true,
			strict: true,
			replacement: '-',
			trim: true
		});

		if (newSlugifiedName !== currentStackId) {
			console.log(`Rename requested for stack '${currentStackId}' to '${updates.name}' (slug: '${newSlugifiedName}').`);
			// renameStack will throw an error if the stack is running or if other rename conditions are not met.
			stackAfterRename = await renameStack(currentStackId, updates.name);
			effectiveStackId = stackAfterRename.id;
			console.log(`Stack '${currentStackId}' successfully renamed to '${effectiveStackId}'.`);
		} else {
			// Name provided is the same as current, or slugifies to the same. No rename action needed.
			console.log(`Provided name '${updates.name}' is effectively the same as current stack ID '${currentStackId}'. No rename action.`);
		}
	}

	// 2. Handle content updates (compose or .env)
	// These updates will apply to the new directory if a rename occurred.
	let contentUpdated = false;
	const stackDirForContent = await getStackDir(effectiveStackId);

	const promises = [];

	if (updates.composeContent !== undefined) {
		let currentComposePath = await getComposeFilePath(effectiveStackId); // Check existing, might be null
		const targetComposePath = currentComposePath || path.join(stackDirForContent, 'compose.yaml'); // Default to compose.yaml if not found

		promises.push(fs.writeFile(targetComposePath, updates.composeContent, 'utf8'));
		contentUpdated = true;
		console.log(`Updating composeContent for stack '${effectiveStackId}'.`);
	}

	if (updates.envContent !== undefined) {
		promises.push(saveEnvFile(effectiveStackId, updates.envContent));
		contentUpdated = true;
		console.log(`Updating envContent for stack '${effectiveStackId}'.`);
	}

	if (promises.length > 0) {
		await Promise.all(promises);
	}

	// 3. Return the final stack state
	if (stackAfterRename && !contentUpdated) {
		// Only a rename occurred, no subsequent content changes in this call.
		// The stackAfterRename object is fresh from renameStack's getStack call.
		return stackAfterRename;
	} else {
		// Content was updated, or no rename occurred but content might have.
		// Or both rename and content update occurred.
		// Fetch the latest stack details.
		return getStack(effectiveStackId);
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
	const stackDir = await getStackDir(stackId); // Get the absolute path to the stack directory
	const originalCwd = process.cwd(); // Store the original CWD

	try {
		process.chdir(stackDir); // Change CWD to the stack directory
		console.log(`Temporarily changed CWD to: ${stackDir} for stack ${stackId} operations.`);

		// getComposeInstance uses an absolute path to the compose file within stackDir.
		// Any relative path resolution by dockerode-compose (e.g., for .env via env_file)
		// should now correctly use stackDir as the base if it considers CWD.
		const compose = await getComposeInstance(stackId);

		await compose.pull();
		await compose.up();

		return true;
	} catch (err: unknown) {
		console.error(`Error starting stack ${stackId} from directory ${stackDir}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to start stack: ${errorMessage}`);
	} finally {
		process.chdir(originalCwd); // Always change back to the original CWD
		console.log(`Restored CWD to: ${originalCwd}.`);
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
	const stackDir = await getStackDir(stackId);
	const originalCwd = process.cwd();
	console.log(`Attempting to restart stack ${stackId}...`);

	try {
		// stopStack might also benefit from CWD context if it uses compose internally,
		// but your current stopStack is manual.
		const stopped = await stopStack(stackId);
		if (!stopped) {
			console.error(`Restart failed because stop step failed for stack ${stackId}.`);
			return false;
		}

		process.chdir(stackDir);
		console.log(`Temporarily changed CWD to: ${stackDir} for restarting stack ${stackId}.`);

		console.log(`Starting stack ${stackId} after stopping...`);
		const compose = await getComposeInstance(stackId);
		await compose.up();
		console.log(`Stack ${stackId} started.`);
		return true;
	} catch (err: unknown) {
		console.error(`Error restarting stack ${stackId} from directory ${stackDir}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to restart stack: ${errorMessage}`);
	} finally {
		process.chdir(originalCwd);
		console.log(`Restored CWD to: ${originalCwd}.`);
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
	const stackDir = await getStackDir(stackId);
	const originalCwd = process.cwd();
	console.log(`Attempting to fully redeploy stack ${stackId}...`);

	try {
		const stopped = await stopStack(stackId);
		if (!stopped) {
			console.error(`Redeploy failed because stop step failed for stack ${stackId}.`);
			return false;
		}

		process.chdir(stackDir);
		console.log(`Temporarily changed CWD to: ${stackDir} for redeploying stack ${stackId}.`);

		console.log(`Pulling images for stack ${stackId}...`);
		const compose = await getComposeInstance(stackId);
		await compose.pull();
		console.log(`Images pulled for stack ${stackId}.`);

		console.log(`Starting stack ${stackId} after pull...`);
		await compose.up();
		console.log(`Stack ${stackId} started.`);

		return true;
	} catch (err: unknown) {
		console.error(`Error fully redeploying stack ${stackId} from directory ${stackDir}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to fully redeploy stack: ${errorMessage}`);
	} finally {
		process.chdir(originalCwd);
		console.log(`Restored CWD to: ${originalCwd}.`);
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

export async function renameStack(currentStackId: string, newName: string): Promise<Stack> {
	if (!currentStackId || !newName) {
		throw new Error('Current stack ID and new name must be provided.');
	}

	const currentStackDir = await getStackDir(currentStackId);
	try {
		await fs.access(currentStackDir); // Check if current stack directory exists
	} catch (e) {
		throw new Error(`Stack with ID '${currentStackId}' not found at ${currentStackDir}.`);
	}

	// Slugify the new name to create a valid base for the directory name
	const newDirBaseName = slugify(newName, {
		lower: true,
		strict: true,
		replacement: '-',
		trim: true
	});

	if (newDirBaseName === currentStackId) {
		throw new Error(`The new name '${newName}' (resolves to '${newDirBaseName}') is effectively the same as the current stack ID '${currentStackId}'. No changes made.`);
	}

	// Check if the stack is running
	const running = await isStackRunning(currentStackId);
	if (running) {
		throw new Error(`Stack '${currentStackId}' is currently running. Please stop it before renaming.`);
	}

	const stacksDir = await ensureStacksDir();
	let newUniqueDirName = newDirBaseName;
	let counter = 1;
	const MAX_ATTEMPTS = 100; // Safety break for the loop

	// Find a unique directory name that is not the currentStackId
	while (counter <= MAX_ATTEMPTS) {
		const pathToCheck = join(stacksDir, newUniqueDirName);
		const exists = await directoryExists(pathToCheck);

		if (!exists && newUniqueDirName !== currentStackId) {
			break; // Found a suitable unique name
		}

		// If it exists or it's the same as currentStackId, generate a new one
		newUniqueDirName = `${newDirBaseName}-${counter}`;
		counter++;
	}

	if (counter > MAX_ATTEMPTS || newUniqueDirName === currentStackId || (await directoryExists(join(stacksDir, newUniqueDirName)))) {
		// This means after MAX_ATTEMPTS, we couldn't find a suitable unique name
		throw new Error(`Could not generate a unique directory name for '${newName}' that is different from '${currentStackId}' and does not already exist. Please try a different name.`);
	}

	const newStackDir = join(stacksDir, newUniqueDirName);

	try {
		console.log(`Renaming stack directory from '${currentStackDir}' to '${newStackDir}'...`);
		await fs.rename(currentStackDir, newStackDir);
		console.log(`Stack directory for '${currentStackId}' successfully renamed to '${newUniqueDirName}'.`);

		// The stack was stopped. When it's started next using `startStack(newUniqueDirName)`,
		// dockerode-compose will use `newUniqueDirName` as the project name,
		// effectively creating a "new" project from Docker's perspective with the existing files.
		// Old Docker resources (containers, networks, volumes) tied to `currentStackId` will remain
		// until manually pruned or if they conflict and Docker handles it.

		return await getStack(newUniqueDirName); // Return the stack info under its new ID/name
	} catch (err) {
		console.error(`Error renaming stack directory for '${currentStackId}' to '${newUniqueDirName}':`, err);
		// If fs.rename fails, the original directory should ideally still be there.
		// No complex rollback needed for fs.rename itself.
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to rename stack: ${errorMessage}`);
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
	const container = stackContainers[0]; // Use the first container to get labels
	const labels = container.Labels || {};

	// 3. Read the compose file if available, or create a new one
	let composeContent = '';
	let envContent: string | undefined = undefined; // Variable to store .env content
	let actualComposeFilePathUsed = ''; // For logging the path that was attempted

	const configFilesLabel = labels['com.docker.compose.project.config_files'];

	if (configFilesLabel) {
		const potentialComposePaths = configFilesLabel
			.split(',')
			.map((p) => p.trim())
			.filter((p) => p);

		let pathToTry = '';
		if (potentialComposePaths.length > 0) {
			// Prioritize common primary compose file names
			const primaryNames = ['compose.yaml', 'docker-compose.yml', 'compose.yml', 'docker-compose.yaml'];
			for (const name of primaryNames) {
				// Check if any of the paths end with a primary name
				const foundPath = potentialComposePaths.find((p) => path.basename(p) === name);
				if (foundPath) {
					pathToTry = foundPath;
					break;
				}
			}

			// If no primary name found in the list, try the first one from the list.
			if (!pathToTry) {
				pathToTry = potentialComposePaths[0];
			}
		}

		if (pathToTry) {
			actualComposeFilePathUsed = pathToTry;
			try {
				console.log(`Attempting to read compose file for import from: ${actualComposeFilePathUsed}`);
				composeContent = await fs.readFile(actualComposeFilePathUsed, 'utf8');
				console.log(`Successfully read compose file: ${actualComposeFilePathUsed}. Content length: ${composeContent.length}`);

				// Attempt to read .env file from the same directory
				const composeFileDir = path.dirname(actualComposeFilePathUsed);
				const envFilePath = path.join(composeFileDir, '.env');
				try {
					envContent = await fs.readFile(envFilePath, 'utf8');
					console.log(`Successfully read .env file from: ${envFilePath}`);
				} catch (envErr) {
					const nodeEnvErr = envErr as NodeJS.ErrnoException;
					if (nodeEnvErr.code === 'ENOENT') {
						console.log(`.env file not found at ${envFilePath}, proceeding without it.`);
					} else {
						console.warn(`Could not read .env file at ${envFilePath} during import:`, envErr);
					}
				}
			} catch (err) {
				console.warn(`Could not read compose file at ${actualComposeFilePathUsed} during import:`, err);
				// composeContent will remain empty, leading to generation logic below
			}
		} else {
			console.warn(`No suitable compose file path found in 'com.docker.compose.project.config_files' label: "${configFilesLabel}"`);
		}
	} else {
		console.warn(`Label 'com.docker.compose.project.config_files' not found for stack '${stackId}'. Will attempt to generate compose file.`);
	}

	// 4. If we couldn't read the compose file, generate one based on container inspection
	if (!composeContent) {
		console.log(`Generating compose file for stack '${stackId}' as no existing file could be read or found.`);
		// Create a basic compose file from container inspection
		const services: Record<string, any> = {};

		for (const cont of stackContainers) {
			// Renamed to 'cont' to avoid conflict with outer 'container'
			const containerLabels = cont.Labels || {};
			const serviceName = containerLabels['com.docker.compose.service'] || cont.Names[0]?.replace(`/${stackId}_`, '').replace(/_\d+$/, '') || `service_${cont.Id.substring(0, 8)}`;

			// Inspect the container to get more details
			// const containerDetails = await docker.getContainer(cont.Id).inspect(); // Uncomment if more details are needed

			services[serviceName] = {
				image: cont.Image
				// Add other properties based on containerDetails if needed
				// e.g., ports, volumes, environment variables.
				// This part can be expanded for a more comprehensive generated file.
			};
		}

		// Generate the compose file content
		composeContent = `# Generated compose file for imported stack: ${stackId}
# This was automatically generated by Arcane from an external stack.
# The original compose file could not be read from: ${actualComposeFilePathUsed || 'path not specified in labels'}.
# You may need to adjust this manually for correct operation.

services:
${yaml.dump({ services }, { indent: 2 }).substring('services:'.length).trimStart()}`;
		// Note: If compose file is generated, we don't have a path to look for an associated .env file.
		// envContent will remain undefined in this case.
	}

	// 5. Create a new stack in Arcane's managed stacks
	return await createStack(stackId, composeContent, envContent); // Pass envContent here
}

/**
 * Lists all managed stacks (from STACKS_DIR) and optionally external Docker Compose projects.
 * Managed stacks from STACKS_DIR will have their metadata loaded if `hasArcaneMeta` is true.
 * Stacks in STACKS_DIR without Arcane metadata are also listed (`hasArcaneMeta: false`).
 * `stack.id` for all returned stacks refers to their primary identifier (directory name for local, project name for external).
 */
export async function listStacks(includeExternal = false): Promise<Stack[]> {
	// Get managed stacks from STACKS_DIR.
	// Assumes loadComposeStacks returns Stack[] where:
	//  - stack.id is the directory name.
	//  - stack.meta is populated if stack.hasArcaneMeta is true.
	//  - stack.isExternal is set to false.
	//  - stack.hasArcaneMeta is correctly set.
	const managedStacks = await loadComposeStacks();

	let allStacks: Stack[] = [...managedStacks];

	if (includeExternal) {
		const externalStacksList = await discoverExternalStacks();
		// discoverExternalStacks sets isExternal: true.
		// Ensure hasArcaneMeta is consistently false for these, as they are not from STACKS_DIR.
		const processedExternalStacks = externalStacksList.map((stack) => ({
			...stack,
			hasArcaneMeta: false // External stacks don't have Arcane meta in STACKS_DIR
			// meta property will be undefined for external stacks from discoverExternalStacks
		}));
		allStacks = [...allStacks, ...processedExternalStacks];
	}

	return allStacks;
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
