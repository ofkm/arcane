import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import Dockerode from 'dockerode';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';
import slugify from 'slugify';
import { directoryExists } from '$lib/utils/fs.utils';
import { getDockerClient } from './core';
import { getSettings, ensureStacksDirectory } from '$lib/services/settings-service';
import type { Stack, StackService, StackUpdate } from '$lib/types/docker/stack.type';
// Database imports
import { listStacksFromDb, getStackByIdFromDb, saveStackToDb, updateStackRuntimeInfoInDb, updateStackContentInDb, deleteStackFromDb, updateStackAutoUpdateInDb, getAutoUpdateStacksFromDb } from '$lib/services/database/compose-db-service';

interface DockerProgressEvent {
	status: string;
	progressDetail?: {
		current: number;
		total: number;
	};
	progress?: string;
	id?: string;
}

let STACKS_DIR = '';
const stackCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

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
 * Initialize compose service - includes database check
 */
export async function initComposeService(): Promise<void> {
	try {
		const settings = await getSettings();
		STACKS_DIR = settings.stacksDirectory;
		console.log(`Stacks directory initialized: ${STACKS_DIR}`);

		await ensureStacksDir();

		// Check if we need to migrate from file-based to database
		try {
			const dbStacks = await listStacksFromDb();
			if (dbStacks.length === 0) {
				console.log('No stacks found in database, checking for file-based stacks to migrate...');
			}
		} catch (error) {
			console.warn('Database not yet ready for stack operations:', error);
		}
	} catch (err) {
		console.error('Error initializing compose service:', err);
	}
}

/**
 * Update stacks directory
 */
export function updateStacksDirectory(directory: string): void {
	if (directory) {
		if (!path.isAbsolute(directory)) {
			STACKS_DIR = path.resolve(directory);
		} else {
			STACKS_DIR = directory;
		}
		console.log(`Stacks directory updated to: ${STACKS_DIR}`);
	}
}

/**
 * Ensure stacks directory exists
 */
export async function ensureStacksDir(): Promise<string> {
	try {
		if (!STACKS_DIR || !path.isAbsolute(STACKS_DIR)) {
			let dirPath = STACKS_DIR || (await ensureStacksDirectory());

			if (!path.isAbsolute(dirPath)) {
				dirPath = path.resolve(dirPath);
			}
			STACKS_DIR = dirPath;
		}

		await fs.mkdir(STACKS_DIR, { recursive: true });
		return STACKS_DIR;
	} catch (err) {
		console.error('Error creating stacks directory:', err);
		throw new Error('Failed to create stacks storage directory');
	}
}

/**
 * Get stack directory for a given stackId
 */
export async function getStackDir(stackId: string): Promise<string> {
	const stacksDirAbs = await ensureStacksDir();
	const safeId = path.basename(stackId);
	if (safeId !== stackId) {
		console.warn(`Original stackId "${stackId}" was sanitized to "${safeId}". Ensure this is expected.`);
	}
	return path.join(stacksDirAbs, safeId);
}

/**
 * Get compose file path, prioritizing compose.yaml over docker-compose.yml
 */
export async function getComposeFilePath(stackId: string): Promise<string | null> {
	const stackDirAbs = await getStackDir(stackId);
	const newPath = path.join(stackDirAbs, 'compose.yaml');
	const oldPath = path.join(stackDirAbs, 'docker-compose.yml');
	try {
		await fs.access(newPath);
		return newPath;
	} catch {
		try {
			await fs.access(oldPath);
			return oldPath;
		} catch {
			return null;
		}
	}
}

/**
 * Get .env file path
 */
async function getEnvFilePath(stackId: string): Promise<string> {
	const stackDir = await getStackDir(stackId);
	return path.join(stackDir, '.env');
}

/**
 * Save environment variables to .env file
 */
async function saveEnvFile(stackId: string, content?: string): Promise<void> {
	const envPath = await getEnvFilePath(stackId);
	const fileContent = content === undefined || content === null ? '' : content;
	await fs.writeFile(envPath, fileContent, 'utf8');
	console.log(`Saved .env file for stack ${stackId}`);
}

/**
 * Load environment variables from .env file
 */
export async function loadEnvFile(stackId: string): Promise<string> {
	const envPath = await getEnvFilePath(stackId);

	try {
		return await fs.readFile(envPath, 'utf8');
	} catch (err) {
		const nodeErr = err as NodeJS.ErrnoException;
		if (nodeErr.code === 'ENOENT') {
			console.log(`No .env file found for stack ${stackId}`);
			return '';
		}
		console.error(`Error reading .env file for stack ${stackId}:`, err);
		throw new Error(`Failed to read .env file: ${nodeErr.message}`, { cause: err });
	}
}

/**
 * Load compose stacks - FAST version (no runtime updates)
 */
export async function loadComposeStacks(): Promise<Stack[]> {
	const cacheKey = 'compose-stacks';
	const cachedData = stackCache.get(cacheKey);

	// Extend cache TTL to 5 minutes for better performance
	const EXTENDED_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

	if (cachedData && Date.now() - cachedData.timestamp < EXTENDED_CACHE_TTL) {
		console.log(`Returning ${cachedData.data.length} stacks from cache`);
		return cachedData.data;
	}

	try {
		// Just load from database - NO file system reads, NO service queries
		const dbStacks = await listStacksFromDb();
		console.log(`Loaded ${dbStacks.length} stacks from database (fast mode)`);

		// Return stacks with minimal processing
		const fastStacks = dbStacks.map((stack) => ({
			...stack,
			services: [] // Empty services array for fast loading
		}));

		stackCache.set(cacheKey, {
			data: fastStacks,
			timestamp: Date.now()
		});

		console.log(`Fast load completed: ${fastStacks.length} stacks`);
		return fastStacks;
	} catch (error) {
		console.error('Error loading stacks from database, falling back to file-based approach:', error);
		return loadComposeStacksFromFiles();
	}
}

/**
 * Load stacks with full runtime info (use sparingly)
 */
export async function loadComposeStacksWithRuntimeInfo(): Promise<Stack[]> {
	// This is the current heavy function - only use when needed
	const dbStacks = await listStacksFromDb();

	return Promise.all(
		dbStacks.map(async (stack) => {
			try {
				let composeContent = stack.composeContent;

				if (!composeContent) {
					try {
						const composePath = await getComposeFilePath(stack.id);
						if (composePath) {
							composeContent = await fs.readFile(composePath, 'utf8');
							// Don't update DB on every load - do this in background
						}
					} catch (fileError) {
						console.warn(`Could not load compose file for stack ${stack.id}`);
					}
				}

				const services = await getStackServices(stack.id, composeContent || '');
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

				return {
					...stack,
					composeContent,
					services,
					serviceCount,
					runningCount,
					status
				};
			} catch (error) {
				console.error(`Error processing stack ${stack.id}:`, error);
				return {
					...stack,
					services: []
				};
			}
		})
	);
}

/**
 * Original file-based loading (kept as fallback)
 */
async function loadComposeStacksFromFiles(): Promise<Stack[]> {
	const stacksDir = await ensureStacksDir();

	try {
		const stackDirEntries = await fs.readdir(stacksDir, { withFileTypes: true });
		const stacks: Stack[] = [];

		for (const entry of stackDirEntries) {
			if (!entry.isDirectory()) {
				continue;
			}

			const dirName = entry.name;
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
					// Try next path
				}
			}

			if (!composeContent || !composeFilePath) {
				console.warn(`No compose file found in directory ${dirName}, skipping.`);
				continue;
			}

			const services = await getStackServices(dirName, composeContent);

			let dirStat;
			try {
				dirStat = await fs.stat(stackDir);
			} catch (statErr) {
				console.error(`Could not stat directory ${stackDir}:`, statErr);
				const now = new Date().toISOString();
				dirStat = { birthtime: new Date(now), mtime: new Date(now) };
			}

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

			stacks.push({
				id: dirName,
				name: dirName,
				services,
				serviceCount,
				runningCount,
				status,
				createdAt: dirStat.birthtime.toISOString(),
				updatedAt: dirStat.mtime.toISOString(),
				isExternal: false
			});
		}

		return stacks;
	} catch (err) {
		console.error('Error loading stacks from STACKS_DIR:', err);
		throw new Error('Failed to load compose stacks');
	}
}

/**
 * Get stack services from containers
 */
async function getStackServices(stackId: string, composeContent: string): Promise<StackService[]> {
	const docker = await getDockerClient();
	const composeProjectLabel = 'com.docker.compose.project';
	const composeServiceLabel = 'com.docker.compose.service';

	console.log(`Getting services for stack ${stackId}, composeContent length: ${composeContent.length}`);

	try {
		// Load the .env file to provide environment variable values
		let envContent = '';
		let envVars: Record<string, string> = {};

		try {
			envContent = await loadEnvFile(stackId);
			envVars = parseEnvContent(envContent);
		} catch (envError) {
			console.log(`No .env file found for stack ${stackId}, continuing without env vars`);
		}

		// Create environment variable getter function
		const getEnvVar = (key: string) => {
			return envVars[key] || process.env[key] || '';
		};

		// Parse compose content to get service definitions
		let composeData: Record<string, any> | null = null;
		let serviceNames: string[] = [];

		if (composeContent.trim()) {
			composeData = parseYamlContent(composeContent, getEnvVar);
			if (composeData && composeData.services) {
				serviceNames = Object.keys(composeData.services as Record<string, unknown>);
				console.log(`Found ${serviceNames.length} services defined in compose: [${serviceNames.join(', ')}]`);
			} else {
				console.warn(`No services found in compose content for stack ${stackId}`);
			}
		} else {
			console.warn(`Empty compose content for stack ${stackId}`);
		}

		// List all containers
		const containers = await docker.listContainers({ all: true });
		console.log(`Total containers found: ${containers.length}`);

		// Filter containers based on labels and naming convention
		const stackContainers = containers.filter((container) => {
			const labels = container.Labels || {};
			const names = container.Names || [];

			// Check if container belongs to this stack
			const hasCorrectLabel = labels[composeProjectLabel] === stackId;
			const nameStartsWithPrefix = names.some((name) => name.startsWith(`/${stackId}_`));

			const belongs = hasCorrectLabel || nameStartsWithPrefix;

			if (belongs) {
				console.log(`Container ${container.Id} (${names[0]}) belongs to stack ${stackId}`);
				console.log(`  - Labels: ${JSON.stringify(labels)}`);
				console.log(`  - State: ${container.State}`);
			}

			return belongs;
		});

		console.log(`Found ${stackContainers.length} containers for stack ${stackId}`);

		const services: StackService[] = [];

		for (const containerData of stackContainers) {
			const containerName = containerData.Names?.[0]?.substring(1) || '';
			const labels = containerData.Labels || {};
			let serviceName = labels[composeServiceLabel];

			console.log(`Processing container ${containerData.Id} (${containerName})`);

			// Fallback to parsing from container name if the service label is missing
			if (!serviceName && serviceNames.length > 0) {
				console.log(`Container ${containerData.Id} missing service label, trying to parse from name`);
				for (const name of serviceNames) {
					const servicePrefixWithUnderscore = `${stackId}_${name}_`;
					const servicePrefixExact = `${stackId}_${name}`;
					if (containerName.startsWith(servicePrefixWithUnderscore) || containerName === servicePrefixExact) {
						serviceName = name;
						console.log(`Matched service name: ${serviceName}`);
						break;
					}
				}
			}

			// Final fallback if still no match
			if (!serviceName) {
				// Extract service name from container name pattern: stackId_serviceName_instance
				const namePattern = new RegExp(`^${stackId}_([^_]+)(?:_\\d+)?$`);
				const match = containerName.match(namePattern);
				if (match) {
					serviceName = match[1];
					console.log(`Extracted service name from container name: ${serviceName}`);
				} else {
					serviceName = containerName.replace(`${stackId}_`, '').replace(/_\d+$/, '') || containerName;
					console.log(`Using fallback service name: ${serviceName}`);
				}
			}

			const service: StackService = {
				id: containerData.Id,
				name: serviceName,
				state: {
					Running: containerData.State === 'running',
					Status: containerData.State,
					ExitCode: containerData.State === 'exited' ? -1 : 0
				}
			};

			console.log(`Created service: ${JSON.stringify(service)}`);

			// Avoid adding duplicates
			const existingServiceIndex = services.findIndex((s) => s.name === serviceName);
			if (existingServiceIndex !== -1) {
				if (!services[existingServiceIndex].id) {
					services[existingServiceIndex] = service;
					console.log(`Updated existing service ${serviceName} with container data`);
				} else {
					console.log(`Multiple containers found for service ${serviceName} in stack ${stackId}. Keeping first found.`);
				}
			} else {
				services.push(service);
				console.log(`Added new service ${serviceName}`);
			}
		}

		// Add placeholders for services defined in compose but not found among listed containers
		if (serviceNames.length > 0) {
			for (const name of serviceNames) {
				if (!services.some((s) => s.name === name)) {
					const placeholderService: StackService = {
						id: '',
						name: name,
						state: {
							Running: false,
							Status: 'not created',
							ExitCode: 0
						}
					};
					services.push(placeholderService);
					console.log(`Added placeholder service for ${name}`);
				}
			}
		}

		// Sort services alphabetically by name for consistent order
		services.sort((a, b) => a.name.localeCompare(b.name));

		console.log(`Final services for stack ${stackId}: ${services.length} services`);
		services.forEach((s) => console.log(`  - ${s.name}: ${s.state?.Status} (id: ${s.id || 'none'})`));

		return services;
	} catch (err) {
		console.error(`Error getting services for stack ${stackId}:`, err);
		return [];
	}
}

/**
 * Get a specific stack - FAST version for detail pages
 */
export async function getStack(stackId: string): Promise<Stack> {
	try {
		// Try database first
		const dbStack = await getStackByIdFromDb(stackId);
		if (dbStack) {
			console.log(`Found stack ${stackId} in database`);

			// Get services and update status ONLY for single stack view
			let composeContent = dbStack.composeContent;
			if (!composeContent) {
				const composePath = await getComposeFilePath(stackId);
				if (composePath) {
					composeContent = await fs.readFile(composePath, 'utf8');
					// Update in background, don't wait
					updateStackContentInDb(stackId, { composeContent }).catch(console.error);
				}
			}

			const services = await getStackServices(stackId, composeContent || '');
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

			// Update runtime info in background
			updateStackRuntimeInfoInDb(stackId, {
				status,
				serviceCount,
				runningCount,
				lastPolled: new Date()
			}).catch(console.error);

			return {
				...dbStack,
				composeContent,
				services,
				serviceCount,
				runningCount,
				status
			};
		}
	} catch (error) {
		console.error(`Error loading stack ${stackId} from database:`, error);
	}

	// Fallback to file-based approach
	return getStackFromFiles(stackId);
}

/**
 * Original file-based getStack (kept as fallback)
 */
async function getStackFromFiles(stackId: string): Promise<Stack> {
	const stackDir = await getStackDir(stackId);

	try {
		await fs.access(stackDir);
	} catch {
		throw new Error(`Stack with ID "${stackId}" not found.`);
	}

	const composePath = await getComposeFilePath(stackId);
	if (!composePath) {
		throw new Error(`Compose file not found for stack ${stackId}`);
	}

	const composeContent = await fs.readFile(composePath, 'utf8');
	const envContent = await loadEnvFile(stackId);
	const services = await getStackServices(stackId, composeContent);

	const dirStat = await fs.stat(stackDir);
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

	return {
		id: stackId,
		name: stackId,
		services,
		serviceCount,
		runningCount,
		status,
		createdAt: dirStat.birthtime.toISOString(),
		updatedAt: dirStat.mtime.toISOString(),
		composeContent,
		envContent: envContent || '',
		isExternal: false
	};
}

/**
 * Create a new stack - saves to both database and files
 */
export async function createStack(name: string, composeContent: string, envContent?: string): Promise<Stack> {
	const dirName = slugify(name, {
		lower: true,
		strict: true,
		replacement: '-',
		trim: true
	});

	const stacksDir = await ensureStacksDirectory();
	let counter = 1;
	let uniqueDirName = dirName;

	while (await directoryExists(path.join(stacksDir, uniqueDirName))) {
		uniqueDirName = `${dirName}-${counter}`;
		counter++;
	}

	const stackDir = path.join(stacksDir, uniqueDirName);
	await fs.mkdir(stackDir, { recursive: true });

	const normalizedComposeContent = normalizeHealthcheckTest(composeContent);
	await fs.writeFile(path.join(stackDir, 'compose.yaml'), normalizedComposeContent);

	if (envContent) {
		await fs.writeFile(path.join(stackDir, '.env'), envContent);
	}

	let serviceCount = 0;
	try {
		const composeData = parseYamlContent(composeContent);
		if (composeData?.services) {
			serviceCount = Object.keys(composeData.services as Record<string, unknown>).length;
		}
	} catch (parseErr) {
		console.warn(`Could not parse compose file during creation for stack ${uniqueDirName}:`, parseErr);
	}

	const dirStat = await fs.stat(stackDir);

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
		isExternal: false,
		path: stackDir,
		dirName: uniqueDirName
	};

	// Save to database
	try {
		await saveStackToDb(newStack);
		console.log(`Stack ${uniqueDirName} saved to database`);
	} catch (error) {
		console.error(`Error saving stack ${uniqueDirName} to database:`, error);
		// Continue anyway - files are already created
	}

	stackCache.delete('compose-stacks');
	return newStack;
}

/**
 * Update a stack - updates both database and files
 */
export async function updateStack(currentStackId: string, updates: StackUpdate): Promise<Stack> {
	let effectiveStackId = currentStackId;
	let stackAfterRename: Stack | null = null;

	// Handle potential rename first
	if (updates.name) {
		const newSlugifiedName = slugify(updates.name, {
			lower: true,
			strict: true,
			replacement: '-',
			trim: true
		});

		if (newSlugifiedName !== currentStackId) {
			console.log(`Rename requested for stack '${currentStackId}' to '${updates.name}' (slug: '${newSlugifiedName}').`);
			stackAfterRename = await renameStack(currentStackId, updates.name);
			effectiveStackId = stackAfterRename.id;
			console.log(`Stack '${currentStackId}' successfully renamed to '${effectiveStackId}'.`);
		}
	}

	// Handle content updates
	let contentUpdated = false;
	const stackDirForContent = await getStackDir(effectiveStackId);
	const promises = [];

	if (updates.composeContent !== undefined) {
		const normalizedComposeContent = normalizeHealthcheckTest(updates.composeContent);
		const currentComposePath = await getComposeFilePath(effectiveStackId);
		const targetComposePath = currentComposePath || path.join(stackDirForContent, 'compose.yaml');

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

	// Update database
	if (contentUpdated) {
		try {
			await updateStackContentInDb(effectiveStackId, {
				composeContent: updates.composeContent,
				envContent: updates.envContent
			});
			console.log(`Stack ${effectiveStackId} content updated in database`);
		} catch (error) {
			console.error(`Error updating stack ${effectiveStackId} in database:`, error);
		}
	}

	stackCache.delete('compose-stacks');

	if (stackAfterRename && !contentUpdated) {
		return stackAfterRename;
	} else {
		return getStack(effectiveStackId);
	}
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

		// Normalize content for healthchecks but don't write it back to the file
		const normalizedContent = normalizeHealthcheckTest(composeContent, getEnvVar);

		// Only write back if it's specifically a healthcheck normalization issue
		if (composeContent !== normalizedContent) {
			console.log(`Normalized compose content for stack ${stackId}. Writing to disk.`);
			await fs.writeFile(composePath, normalizedContent, 'utf8');
		}

		process.chdir(stackDir);
		console.log(`Changed CWD to: ${stackDir} for stack ${stackId} operations.`);

		// Parse the normalized content
		const composeData = parseYamlContent(normalizedContent, getEnvVar);

		if (!composeData) {
			throw new Error(`Failed to parse compose file for stack ${stackId}`);
		}

		const hasExternalNetworks = composeData.networks && Object.values(composeData.networks).some((net: any) => net.external);

		try {
			deploymentStarted = true;
			if (hasExternalNetworks) {
				console.log(`Stack ${stackId} contains external networks. Using custom deployment approach.`);
				await deployStackWithExternalNetworks(stackId, composeData, stackDir);
			} else {
				// Standard approach for stacks without external networks
				const docker = await getDockerClient();

				// Pull images for all services
				const imagePullPromises = Object.entries(composeData.services || {})
					.filter(([_, serviceConfig]) => (serviceConfig as any).image)
					.map(async ([serviceName, serviceConfig]) => {
						const serviceImage = (serviceConfig as any).image;
						console.log(`Pulling image for service ${serviceName}: ${serviceImage}`);
						try {
							await pullImage(docker, serviceImage);
						} catch (pullErr) {
							console.warn(`Warning: Failed to pull image ${serviceImage} for service ${serviceName}:`, pullErr);
						}
					});

				await Promise.all(imagePullPromises);

				// Create networks
				await createStackNetworks(docker, stackId, composeData.networks || {});

				// Deploy services
				await createAndStartServices(docker, stackId, composeData, stackDir);
			}

			// Update database with new status
			try {
				await updateStackRuntimeInfoInDb(stackId, {
					status: 'running',
					lastPolled: Math.floor(Date.now() / 1000) // ← Solution: Unix timestamp
				});
			} catch (dbError) {
				console.error(`Error updating stack ${stackId} status in database:`, dbError);
			}

			stackCache.delete('compose-stacks');
			return true;
		} catch (deployErr) {
			// If deployment started but failed, clean up any containers that were created
			if (deploymentStarted) {
				console.log(`Deployment of stack ${stackId} failed. Cleaning up any created containers...`);
				try {
					await cleanupFailedDeployment(stackId);
				} catch (cleanupErr) {
					console.error(`Error cleaning up failed deployment for stack ${stackId}:`, cleanupErr);
				}
			}
			throw deployErr;
		}
	} catch (err) {
		console.error(`Error deploying stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to deploy stack: ${errorMessage}`);
	} finally {
		process.chdir(originalCwd);
		console.log(`Restored CWD to: ${originalCwd}.`);
	}
}

/**
 * Start stack (alias for deployStack for compatibility)
 */
export async function startStack(stackId: string): Promise<boolean> {
	return deployStack(stackId);
}

/**
 * Stop stack
 */
export async function stopStack(stackId: string): Promise<boolean> {
	console.log(`Attempting to stop stack ${stackId} by manually stopping containers...`);
	const docker = await getDockerClient();
	const composeProjectLabel = 'com.docker.compose.project';
	let stoppedCount = 0;
	let removedCount = 0;

	try {
		// Find containers belonging to the stack
		const containers = await docker.listContainers({
			all: true,
			filters: JSON.stringify({
				label: [`${composeProjectLabel}=${stackId}`]
			})
		});

		// Fallback: check by name convention
		const allContainers = await docker.listContainers({ all: true });
		const nameFilteredContainers = allContainers.filter((c) => !containers.some((fc) => fc.Id === c.Id) && (c.Labels?.[composeProjectLabel] === stackId || c.Names?.some((name) => name.startsWith(`/${stackId}_`))));

		const seen = new Set<string>();
		const stackContainers = [...containers, ...nameFilteredContainers].filter((c) => {
			if (seen.has(c.Id)) return false;
			seen.add(c.Id);
			return true;
		});

		if (stackContainers.length === 0) {
			return true;
		}

		console.log(`Found ${stackContainers.length} containers for stack ${stackId}. Attempting to stop and remove...`);

		// Stop and Remove each container
		for (const containerInfo of stackContainers) {
			console.log(`Processing container ${containerInfo.Names?.[0]} (ID: ${containerInfo.Id})...`);
			const container = docker.getContainer(containerInfo.Id);
			try {
				// Stop the container if it's running
				if (containerInfo.State === 'running') {
					console.log(`Stopping container ${containerInfo.Id}...`);
					await container.stop();
					console.log(`Container ${containerInfo.Id} stopped.`);
					stoppedCount++;
				} else {
					console.log(`Container ${containerInfo.Id} is already stopped (State: ${containerInfo.State}).`);
				}

				// Remove the container
				console.log(`Removing container ${containerInfo.Id}...`);
				await container.remove({ force: true });
				console.log(`Container ${containerInfo.Id} removed.`);
				removedCount++;
			} catch (containerErr) {
				console.error(`Error processing container ${containerInfo.Id} for stack ${stackId}:`, containerErr);
			}
		}

		// Remove networks associated with the stack
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

		// Update database with new status
		try {
			await updateStackRuntimeInfoInDb(stackId, {
				status: 'stopped',
				runningCount: 0,
				lastPolled: Math.floor(Date.now() / 1000) // ← Solution: Unix timestamp
			});
		} catch (dbError) {
			console.error(`Error updating stack ${stackId} status in database:`, dbError);
		}

		stackCache.delete('compose-stacks');
		return true;
	} catch (err: unknown) {
		console.error(`Error during manual stop/remove for stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to stop stack ${stackId}: ${errorMessage}`);
	}
}

/**
 * Restart stack
 */
export async function restartStack(stackId: string): Promise<boolean> {
	await stopStack(stackId);
	return deployStack(stackId);
}

/**
 * Redeploy stack (pull images and restart)
 */
export async function redeployStack(stackId: string): Promise<boolean> {
	return deployStack(stackId);
}

/**
 * Rename stack
 */
export async function renameStack(currentStackId: string, newName: string): Promise<Stack> {
	if (!currentStackId || !newName) {
		throw new Error('Current stack ID and new name must be provided.');
	}

	const currentStackDir = await getStackDir(currentStackId);
	try {
		await fs.access(currentStackDir);
	} catch (e) {
		throw new Error(`Stack with ID '${currentStackId}' not found at ${currentStackDir}.`);
	}

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
	const MAX_ATTEMPTS = 100;

	while (counter <= MAX_ATTEMPTS) {
		const pathToCheck = path.join(stacksDir, newUniqueDirName);
		const exists = await directoryExists(pathToCheck);

		if (!exists && newUniqueDirName !== currentStackId) {
			break;
		}

		newUniqueDirName = `${newDirBaseName}-${counter}`;
		counter++;
	}

	if (counter > MAX_ATTEMPTS || newUniqueDirName === currentStackId || (await directoryExists(path.join(stacksDir, newUniqueDirName)))) {
		throw new Error(`Could not generate a unique directory name for '${newName}' that is different from '${currentStackId}' and does not already exist. Please try a different name.`);
	}

	const newStackDir = path.join(stacksDir, newUniqueDirName);

	try {
		console.log(`Renaming stack directory from '${currentStackDir}' to '${newStackDir}'...`);
		await fs.rename(currentStackDir, newStackDir);
		console.log(`Stack directory for '${currentStackId}' successfully renamed to '${newUniqueDirName}'.`);

		// Update database
		try {
			// Delete old entry and create new one
			await deleteStackFromDb(currentStackId);
			const updatedStack = await getStack(newUniqueDirName);
			await saveStackToDb(updatedStack);
		} catch (dbError) {
			console.error(`Error updating database after renaming stack:`, dbError);
		}

		stackCache.delete('compose-stacks');
		return await getStack(newUniqueDirName);
	} catch (err) {
		console.error(`Error renaming stack directory for '${currentStackId}' to '${newUniqueDirName}':`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to rename stack: ${errorMessage}`);
	}
}

/**
 * Discover external stacks
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
				continue; // Stack is managed by Arcane, skip it
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
 * Import external stack
 */
export async function importExternalStack(stackId: string): Promise<Stack> {
	const docker = await getDockerClient();
	const containers = await docker.listContainers({ all: true });

	const stackContainers = containers.filter((container) => {
		const labels = container.Labels || {};
		return labels['com.docker.compose.project'] === stackId;
	});

	if (stackContainers.length === 0) {
		throw new Error(`No containers found for stack '${stackId}'`);
	}

	const container = stackContainers[0];
	const labels = container.Labels || {};

	let composeContent = '';
	let envContent: string | undefined = undefined;
	let actualComposeFilePathUsed = '';

	const configFilesLabel = labels['com.docker.compose.project.config_files'];

	if (configFilesLabel) {
		const potentialComposePaths = configFilesLabel
			.split(',')
			.map((p) => p.trim())
			.filter((p) => p);

		let pathToTry = '';
		if (potentialComposePaths.length > 0) {
			const primaryNames = ['compose.yaml', 'docker-compose.yml', 'compose.yml', 'docker-compose.yaml'];
			for (const name of primaryNames) {
				const foundPath = potentialComposePaths.find((p) => path.basename(p) === name);
				if (foundPath) {
					pathToTry = foundPath;
					break;
				}
			}

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
			}
		} else {
			console.warn(`No suitable compose file path found in 'com.docker.compose.project.config_files' label: "${configFilesLabel}"`);
		}
	} else {
		console.warn(`Label 'com.docker.compose.project.config_files' not found for stack '${stackId}'. Will attempt to generate compose file.`);
	}

	// Generate compose file if we couldn't read one
	if (!composeContent) {
		console.log(`Generating compose file for stack '${stackId}' as no existing file could be read or found.`);
		const services: Record<string, { image: string }> = {};

		for (const cont of stackContainers) {
			const containerLabels = cont.Labels || {};
			const serviceName = containerLabels['com.docker.compose.service'] || cont.Names[0]?.replace(`/${stackId}_`, '').replace(/_\d+$/, '') || `service_${cont.Id.substring(0, 8)}`;

			services[serviceName] = {
				image: cont.Image
			};
		}

		composeContent = `# Generated compose file for imported stack: ${stackId}
# This was automatically generated by Arcane from an external stack.
# The original compose file could not be read from: ${actualComposeFilePathUsed || 'path not specified in labels'}.
# You may need to adjust this manually for correct operation.

services:
${yamlDump({ services }, { indent: 2 }).substring('services:'.length).trimStart()}`;
	}

	stackCache.delete('compose-stacks');
	return await createStack(stackId, normalizeHealthcheckTest(composeContent), envContent);
}

/**
 * List all stacks
 */
export async function listStacks(includeExternal = false): Promise<Stack[]> {
	const managedStacks = await loadComposeStacks();
	let allStacks: Stack[] = [...managedStacks];

	if (includeExternal) {
		const externalStacksList = await discoverExternalStacks();
		const processedExternalStacks = externalStacksList.map((stack) => ({
			...stack,
			hasArcaneMeta: false
		}));
		allStacks = [...allStacks, ...processedExternalStacks];
	}

	return allStacks;
}

/**
 * Check if stack is running
 */
export async function isStackRunning(stackId: string): Promise<boolean> {
	const docker = await getDockerClient();
	const composeProjectLabel = 'com.docker.compose.project';

	try {
		const containers = await docker.listContainers({
			all: true,
			filters: JSON.stringify({
				label: [`${composeProjectLabel}=${stackId}`]
			})
		});

		const allContainers = await docker.listContainers({ all: true });
		const nameFilteredContainers = allContainers.filter((c) => !containers.some((fc) => fc.Id === c.Id) && (c.Labels?.[composeProjectLabel] === stackId || c.Names?.some((name) => name.startsWith(`/${stackId}_`))));

		const stackContainers = [...containers, ...nameFilteredContainers];
		return stackContainers.some((c) => c.State === 'running');
	} catch (err) {
		console.error(`Error checking if stack ${stackId} is running:`, err);
		return false;
	}
}

/**
 * Update stack auto-update setting
 */
export async function updateStackAutoUpdate(stackId: string, autoUpdate: boolean): Promise<void> {
	try {
		await updateStackAutoUpdateInDb(stackId, autoUpdate);
		console.log(`Updated auto-update setting for stack ${stackId} to ${autoUpdate}`);
	} catch (error) {
		console.error(`Error updating auto-update setting for stack ${stackId}:`, error);
		throw error;
	}
}

/**
 * Get stacks with auto-update enabled
 */
export async function getAutoUpdateStacks(): Promise<Stack[]> {
	try {
		return await getAutoUpdateStacksFromDb();
	} catch (error) {
		console.error('Error getting auto-update stacks:', error);
		return [];
	}
}

/**
 * Normalize healthcheck test and substitute variables
 */
export function normalizeHealthcheckTest(composeContent: string, envGetter?: (key: string) => string | undefined): string {
	let doc: any;
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

	// Perform variable substitution if envGetter is provided
	if (envGetter) {
		const originalDocSnapshot = JSON.stringify(doc);
		doc = substituteVariablesInObject(doc, envGetter);
		if (JSON.stringify(doc) !== originalDocSnapshot) {
			modified = true;
		}
	}

	if (modified) {
		// Critical check: ensure container_name does not contain unresolved variables
		if (doc.services && typeof doc.services === 'object') {
			for (const serviceName in doc.services) {
				if (Object.prototype.hasOwnProperty.call(doc.services, serviceName)) {
					const service = doc.services[serviceName];
					if (service && typeof service.container_name === 'string' && service.container_name.includes('${')) {
						console.error(`CRITICAL: Unresolved variable in container_name for service '${serviceName}': ${service.container_name}. ` + `This will likely cause Docker to fail. Ensure the environment variable is defined.`);
					}
				}
			}
		}
		return yamlDump(doc, { lineWidth: -1 });
	}
	return composeContent;
}

/**
 * Parse YAML content safely
 */
export function parseYamlContent(content: string, envGetter?: (key: string) => string | undefined): Record<string, any> | null {
	try {
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
		for (let i = 0; i < 10 && S.includes('${'); i++) {
			S = S.replace(/\$\{([^}]+)\}/g, (match, varName) => {
				const value = envGetter(varName);
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

/**
 * Creates all networks defined in the compose file
 */
async function createStackNetworks(docker: Dockerode, stackId: string, networks: Record<string, any>): Promise<void> {
	// If no networks are defined, create a default network for the stack
	if (!networks || Object.keys(networks).length === 0) {
		const defaultNetworkName = `${stackId}_default`;
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

	// Process defined networks (only create non-external ones)
	for (const [networkName, networkConfig] of Object.entries(networks)) {
		// Skip external networks
		if (networkConfig.external) {
			console.log(`Using external network: ${networkConfig.name || networkName}`);
			continue;
		}

		// Network creation logic for non-external networks
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
			console.log(`Successfully created network: ${networkToCreate.Name}`);
		} catch (err: any) {
			if (err.statusCode === 409) {
				console.log(`Network ${networkToCreate.Name} already exists, reusing it.`);
			} else {
				console.error(`Error creating network ${networkToCreate.Name}:`, err);
				throw err;
			}
		}
	}
}

/**
 * Pull image using Docker API
 */
async function pullImage(docker: Dockerode, imageTag: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		docker.pull(imageTag, {}, (pullError: Error | null, stream?: NodeJS.ReadableStream) => {
			if (pullError) {
				reject(pullError);
				return;
			}
			if (!stream) {
				reject(new Error(`Docker pull for ${imageTag} did not return a stream.`));
				return;
			}
			docker.modem.followProgress(
				stream,
				(progressError: Error | null, output: any[]) => {
					if (progressError) {
						reject(progressError);
					} else {
						console.log(`Successfully pulled image: ${imageTag}`);
						resolve();
					}
				},
				(event: DockerProgressEvent) => {
					if (event.progress) {
						console.log(`${imageTag}: ${event.status} ${event.progress}`);
					} else if (event.status) {
						console.log(`${imageTag}: ${event.status}`);
					}
				}
			);
		});
	});
}

/**
 * Create and start all services
 */
async function createAndStartServices(docker: Dockerode, stackId: string, composeData: any, stackDir: string): Promise<void> {
	for (const [serviceName, serviceConfig] of Object.entries(composeData.services || {})) {
		const service = serviceConfig as any;

		let containerName = service.container_name;
		if (!containerName || typeof containerName !== 'string') {
			containerName = `${stackId}_${serviceName}`;
		}
		if (containerName.includes('${')) {
			console.warn(`CRITICAL: Unresolved variable in container_name for service '${serviceName}': ${containerName}. Using default name: ${stackId}_${serviceName}`);
			containerName = `${stackId}_${serviceName}`;
		}

		const containerConfig: any = {
			name: containerName,
			Image: service.image,
			User: service.user || '',
			Labels: {
				'com.docker.compose.project': stackId,
				'com.docker.compose.service': serviceName,
				...service.labels
			},
			Env: await prepareEnvironmentVariables(service.environment, stackDir),
			HostConfig: {
				RestartPolicy: prepareRestartPolicy(service.restart),
				Binds: prepareVolumes(service.volumes),
				PortBindings: preparePorts(service.ports),
				Dns: service.dns || [],
				DnsOptions: service.dns_opt || [],
				DnsSearch: service.dns_search || []
			}
		};

		const networkMode = service.network_mode || null;
		let primaryNetworkName = null;
		if (networkMode) {
			containerConfig.HostConfig.NetworkMode = networkMode;
		} else if (service.networks) {
			const serviceNetworks = Array.isArray(service.networks) ? service.networks : Object.keys(service.networks);

			if (serviceNetworks.length > 0) {
				const firstNetName = serviceNetworks[0];
				const networkDefinition = composeData.networks?.[firstNetName];

				let actualExternalNetIdentifier = firstNetName;
				if (networkDefinition?.external && networkDefinition.name) {
					if (typeof networkDefinition.name === 'string' && networkDefinition.name.includes('${') && networkDefinition.name.includes('}')) {
						console.warn(`External network key '${firstNetName}' has an unresolved variable in name attribute. Using key '${firstNetName}' as identifier.`);
					} else {
						actualExternalNetIdentifier = networkDefinition.name;
					}
				}

				primaryNetworkName = networkDefinition?.external ? actualExternalNetIdentifier : `${stackId}_${firstNetName}`;
				containerConfig.HostConfig.NetworkMode = primaryNetworkName;
				console.log(`Service ${serviceName} will use '${primaryNetworkName}' as primary network.`);
			}
		}

		// Handle additional networks
		const networkingConfig: { EndpointsConfig?: any } = {};
		if (!networkMode && service.networks) {
			const serviceNetworks = Array.isArray(service.networks) ? service.networks : Object.keys(service.networks);
			const additionalNetworks = primaryNetworkName ? serviceNetworks.slice(1) : serviceNetworks;

			if (additionalNetworks.length > 0) {
				networkingConfig.EndpointsConfig = {};

				for (const netName of additionalNetworks) {
					const serviceNetConfig = typeof service.networks === 'object' ? service.networks[netName] : {};
					const networkDefinition = composeData.networks?.[netName];

					let actualExternalNetIdentifier = netName;
					if (networkDefinition?.external && networkDefinition.name) {
						if (typeof networkDefinition.name === 'string' && networkDefinition.name.includes('${') && networkDefinition.name.includes('}')) {
							console.warn(`External network key '${netName}' in stack '${stackId}' has a 'name' attribute '${networkDefinition.name}' that appears to be an unresolved variable. Using the network key '${netName}' as the identifier for connection.`);
						} else {
							actualExternalNetIdentifier = networkDefinition.name;
						}
					}
					const fullNetworkName = networkDefinition?.external ? actualExternalNetIdentifier : `${stackId}_${netName}`;

					const endpointConfig: any = {};

					if (typeof serviceNetConfig === 'object' && serviceNetConfig.aliases) {
						endpointConfig.Aliases = serviceNetConfig.aliases;
					}

					if (typeof serviceNetConfig === 'object') {
						const ipamConfig: any = {};

						if (serviceNetConfig.ipv4_address) {
							ipamConfig.IPv4Address = serviceNetConfig.ipv4_address;
						}

						if (serviceNetConfig.ipv6_address) {
							ipamConfig.IPv6Address = serviceNetConfig.ipv6_address;
						}

						if (Object.keys(ipamConfig).length > 0) {
							endpointConfig.IPAMConfig = ipamConfig;
						}
					}

					networkingConfig.EndpointsConfig[fullNetworkName] = endpointConfig;
				}
			}
		}

		try {
			const container = await docker.createContainer(containerConfig);
			console.log(`Successfully created container: ${containerName} (ID: ${container.id})`);

			if (networkingConfig.EndpointsConfig && Object.keys(networkingConfig.EndpointsConfig).length > 0) {
				for (const netNameKey of Object.keys(networkingConfig.EndpointsConfig)) {
					try {
						console.log(`Connecting container ${container.id} to network: ${netNameKey} with config:`, JSON.stringify(networkingConfig.EndpointsConfig[netNameKey]));

						const network = docker.getNetwork(netNameKey);
						await network.connect({
							Container: container.id,
							EndpointConfig: networkingConfig.EndpointsConfig[netNameKey] || {}
						});
						console.log(`Successfully connected ${container.id} to network: ${netNameKey}`);
					} catch (netConnectErr) {
						console.error(`Error connecting container ${container.id} to network ${netNameKey}:`, netConnectErr);
						throw new Error(`Failed to connect container ${container.id} to network ${netNameKey}: ${netConnectErr instanceof Error ? netConnectErr.message : String(netConnectErr)}`);
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
}

/**
 * Deploy stack with external networks (custom approach)
 */
async function deployStackWithExternalNetworks(stackId: string, composeData: any, stackDir: string): Promise<void> {
	const docker = await getDockerClient();

	// Pull all images
	console.log(`Pulling images for stack ${stackId} with external networks...`);
	for (const [serviceName, serviceConfig] of Object.entries(composeData.services || {})) {
		const serviceImage = (serviceConfig as any).image;
		if (serviceImage) {
			console.log(`Pulling image for service ${serviceName}: ${serviceImage}`);
			try {
				await pullImage(docker, serviceImage);
			} catch (pullErr) {
				console.warn(`Warning: Failed to pull image ${serviceImage} for service ${serviceName}:`, pullErr);
			}
		}
	}

	// Create networks
	await createStackNetworks(docker, stackId, composeData.networks || {});

	// Create and start services
	await createAndStartServices(docker, stackId, composeData, stackDir);

	console.log(`Successfully deployed stack ${stackId} with external networks`);
}

/**
 * Clean up failed deployment
 */
async function cleanupFailedDeployment(stackId: string): Promise<void> {
	console.log(`Cleaning up containers for failed deployment of stack ${stackId}...`);
	const docker = await getDockerClient();
	const composeProjectLabel = 'com.docker.compose.project';

	try {
		const containers = await docker.listContainers({
			all: true,
			filters: JSON.stringify({
				label: [`${composeProjectLabel}=${stackId}`]
			})
		});

		const allContainers = await docker.listContainers({ all: true });
		const nameFilteredContainers = allContainers.filter((c) => !containers.some((fc) => fc.Id === c.Id) && c.Names?.some((name) => name.startsWith(`/${stackId}_`)));

		const stackContainers = [...containers, ...nameFilteredContainers];

		if (stackContainers.length === 0) {
			console.log(`No containers found for stack ${stackId}.`);
			return;
		}

		for (const containerInfo of stackContainers) {
			const container = docker.getContainer(containerInfo.Id);
			try {
				const containerDetails = await container.inspect();
				if (containerDetails.State.Running) {
					console.log(`Stopping container ${containerInfo.Id}...`);
					await container.stop();
				}
				console.log(`Removing container ${containerInfo.Id}...`);
				await container.remove();
			} catch (err) {
				console.error(`Error cleaning up container ${containerInfo.Id}:`, err);
			}
		}
	} catch (err) {
		console.error(`Error cleaning up failed deployment for stack ${stackId}:`, err);
	}
}

/**
 * Prepare environment variables for container creation
 */
async function prepareEnvironmentVariables(environment: any, stackDir: string): Promise<string[]> {
	const envArray: string[] = [];

	if (Array.isArray(environment)) {
		// Handle array format: ['KEY=value', 'KEY2=value2']
		envArray.push(...environment);
	} else if (typeof environment === 'object' && environment !== null) {
		// Handle object format: { KEY: 'value', KEY2: 'value2' }
		for (const [key, value] of Object.entries(environment)) {
			envArray.push(`${key}=${value}`);
		}
	}

	// Load .env file and add variables if they don't already exist
	try {
		const envFilePath = path.join(stackDir, '.env');
		const envFileContent = await fs.readFile(envFilePath, 'utf8');
		const envVars = parseEnvContent(envFileContent);

		for (const [key, value] of Object.entries(envVars)) {
			// Only add if not already defined in compose environment
			const keyExists = envArray.some((env) => env.startsWith(`${key}=`));
			if (!keyExists) {
				envArray.push(`${key}=${value}`);
			}
		}
	} catch (envError) {
		// .env file doesn't exist or can't be read, that's okay
	}

	return envArray;
}

/**
 * Prepare restart policy for container
 */
function prepareRestartPolicy(restart: string | undefined): any {
	if (!restart) {
		return { Name: 'no' };
	}

	switch (restart) {
		case 'always':
			return { Name: 'always' };
		case 'unless-stopped':
			return { Name: 'unless-stopped' };
		case 'on-failure':
			return { Name: 'on-failure', MaximumRetryCount: 0 };
		case 'no':
			return { Name: 'no' };
		default:
			// Handle on-failure:5 format
			if (restart.startsWith('on-failure:')) {
				const retryCount = parseInt(restart.split(':')[1]) || 0;
				return { Name: 'on-failure', MaximumRetryCount: retryCount };
			}
			return { Name: 'no' };
	}
}

/**
 * Prepare volumes for container
 */
function prepareVolumes(volumes: any[]): string[] {
	if (!Array.isArray(volumes)) {
		return [];
	}

	return volumes
		.map((volume) => {
			if (typeof volume === 'string') {
				return volume;
			} else if (typeof volume === 'object' && volume.type === 'bind') {
				// Handle long format: { type: 'bind', source: '/host/path', target: '/container/path' }
				const readonly = volume.read_only ? ':ro' : '';
				return `${volume.source}:${volume.target}${readonly}`;
			}
			return '';
		})
		.filter((v) => v);
}

/**
 * Prepare port bindings for container
 */
function preparePorts(ports: any[]): any {
	if (!Array.isArray(ports)) {
		return {};
	}

	const portBindings: any = {};

	for (const port of ports) {
		if (typeof port === 'string') {
			// Handle "8080:80" or "80" format
			const parts = port.split(':');
			if (parts.length === 2) {
				const [hostPort, containerPort] = parts;
				const containerPortKey = containerPort.includes('/') ? containerPort : `${containerPort}/tcp`;
				portBindings[containerPortKey] = [{ HostPort: hostPort }];
			} else if (parts.length === 1) {
				// Just container port, let Docker assign host port
				const containerPortKey = parts[0].includes('/') ? parts[0] : `${parts[0]}/tcp`;
				portBindings[containerPortKey] = [{}];
			}
		} else if (typeof port === 'object') {
			// Handle long format: { target: 80, published: 8080, protocol: 'tcp' }
			const containerPortKey = `${port.target}/${port.protocol || 'tcp'}`;
			if (port.published) {
				portBindings[containerPortKey] = [{ HostPort: port.published.toString() }];
			} else {
				portBindings[containerPortKey] = [{}];
			}
		}
	}

	return portBindings;
}

/**
 * Delete stack - removes from both database and files
 */
export async function deleteStack(stackId: string, removeFiles = false): Promise<boolean> {
	try {
		// Stop the stack first
		await stopStack(stackId);

		// Remove from database
		try {
			await deleteStackFromDb(stackId);
			console.log(`Stack ${stackId} removed from database`);
		} catch (dbError) {
			console.error(`Error removing stack ${stackId} from database:`, dbError);
		}

		// Remove files if requested
		if (removeFiles) {
			const stackDir = await getStackDir(stackId);
			try {
				await fs.rm(stackDir, { recursive: true, force: true });
				console.log(`Stack ${stackId} files removed from ${stackDir}`);
			} catch (fileError) {
				console.error(`Error removing stack ${stackId} files:`, fileError);
				throw new Error(`Failed to remove stack files: ${fileError}`);
			}
		}

		stackCache.delete('compose-stacks');
		return true;
	} catch (error) {
		console.error(`Error deleting stack ${stackId}:`, error);
		throw error;
	}
}

/**
 * Pull images for a stack
 */
export async function pullStackImages(stackId: string): Promise<boolean> {
	try {
		const stack = await getStack(stackId);
		if (!stack.composeContent) {
			throw new Error(`No compose content found for stack ${stackId}`);
		}

		const composeData = parseYamlContent(stack.composeContent);
		if (!composeData || !composeData.services) {
			throw new Error(`No services found in compose file for stack ${stackId}`);
		}

		const docker = await getDockerClient();
		const pullPromises = [];

		for (const [serviceName, serviceConfig] of Object.entries(composeData.services)) {
			const service = serviceConfig as any;
			if (service.image) {
				console.log(`Pulling image for service ${serviceName}: ${service.image}`);
				pullPromises.push(pullImage(docker, service.image));
			}
		}

		await Promise.all(pullPromises);
		console.log(`Successfully pulled all images for stack ${stackId}`);
		return true;
	} catch (error) {
		console.error(`Error pulling images for stack ${stackId}:`, error);
		throw error;
	}
}

/**
 * Get stack logs
 */
export async function getStackLogs(stackId: string, options: { tail?: number; follow?: boolean } = {}): Promise<any> {
	try {
		const docker = await getDockerClient();
		const containers = await docker.listContainers({
			all: true,
			filters: JSON.stringify({
				label: [`com.docker.compose.project=${stackId}`]
			})
		});

		const logs: Record<string, string> = {};

		for (const containerInfo of containers) {
			const container = docker.getContainer(containerInfo.Id);
			try {
				let logStream;
				if (options.follow === true) {
					logStream = await container.logs({
						stdout: true,
						stderr: true,
						tail: options.tail || 100,
						follow: true
					});
				} else {
					logStream = await container.logs({
						stdout: true,
						stderr: true,
						tail: options.tail || 100,
						follow: false
					});
				}

				const serviceName = containerInfo.Labels?.['com.docker.compose.service'] || containerInfo.Names?.[0];
				logs[serviceName || containerInfo.Id] = logStream.toString();
			} catch (logError) {
				console.error(`Error getting logs for container ${containerInfo.Id}:`, logError);
			}
		}

		return logs;
	} catch (error) {
		console.error(`Error getting logs for stack ${stackId}:`, error);
		throw error;
	}
}

/**
 * Get stack statistics
 */
export async function getStackStats(stackId: string): Promise<any> {
	try {
		const docker = await getDockerClient();
		const containers = await docker.listContainers({
			all: true,
			filters: JSON.stringify({
				label: [`com.docker.compose.project=${stackId}`]
			})
		});

		const stats: Record<string, any> = {};

		for (const containerInfo of containers) {
			if (containerInfo.State === 'running') {
				const container = docker.getContainer(containerInfo.Id);
				try {
					const statsStream = await container.stats({ stream: false });
					const serviceName = containerInfo.Labels?.['com.docker.compose.service'] || containerInfo.Names?.[0];
					stats[serviceName || containerInfo.Id] = statsStream;
				} catch (statsError) {
					console.error(`Error getting stats for container ${containerInfo.Id}:`, statsError);
				}
			}
		}

		return stats;
	} catch (error) {
		console.error(`Error getting stats for stack ${stackId}:`, error);
		throw error;
	}
}

/**
 * Validate compose content
 */
export function validateComposeContent(content: string): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	try {
		const parsed = yamlLoad(content);

		if (!parsed || typeof parsed !== 'object') {
			errors.push('Compose content must be a valid YAML object');
			return { valid: false, errors };
		}

		const compose = parsed as any;

		// Check for required version (optional but recommended)
		if (!compose.version && !compose.services) {
			errors.push('Compose file should have either a version field or services field');
		}

		// Check services
		if (!compose.services || typeof compose.services !== 'object') {
			errors.push('Compose file must have a services section');
		} else {
			// Validate each service
			for (const [serviceName, serviceConfig] of Object.entries(compose.services)) {
				const service = serviceConfig as any;

				if (!service.image && !service.build) {
					errors.push(`Service '${serviceName}' must have either an 'image' or 'build' field`);
				}

				// Check for common misconfigurations
				if (service.container_name && typeof service.container_name === 'string' && service.container_name.includes('${')) {
					errors.push(`Service '${serviceName}' has unresolved variables in container_name: ${service.container_name}`);
				}
			}
		}

		// Validate networks if present
		if (compose.networks && typeof compose.networks === 'object') {
			for (const [networkName, networkConfig] of Object.entries(compose.networks)) {
				const network = networkConfig as any;

				if (network.external && !network.name && typeof networkName !== 'string') {
					errors.push(`External network '${networkName}' should have a name field`);
				}
			}
		}
	} catch (parseError) {
		errors.push(`YAML parsing error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Export stack configuration
 */
export async function exportStack(stackId: string): Promise<{ composeContent: string; envContent: string; name: string }> {
	try {
		const stack = await getStack(stackId);

		return {
			name: stack.name,
			composeContent: stack.composeContent || '',
			envContent: stack.envContent || ''
		};
	} catch (error) {
		console.error(`Error exporting stack ${stackId}:`, error);
		throw error;
	}
}

/**
 * Get stack health status
 */
export async function getStackHealth(stackId: string): Promise<{ healthy: boolean; services: Record<string, { healthy: boolean; status: string }> }> {
	try {
		const docker = await getDockerClient();
		const containers = await docker.listContainers({
			all: true,
			filters: JSON.stringify({
				label: [`com.docker.compose.project=${stackId}`]
			})
		});

		const services: Record<string, { healthy: boolean; status: string }> = {};
		let overallHealthy = true;

		for (const containerInfo of containers) {
			const serviceName = containerInfo.Labels?.['com.docker.compose.service'] || containerInfo.Names?.[0] || containerInfo.Id;

			let healthy = false;
			let status = containerInfo.State;

			if (containerInfo.State === 'running') {
				// Check if container has health check
				try {
					const container = docker.getContainer(containerInfo.Id);
					const details = await container.inspect();

					if (details.State.Health) {
						healthy = details.State.Health.Status === 'healthy';
						status = details.State.Health.Status;
					} else {
						// No health check, consider running as healthy
						healthy = true;
						status = 'running (no healthcheck)';
					}
				} catch (inspectError) {
					console.error(`Error inspecting container ${containerInfo.Id}:`, inspectError);
					healthy = false;
					status = 'unknown';
				}
			}

			services[serviceName] = { healthy, status };

			if (!healthy) {
				overallHealthy = false;
			}
		}

		return {
			healthy: overallHealthy,
			services
		};
	} catch (error) {
		console.error(`Error getting health status for stack ${stackId}:`, error);
		throw error;
	}
}

/**
 * Destroy stack - alias for deleteStack with additional volume cleanup options
 * This function matches the API expected by the destroy endpoint
 */
export async function destroyStack(stackId: string, removeVolumes = false, removeFiles = false): Promise<boolean> {
	try {
		console.log(`Destroying stack ${stackId} (removeVolumes: ${removeVolumes}, removeFiles: ${removeFiles})`);

		// Stop the stack first
		await stopStack(stackId);

		// Remove volumes if requested
		if (removeVolumes) {
			try {
				const docker = await getDockerClient();

				// Find volumes associated with this stack
				const volumes = await docker.listVolumes({
					filters: JSON.stringify({
						label: [`com.docker.compose.project=${stackId}`]
					})
				});

				if (volumes.Volumes && volumes.Volumes.length > 0) {
					console.log(`Found ${volumes.Volumes.length} volumes for stack ${stackId}. Removing...`);

					for (const volumeInfo of volumes.Volumes) {
						try {
							const volume = docker.getVolume(volumeInfo.Name);
							await volume.remove();
							console.log(`Removed volume: ${volumeInfo.Name}`);
						} catch (volumeError) {
							console.error(`Error removing volume ${volumeInfo.Name}:`, volumeError);
						}
					}
				} else {
					console.log(`No volumes found for stack ${stackId}`);
				}
			} catch (volumeListError) {
				console.error(`Error listing volumes for stack ${stackId}:`, volumeListError);
			}
		}

		// Remove from database
		try {
			await deleteStackFromDb(stackId);
			console.log(`Stack ${stackId} removed from database`);
		} catch (dbError) {
			console.error(`Error removing stack ${stackId} from database:`, dbError);
		}

		// Remove files if requested
		if (removeFiles) {
			const stackDir = await getStackDir(stackId);
			try {
				await fs.rm(stackDir, { recursive: true, force: true });
				console.log(`Stack ${stackId} files removed from ${stackDir}`);
			} catch (fileError) {
				console.error(`Error removing stack ${stackId} files:`, fileError);
				throw new Error(`Failed to remove stack files: ${fileError}`);
			}
		}

		stackCache.delete('compose-stacks');
		console.log(`Successfully destroyed stack ${stackId}`);
		return true;
	} catch (error) {
		console.error(`Error destroying stack ${stackId}:`, error);
		throw error;
	}
}

/**
 * Background service to update stack runtime info
 */
export class StackRuntimeUpdater {
	private updateInterval: NodeJS.Timeout | null = null;
	private isUpdating = false;

	start(intervalMinutes = 2) {
		if (this.updateInterval) return;

		this.updateInterval = setInterval(
			async () => {
				if (this.isUpdating) return;

				this.isUpdating = true;
				try {
					await this.updateAllStacksRuntimeInfo();
				} catch (error) {
					console.error('Background stack runtime update failed:', error);
				} finally {
					this.isUpdating = false;
				}
			},
			intervalMinutes * 60 * 1000
		);

		console.log(`Stack runtime updater started (${intervalMinutes}m interval)`);
	}

	stop() {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = null;
		}
	}

	private async updateAllStacksRuntimeInfo() {
		try {
			const stacks = await listStacksFromDb();
			console.log(`Background updating runtime info for ${stacks.length} stacks`);

			for (const stack of stacks) {
				try {
					await this.updateSingleStackRuntimeInfo(stack.id);
				} catch (error) {
					console.warn(`Failed to update runtime info for stack ${stack.id}:`, error);
				}
			}

			// Invalidate cache after updates
			stackCache.delete('compose-stacks');
		} catch (error) {
			console.error('Background runtime update failed:', error);
		}
	}

	private async updateSingleStackRuntimeInfo(stackId: string) {
		const stack = await getStackByIdFromDb(stackId);
		if (!stack) return;

		let composeContent = stack.composeContent;
		if (!composeContent) {
			const composePath = await getComposeFilePath(stackId);
			if (composePath) {
				composeContent = await fs.readFile(composePath, 'utf8');
				await updateStackContentInDb(stackId, { composeContent });
			}
		}

		const services = await getStackServices(stackId, composeContent || '');
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

		await updateStackRuntimeInfoInDb(stackId, {
			status,
			serviceCount,
			runningCount,
			lastPolled: new Date()
		});
	}
}

export const stackRuntimeUpdater = new StackRuntimeUpdater();
