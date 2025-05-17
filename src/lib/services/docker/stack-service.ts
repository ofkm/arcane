import { promises as fs } from 'node:fs';
import path, { join } from 'node:path';
import DockerodeCompose from 'dockerode-compose';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';
import slugify from 'slugify';
import { directoryExists } from '$lib/utils/fs.utils';
import { getDockerClient } from '$lib/services/docker/core';
import { getSettings, ensureStacksDirectory } from '$lib/services/settings-service';
import type { Stack, StackService, StackUpdate } from '$lib/types/docker/stack.type';

interface DockerProgressEvent {
	status: string;
	progressDetail?: {
		current: number;
		total: number;
	};
	progress?: string;
	id?: string;
}

/* The above code is declaring a variable `STACKS_DIR` with an empty string as its initial value in
TypeScript. */
let STACKS_DIR = '';

const stackCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

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
	const docker = await getDockerClient();
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
	const docker = await getDockerClient();
	const composeProjectLabel = 'com.docker.compose.project'; // Standard label
	const composeServiceLabel = 'com.docker.compose.service'; // Standard service label

	try {
		// Load the .env file to provide environment variable values
		const envContent = await loadEnvFile(stackId);

		// Parse environment variables from .env content
		const envVars: Record<string, string> = {};
		if (envContent) {
			envContent.split('\n').forEach((line) => {
				const trimmedLine = line.trim();
				if (trimmedLine && !trimmedLine.startsWith('#')) {
					const [key, ...valueParts] = trimmedLine.split('=');
					const value = valueParts.join('='); // Handle values that might contain =
					if (key) {
						envVars[key.trim()] = value?.trim() || '';
					}
				}
			});
		}

		// Create environment variable getter function
		const getEnvVar = (key: string) => {
			return envVars[key] || process.env[key] || '';
		};

		// Use our safe parser utility with the environment variable getter
		const composeData = parseYamlContent(composeContent, getEnvVar);
		if (!composeData || !composeData.services) {
			console.warn(`No services found in compose content for stack ${stackId}`);
			return [];
		}

		const serviceNames = Object.keys(composeData.services as Record<string, unknown>);

		// List containers, potentially filtering by label for efficiency if needed
		const containers = await docker.listContainers({
			all: true
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
	const cacheKey = 'compose-stacks';
	const cachedData = stackCache.get(cacheKey);

	if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
		return cachedData.data;
	}

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

		stackCache.set(cacheKey, {
			data: stacks,
			timestamp: Date.now()
		});

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

	const normalizedComposeContent = normalizeHealthcheckTest(composeContent);
	await fs.writeFile(join(stackDir, 'compose.yaml'), normalizedComposeContent);

	if (envContent) {
		await fs.writeFile(join(stackDir, '.env'), envContent);
	}

	// No .stack.json is created.

	let serviceCount = 0;
	try {
		// Use our safe parser utility
		const composeData = parseYamlContent(composeContent);
		if (composeData?.services) {
			serviceCount = Object.keys(composeData.services as Record<string, unknown>).length;
		}
	} catch (parseErr) {
		console.warn(`Could not parse compose file during creation for stack ${uniqueDirName}:`, parseErr);
	}

	const dirStat = await fs.stat(stackDir);

	// Create the stack object
	const newStack: Stack = {
		id: uniqueDirName,
		name: uniqueDirName,
		serviceCount: serviceCount,
		runningCount: 0,
		status: 'stopped',
		createdAt: dirStat.birthtime.toISOString(),
		updatedAt: dirStat.mtime.toISOString(),
		composeContent: composeContent,
		envContent: envContent || '',
		isExternal: false
	};

	// Invalidate the cache to ensure the new stack appears immediately
	stackCache.delete('compose-stacks');

	return newStack;
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

		// Parse environment variables from .env content
		const envVars: Record<string, string> = {};
		if (envContent) {
			envContent.split('\n').forEach((line) => {
				const trimmedLine = line.trim();
				if (trimmedLine && !trimmedLine.startsWith('#')) {
					const [key, ...valueParts] = trimmedLine.split('=');
					const value = valueParts.join('='); // Handle values that might contain =
					if (key) {
						envVars[key.trim()] = value?.trim() || '';
					}
				}
			});
		}

		// Create a property getter function for environment variables
		const getEnvProperty = (key: string) => {
			return envVars[key] || process.env[key] || '';
		};

		// Parse compose with environment variables - use our parseYamlContent instead
		let composeData;
		try {
			composeData = parseYamlContent(composeContent, getEnvProperty);
		} catch (parseErr) {
			console.error(`Error parsing compose content for stack ${stackId}:`, parseErr);
			// Continue with null composeData - we'll still return the stack object
			composeData = null;
		}

		// Get services with the parsed compose content
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
		const normalizedComposeContent = normalizeHealthcheckTest(updates.composeContent);
		const currentComposePath = await getComposeFilePath(effectiveStackId); // Check existing, might be null
		const targetComposePath = currentComposePath || path.join(stackDirForContent, 'compose.yaml'); // Default to compose.yaml if not found

		promises.push(fs.writeFile(targetComposePath, normalizedComposeContent, 'utf8'));
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

	// Invalidate the cache after any update
	stackCache.delete('compose-stacks');

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
 * @returns The `startStack` function returns a Promise<boolean>.
 */
export async function startStack(stackId: string): Promise<boolean> {
	const stackDir = await getStackDir(stackId);
	const originalCwd = process.cwd();

	try {
		const composePath = await getComposeFilePath(stackId);
		if (!composePath) {
			throw new Error(`Compose file not found for stack ${stackId} during start.`);
		}
		const currentComposeContent = await fs.readFile(composePath, 'utf8');

		// Load .env file to provide environment variable values for normalization and parsing
		const envContent = await loadEnvFile(stackId);
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

		const getEnvVar = (key: string): string | undefined => {
			return envVars[key] || process.env[key];
		};

		// Normalize and substitute variables in the compose content
		const normalizedComposeContent = normalizeHealthcheckTest(currentComposeContent, getEnvVar);
		if (currentComposeContent !== normalizedComposeContent) {
			console.log(`Normalized and substituted variables in compose file for stack ${stackId}. Writing to disk.`);
			await fs.writeFile(composePath, normalizedComposeContent, 'utf8');
		}

		process.chdir(stackDir);
		console.log(`Temporarily changed CWD to: ${stackDir} for stack ${stackId} operations.`);

		// Parse the (potentially updated on disk) normalized content for composeData
		const composeData = parseYamlContent(normalizedComposeContent, getEnvVar);

		if (!composeData) {
			throw new Error(`Failed to parse compose file for stack ${stackId}`);
		}

		const hasExternalNetworks = composeData.networks && Object.values(composeData.networks).some((net: any) => net.external);

		if (hasExternalNetworks) {
			console.log(`Stack ${stackId} contains external networks. Using custom deployment approach.`);
			await startStackWithExternalNetworks(stackId, composeData, stackDir);
		} else {
			// Standard approach for stacks without external networks
			// dockerode-compose will read the composePath, which should now be substituted
			const docker = await getDockerClient(); // Ensure docker client is available if needed for image pull
			const imagePullPromises = Object.entries(composeData.services || {})
				.filter(([_, serviceConfig]) => (serviceConfig as any).image)
				.map(async ([serviceName, serviceConfig]) => {
					const serviceImage = (serviceConfig as any).image;
					console.log(`Pulling image for service ${serviceName}: ${serviceImage}`);
					try {
						// Rest of the image pulling logic remains the same
					} catch (pullErr) {
						console.warn(`Warning: Failed to pull image ${serviceImage} for service ${serviceName}:`, pullErr);
					}
				});

			await Promise.all(imagePullPromises);

			const compose = await getComposeInstance(stackId); // Reads from composePath
			await compose.up();
		}

		stackCache.delete('compose-stacks');
		return true;
	} catch (err) {
		console.error(`Error starting stack ${stackId} from directory ${stackDir}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to start stack: ${errorMessage}`);
	} finally {
		process.chdir(originalCwd);
		console.log(`Restored CWD to: ${originalCwd}.`);
	}
}

/**
 * Custom function to deploy stacks with external networks
 * This uses direct Docker API calls to avoid the disconnect() issue
 */
async function startStackWithExternalNetworks(stackId: string, composeData: any, stackDir: string): Promise<void> {
	const docker = await getDockerClient();

	// Step 1: Pull all images
	console.log(`Pulling images for stack ${stackId} with external networks...`);
	for (const [serviceName, serviceConfig] of Object.entries(composeData.services || {})) {
		const serviceImage = (serviceConfig as any).image;
		if (serviceImage) {
			console.log(`Pulling image for service ${serviceName}: ${serviceImage}`);
			try {
				await new Promise<any[]>((resolve, reject) => {
					docker.pull(serviceImage, {}, (pullError: Error | null, stream?: NodeJS.ReadableStream) => {
						if (pullError) {
							reject(pullError);
							return;
						}
						if (!stream) {
							reject(new Error(`Docker pull for ${serviceImage} did not return a stream.`));
							return;
						}
						docker.modem.followProgress(
							stream,
							(progressError: Error | null, output: any[]) => {
								if (progressError) {
									reject(progressError);
								} else {
									console.log(`Successfully pulled image: ${serviceImage}`);
									resolve(output);
								}
							},
							(event: DockerProgressEvent) => {
								if (event.progress) {
									console.log(`${serviceImage}: ${event.status} ${event.progress}`);
								} else if (event.status) {
									console.log(`${serviceImage}: ${event.status}`);
								}
							}
						);
					});
				});
			} catch (pullErr) {
				console.warn(`Warning: Failed to pull image ${serviceImage} for service ${serviceName}:`, pullErr);
				// Continue with other images - the service might still start with an existing image
			}
		}
	}

	// Step 2: Create non-external networks
	console.log(`Creating networks for stack ${stackId}...`);
	for (const [networkName, networkConfig] of Object.entries(composeData.networks || {})) {
		// Skip external networks - they should already exist
		if ((networkConfig as any).external) {
			console.log(`Skipping creation of external network: ${networkName}`);
			continue;
		}

		// Create the network if it doesn't exist
		const networkToCreate = {
			Name: (networkConfig as any).name || `${stackId}_${networkName}`,
			Driver: (networkConfig as any).driver || 'bridge',
			Labels: {
				'com.docker.compose.project': stackId,
				'com.docker.compose.network': networkName
			},
			Options: (networkConfig as any).driver_opts || {}
		};

		try {
			console.log(`Creating network: ${networkToCreate.Name}`);
			await docker.createNetwork(networkToCreate);
			console.log(`Successfully created network: ${networkToCreate.Name}`);
		} catch (netErr: any) {
			// If network already exists (HTTP 409), that's fine
			if (netErr.statusCode === 409) {
				console.log(`Network ${networkToCreate.Name} already exists, reusing it.`);
			} else {
				console.error(`Error creating network ${networkToCreate.Name}:`, netErr);
				throw netErr;
			}
		}
	}

	// Step 3: Create and start each service
	console.log(`Creating and starting services for stack ${stackId}...`);
	for (const [serviceName, serviceConfig] of Object.entries(composeData.services || {})) {
		const service = serviceConfig as any;

		// service.container_name should be resolved from composeData (processed by parseYamlContent)
		let containerName = service.container_name;

		// If container_name is still not defined or is empty after substitution, use a default.
		if (!containerName || typeof containerName !== 'string') {
			containerName = `${stackId}_${serviceName}`;
		}

		// Check if the container name (which should have been substituted by parseYamlContent)
		// still contains unresolved placeholders. This indicates the variable was not defined.
		if (containerName.includes('${')) {
			console.warn(`CRITICAL: Unresolved variable in container_name for service '${serviceName}': ${containerName}. ` + `This means the environment variable was not found. Using default name: ${stackId}_${serviceName}`);
			containerName = `${stackId}_${serviceName}`; // Fallback to a safe default
		}

		// Prepare container configuration (existing code)
		const containerConfig: any = {
			name: containerName, // Use the processed container name
			Image: service.image,
			Labels: {
				'com.docker.compose.project': stackId,
				'com.docker.compose.service': serviceName,
				...service.labels
			},
			Env: await prepareEnvironmentVariables(service.environment, stackDir), // Ensure this is awaited if async
			HostConfig: {
				RestartPolicy: prepareRestartPolicy(service.restart),
				Binds: prepareVolumes(service.volumes), // Ensure this handles paths correctly
				PortBindings: preparePorts(service.ports)
			}
		};

		// Add network configuration
		const networkMode = service.network_mode || null;
		if (networkMode) {
			containerConfig.HostConfig.NetworkMode = networkMode;
		}

		const networkingConfig: { EndpointsConfig?: any } = {};
		if (!networkMode && service.networks) {
			// Only configure EndpointsConfig if not using network_mode host/none etc.
			networkingConfig.EndpointsConfig = {};
			const serviceNetworks = Array.isArray(service.networks) ? service.networks : Object.keys(service.networks);
			for (const netName of serviceNetworks) {
				const networkDefinition = composeData.networks?.[netName];
				const fullNetworkName = networkDefinition?.external ? networkDefinition.name || netName : `${stackId}_${netName}`;
				networkingConfig.EndpointsConfig[fullNetworkName] = {}; // Add aliases or other configs here if needed from service.networks[netName]
				if (typeof service.networks === 'object' && service.networks[netName] && service.networks[netName].aliases) {
					networkingConfig.EndpointsConfig[fullNetworkName].Aliases = service.networks[netName].aliases;
				}
			}
		}

		// Find existing container with same name to remove
		try {
			const existingContainers = await docker.listContainers({
				all: true,
				filters: JSON.stringify({ name: [containerName] })
			});

			for (const existing of existingContainers) {
				console.log(`Removing existing container: ${containerName} (ID: ${existing.Id})`);
				const c = docker.getContainer(existing.Id); // Corrected variable name
				if (existing.State === 'running') {
					await c.stop().catch((e) => console.warn(`Failed to stop existing container ${existing.Id}: ${e.message}`));
				}
				await c.remove({ force: true }).catch((e) => console.warn(`Failed to remove existing container ${existing.Id}: ${e.message}`));
			}
		} catch (removeErr) {
			console.warn(`Warning: Error checking/removing existing containers for ${containerName}:`, removeErr);
		}

		// Create and start the container
		console.log(`Creating container for service ${serviceName}: ${containerName}`);
		try {
			const container = await docker.createContainer(containerConfig);
			console.log(`Successfully created container: ${containerName} (ID: ${container.id})`);

			// Connect to networks if not using a specific network_mode like 'host' or 'none'
			// This part was simplified in your snippet, ensure it's robust
			if (networkingConfig.EndpointsConfig && Object.keys(networkingConfig.EndpointsConfig).length > 0) {
				for (const netName of Object.keys(networkingConfig.EndpointsConfig)) {
					try {
						console.log(`Connecting container ${container.id} to network: ${netName}`);
						const network = docker.getNetwork(netName);
						await network.connect({
							Container: container.id,
							EndpointConfig: networkingConfig.EndpointsConfig[netName] || {}
						});
						console.log(`Successfully connected ${container.id} to network: ${netName}`);
					} catch (netConnectErr) {
						console.error(`Error connecting container ${container.id} to network ${netName}:`, netConnectErr);
						// Decide if this should throw or just be a warning
					}
				}
			}

			console.log(`Starting container: ${containerName} (ID: ${container.id})`);
			await container.start();
			console.log(`Successfully started container: ${containerName}`);
		} catch (createErr) {
			console.error(`Error creating/starting container for service ${serviceName} (${containerName}):`, createErr);
			throw createErr;
		}
	}

	console.log(`Successfully deployed stack ${stackId} with external networks`);
}

// Helper functions to prepare container configuration
async function prepareEnvironmentVariables(env: any, stackDir: string): Promise<string[]> {
	const result: string[] = [];

	// Load .env file if it exists
	try {
		const envPath = path.join(stackDir, '.env');
		const envContent = await fs.readFile(envPath, 'utf8');
		const envLines = envContent.split('\n');

		for (const line of envLines) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith('#')) {
				result.push(trimmed);
			}
		}
	} catch (err) {
		// .env file doesn't exist or can't be read, that's okay
	}

	// Add environment variables from the service definition
	if (env) {
		if (Array.isArray(env)) {
			result.push(...env);
		} else if (typeof env === 'object') {
			for (const [key, value] of Object.entries(env)) {
				result.push(`${key}=${value}`);
			}
		}
	}

	return result;
}

function prepareRestartPolicy(restart: string | undefined): any {
	if (!restart) return { Name: 'no' };

	switch (restart) {
		case 'no':
			return { Name: 'no' };
		case 'always':
			return { Name: 'always' };
		case 'on-failure':
			return { Name: 'on-failure' };
		case 'unless-stopped':
			return { Name: 'unless-stopped' };
		default:
			// For more complex policies like "on-failure:3", parse the max retry count
			if (restart.startsWith('on-failure:')) {
				const maxRetryCount = parseInt(restart.split(':')[1], 10);
				return { Name: 'on-failure', MaximumRetryCount: maxRetryCount };
			}
			return { Name: 'no' };
	}
}

function prepareVolumes(volumes: any[] | undefined): string[] {
	if (!volumes) return [];

	return volumes
		.filter((vol) => typeof vol === 'string' && vol.includes(':'))
		.map((vol) => {
			// Handle volume paths correctly
			const parts = vol.split(':');
			return `${parts[0]}:${parts[1]}${parts[2] ? `:${parts[2]}` : ''}`;
		});
}

function preparePorts(ports: any[] | undefined): any {
	if (!ports) return {};

	const portBindings: any = {};

	for (const port of ports) {
		if (typeof port === 'string' && port.includes(':')) {
			const [hostPort, containerPort] = port.split(':');
			const containerPortWithProto = containerPort.includes('/') ? containerPort : `${containerPort}/tcp`;

			portBindings[containerPortWithProto] = [{ HostPort: hostPort }];
		}
	}

	return portBindings;
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
	const docker = await getDockerClient();
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

		// Invalidate the cache after stopping
		stackCache.delete('compose-stacks');

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
		const stopped = await stopStack(stackId);
		if (!stopped) {
			console.error(`Restart failed because stop step failed for stack ${stackId}.`);
			return false;
		}

		// ---- START: Ensure compose file is normalized before use ----
		const composePath = await getComposeFilePath(stackId);
		if (!composePath) {
			throw new Error(`Compose file not found for stack ${stackId} during restart.`);
		}
		const currentComposeContent = await fs.readFile(composePath, 'utf8');
		const normalizedComposeContent = normalizeHealthcheckTest(currentComposeContent);
		if (currentComposeContent !== normalizedComposeContent) {
			console.log(`Normalizing healthcheck.test in compose file for stack ${stackId} before restart.`);
			await fs.writeFile(composePath, normalizedComposeContent, 'utf8');
		}
		// ---- END: Ensure compose file is normalized ----

		process.chdir(stackDir);
		console.log(`Temporarily changed CWD to: ${stackDir} for restarting stack ${stackId}.`);

		console.log(`Starting stack ${stackId} after stopping...`);
		const compose = await getComposeInstance(stackId);
		await compose.up();
		console.log(`Stack ${stackId} started.`);

		// Invalidate the cache after restarting
		stackCache.delete('compose-stacks');

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

		// ---- START: Ensure compose file is normalized before use ----
		const composePath = await getComposeFilePath(stackId);
		if (!composePath) {
			throw new Error(`Compose file not found for stack ${stackId} during redeploy.`);
		}
		const currentComposeContent = await fs.readFile(composePath, 'utf8');
		// The normalizeHealthcheckTest function is defined at the end of your file
		const normalizedComposeContent = normalizeHealthcheckTest(currentComposeContent);

		// Only write back to disk if the normalization actually changed the content
		// This avoids unnecessary file modifications and mtime updates.
		if (currentComposeContent !== normalizedComposeContent) {
			console.log(`Normalizing healthcheck.test in compose file for stack ${stackId} before redeploy.`);
			await fs.writeFile(composePath, normalizedComposeContent, 'utf8');
		}
		// ---- END: Ensure compose file is normalized ----

		process.chdir(stackDir);
		console.log(`Temporarily changed CWD to: ${stackDir} for redeploying stack ${stackId}.`);

		console.log(`Pulling images for stack ${stackId}...`);
		// getComposeInstance will now read the potentially corrected (normalized) file from disk
		const compose = await getComposeInstance(stackId);
		await compose.pull();
		console.log(`Images pulled for stack ${stackId}.`);

		console.log(`Starting stack ${stackId} after pull...`);
		await compose.up(); // This should now use the corrected compose configuration
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
		} catch {
			console.error(`Failed to remove stack directory ${stackDir}`);
			throw new Error(`Failed to remove stack directory`);
		}

		// Invalidate the cache after removing a stack
		stackCache.delete('compose-stacks');

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

		// Invalidate the cache after renaming
		stackCache.delete('compose-stacks');

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
		const docker = await getDockerClient();
		const containers = await docker.listContainers({ all: true });

		const composeProjectLabel = 'com.docker.compose.project';
		const composeServiceLabel = 'com.docker.compose.service';

		const projectMap: Record<string, Array<{ id: string; name: string; state: { Running: boolean; Status: string; ExitCode: number } }>> = {};

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
	const docker = await getDockerClient();
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
		const services: Record<string, { image: string }> = {};

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
${yamlDump({ services }, { indent: 2 }).substring('services:'.length).trimStart()}`;
		// Note: If compose file is generated, we don't have a path to look for an associated .env file.
		// envContent will remain undefined in this case.
	}

	// Invalidate the cache after importing
	stackCache.delete('compose-stacks');

	// 5. Create a new stack in Arcane's managed stacks
	return await createStack(stackId, normalizeHealthcheckTest(composeContent), envContent); // Pass envContent here
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
	const docker = await getDockerClient();
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

/**
 * Normalizes compose content:
 * 1. Ensures healthcheck.test is an array.
 * 2. Substitutes environment variables throughout the compose object.
 * @param {string} composeContent - The YAML content of the compose file.
 * @param {function} envGetter - Optional function to get environment variable values.
 * @returns {string} - The normalized and substituted YAML content.
 */
function normalizeHealthcheckTest(composeContent: string, envGetter?: (key: string) => string | undefined): string {
	let doc: any; // Use 'any' for easier manipulation, will be validated by yamlLoad
	try {
		doc = yamlLoad(composeContent);
		if (!doc || typeof doc !== 'object') {
			console.warn('Could not parse compose YAML for normalization or content is not an object.');
			return composeContent;
		}
	} catch (e) {
		console.warn('Could not parse compose YAML for normalization:', e);
		return composeContent;
	}

	let modified = false;

	// Perform healthcheck normalization
	if (doc.services && typeof doc.services === 'object') {
		for (const serviceName in doc.services) {
			if (Object.prototype.hasOwnProperty.call(doc.services, serviceName)) {
				const service = doc.services[serviceName];
				if (service && service.healthcheck && typeof service.healthcheck === 'object' && service.healthcheck.test && typeof service.healthcheck.test === 'string') {
					service.healthcheck.test = service.healthcheck.test
						.trim()
						.split(/\s+/)
						.filter((s: string) => s.length > 0);
					modified = true;
				}
			}
		}
	}

	// Perform variable substitution on the entire document object if envGetter is provided
	if (envGetter) {
		const originalDocSnapshot = JSON.stringify(doc);
		doc = substituteVariablesInObject(doc, envGetter);
		if (JSON.stringify(doc) !== originalDocSnapshot) {
			modified = true;
		}
	}

	if (modified) {
		// Critical check: After substitution, ensure container_name does not contain unresolved variables
		if (doc.services && typeof doc.services === 'object') {
			for (const serviceName in doc.services) {
				if (Object.prototype.hasOwnProperty.call(doc.services, serviceName)) {
					const service = doc.services[serviceName];
					if (service && typeof service.container_name === 'string' && service.container_name.includes('${')) {
						console.error(`CRITICAL: Unresolved variable in container_name for service '${serviceName}': ${service.container_name}. ` + `This will likely cause Docker to fail. Ensure the environment variable is defined.`);
						// Depending on desired behavior, you might throw an error here
						// throw new Error(`Unresolved variable in container_name for service '${serviceName}': ${service.container_name}`);
					}
				}
			}
		}
		return yamlDump(doc, { lineWidth: -1 });
	}
	return composeContent;
}

/**
 * Safely parses YAML content as a string (not a file path)
 * Creates a proper wrapper around yaml-env-defaults to ensure it treats input as content
 * @param content YAML content as a string
 * @param envGetter Optional function to get environment variable values
 * @returns Parsed object or null if parsing fails
 */
function parseYamlContent(content: string, envGetter?: (key: string) => string | undefined): Record<string, any> | null {
	try {
		// Use js-yaml directly without any potential CommonJS dependencies
		const parsedYaml = yamlLoad(content);

		if (!parsedYaml || typeof parsedYaml !== 'object') {
			console.warn('Parsed YAML content is not an object or is null.');
			return null;
		}

		if (envGetter) {
			return substituteVariablesInObject(parsedYaml, envGetter);
		}
		return parsedYaml as Record<string, any>;
	} catch (error) {
		console.error('Error parsing YAML content:', error);
		return null;
	}
}

// Helper function to recursively substitute variables in an object
function substituteVariablesInObject(obj: any, envGetter: (key: string) => string | undefined): any {
	if (Array.isArray(obj)) {
		return obj.map((item) => substituteVariablesInObject(item, envGetter));
	} else if (typeof obj === 'object' && obj !== null) {
		const newObj: Record<string, any> = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				newObj[key] = substituteVariablesInObject(obj[key], envGetter);
			}
		}
		return newObj;
	} else if (typeof obj === 'string') {
		let S = obj;
		// Loop to handle multiple/nested variables, with a safety break
		for (let i = 0; i < 10 && S.includes('${'); i++) {
			S = S.replace(/\$\{([^}]+)\}/g, (match, varName) => {
				const value = envGetter(varName);
				// If value is found, substitute. Otherwise, keep the placeholder.
				return value !== undefined ? value : match;
			});
		}
		if (S.includes('${')) {
			console.warn(`Unresolved variable or recursive substitution limit reached in string: "${obj}". Result: "${S}"`);
		}
		return S;
	}
	return obj;
}
