import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import Dockerode from 'dockerode';
import { dump as yamlDump } from 'js-yaml';
import slugify from 'slugify';
import { directoryExists } from '$lib/utils/fs.utils';
import { getDockerClient } from './core';
import { getSettings, ensureStacksDirectory } from '$lib/services/settings-service';
import type { Stack, StackService, StackUpdate } from '$lib/types/docker/stack.type';
import { listStacksFromDb, getStackByIdFromDb, saveStackToDb, updateStackRuntimeInfoInDb, updateStackContentInDb, deleteStackFromDb, updateStackAutoUpdateInDb, getAutoUpdateStacksFromDb } from '$lib/services/database/compose-db-service';
import {
	parseEnvContent,
	validateComposeStructure,
	normalizeHealthcheckTest,
	parseYamlContent,
	prepareVolumes,
	preparePorts,
	prepareEnvironmentVariables,
	prepareRestartPolicy,
	resolveDependencyOrder,
	prepareExtraHosts,
	prepareUlimits,
	prepareHealthcheck,
	parseMemory,
	validateComposeContent,
	substituteVariablesInObject,
	createVolumeDefinitions,
	createDependencyWaitConfig,
	parseActiveProfiles,
	getAllDefinedProfiles,
	createProfileDeploymentPlan,
	applyProfileFiltering,
	getProfileUsageStats,
	generateProfileHelp,
	validateAllDependencies,
	resolveDependencyOrderWithConditions,
	generateConfigHash,
	prepareLogConfig,
	DEFAULT_COMPOSE_VERSION
} from '$lib/utils/compose.utils';

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

/**
 * Initialize compose service with proper validation
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
		throw new Error('Failed to initialize compose service');
	}
}

/**
 * Update stacks directory with validation
 */
export function updateStacksDirectory(directory: string): void {
	if (!directory || typeof directory !== 'string') {
		throw new Error('Directory path must be a non-empty string');
	}

	if (!path.isAbsolute(directory)) {
		STACKS_DIR = path.resolve(directory);
	} else {
		STACKS_DIR = directory;
	}
	console.log(`Stacks directory updated to: ${STACKS_DIR}`);
}

/**
 * Ensure stacks directory exists with proper error handling
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

		// Verify directory is writable
		try {
			await fs.access(STACKS_DIR, fs.constants.W_OK);
		} catch {
			throw new Error(`Stacks directory ${STACKS_DIR} is not writable`);
		}

		return STACKS_DIR;
	} catch (err) {
		console.error('Error creating stacks directory:', err);
		throw new Error('Failed to create stacks storage directory');
	}
}

/**
 * Get stack directory with path sanitization
 */
export async function getStackDir(stackId: string): Promise<string> {
	if (!stackId || typeof stackId !== 'string') {
		throw new Error('Stack ID must be a non-empty string');
	}

	const stacksDirAbs = await ensureStacksDir();
	const safeId = path.basename(stackId);

	if (safeId !== stackId) {
		console.warn(`Stack ID "${stackId}" was sanitized to "${safeId}" for security`);
	}

	// Additional validation to ensure safe directory name
	if (!/^[a-z0-9][a-z0-9_-]*$/.test(safeId)) {
		throw new Error(`Invalid stack ID: "${safeId}". Stack ID must start with a lowercase letter or digit and contain only lowercase letters, digits, hyphens, and underscores.`);
	}

	return path.join(stacksDirAbs, safeId);
}

/**
 * Get compose file path with spec-compliant priority
 */
export async function getComposeFilePath(stackId: string): Promise<string | null> {
	const stackDirAbs = await getStackDir(stackId);

	// Docker Compose specification file priority
	const composePaths = [
		path.join(stackDirAbs, 'compose.yaml'), // Preferred format
		path.join(stackDirAbs, 'compose.yml'), // Alternative YAML
		path.join(stackDirAbs, 'docker-compose.yaml'), // Legacy format
		path.join(stackDirAbs, 'docker-compose.yml') // Legacy format
	];

	for (const composePath of composePaths) {
		try {
			await fs.access(composePath, fs.constants.R_OK);
			return composePath;
		} catch {
			// Continue to next path
		}
	}

	return null;
}

/**
 * Get .env file path with validation
 */
async function getEnvFilePath(stackId: string): Promise<string> {
	const stackDir = await getStackDir(stackId);
	return path.join(stackDir, '.env');
}

/**
 * Save environment variables to .env file with proper formatting
 */
async function saveEnvFile(stackId: string, content?: string): Promise<void> {
	const envPath = await getEnvFilePath(stackId);
	const fileContent = content === undefined || content === null ? '' : content;

	// Validate env content format if not empty
	if (fileContent.trim()) {
		try {
			parseEnvContent(fileContent);
		} catch (error) {
			throw new Error(`Invalid .env file format: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	await fs.writeFile(envPath, fileContent, 'utf8');
	console.log(`Saved .env file for stack ${stackId}`);
}

/**
 * Load environment variables from .env file with proper error handling
 */
export async function loadEnvFile(stackId: string): Promise<string> {
	const envPath = await getEnvFilePath(stackId);

	try {
		const content = await fs.readFile(envPath, 'utf8');

		// Validate the content can be parsed
		try {
			parseEnvContent(content);
		} catch (parseError) {
			console.warn(`Warning: .env file for stack ${stackId} has parsing issues:`, parseError);
		}

		return content;
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
 * Load compose stacks with enhanced caching and validation
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

		// Return stacks with minimal processing and validation
		const fastStacks = dbStacks
			.map((stack) => {
				// Basic validation of stack data
				if (!stack.id || typeof stack.id !== 'string') {
					console.warn('Stack missing valid ID, skipping');
					return null;
				}

				return {
					...stack,
					services: [], // Empty services array for fast loading
					status: stack.status || 'unknown'
				};
			})
			.filter(Boolean) as Stack[];

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
 * Load stacks with full runtime info and compose validation
 */
export async function loadComposeStacksWithRuntimeInfo(): Promise<Stack[]> {
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

							// Validate compose content
							const validation = validateComposeContent(composeContent);
							if (!validation.valid) {
								console.warn(`Compose validation errors for stack ${stack.id}:`, validation.errors);
							}
							if (validation.warnings.length > 0) {
								console.warn(`Compose validation warnings for stack ${stack.id}:`, validation.warnings);
							}
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
					services: [],
					status: 'unknown' as Stack['status']
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
 * Get stack services from containers with Docker Compose spec compliance
 */
async function getStackServices(stackId: string, composeContent: string): Promise<StackService[]> {
	const docker = await getDockerClient();
	const composeProjectLabel = 'com.docker.compose.project';
	const composeServiceLabel = 'com.docker.compose.service';

	console.log(`Getting services for stack ${stackId} (compose content length: ${composeContent.length})`);

	try {
		// Load and parse environment variables
		let envContent = '';
		let envVars: Record<string, string> = {};

		try {
			envContent = await loadEnvFile(stackId);
			envVars = parseEnvContent(envContent);
		} catch (envError) {
			console.log(`No .env file found for stack ${stackId}, continuing without env vars`);
		}

		// Create environment variable getter function
		const getEnvVar = (key: string): string | undefined => {
			return envVars[key] || process.env[key];
		};

		// Parse and validate compose content
		let composeData: Record<string, any> | null = null;
		let serviceNames: string[] = [];

		if (composeContent.trim()) {
			// Validate compose content first
			const validation = validateComposeContent(composeContent);
			if (!validation.valid) {
				console.warn(`Compose validation errors for stack ${stackId}:`, validation.errors);
			}

			// Parse with variable substitution
			composeData = parseYamlContent(composeContent, getEnvVar);

			// Validate compose structure
			if (composeData) {
				const structureValidation = validateComposeStructure(composeData);
				if (!structureValidation.valid) {
					console.warn(`Compose structure validation errors for stack ${stackId}:`, structureValidation.errors);
				}

				if (composeData.services) {
					serviceNames = Object.keys(composeData.services as Record<string, unknown>);
					console.log(`Found ${serviceNames.length} services defined in compose: [${serviceNames.join(', ')}]`);
				} else {
					console.warn(`No services found in compose content for stack ${stackId}`);
				}
			}
		} else {
			console.warn(`Empty compose content for stack ${stackId}`);
		}

		// List all containers
		const containers = await docker.listContainers({ all: true });
		console.log(`Total containers found: ${containers.length}`);

		// Filter containers based on Docker Compose labels and naming convention
		const stackContainers = containers.filter((container) => {
			const labels = container.Labels || {};
			const names = container.Names || [];

			// Primary filter: Docker Compose project label
			const hasCorrectLabel = labels[composeProjectLabel] === stackId;

			// Secondary filter: naming convention for backwards compatibility
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

		// Process existing containers
		for (const containerData of stackContainers) {
			const containerName = containerData.Names?.[0]?.substring(1) || '';
			const labels = containerData.Labels || {};
			let serviceName = labels[composeServiceLabel];

			console.log(`Processing container ${containerData.Id} (${containerName})`);

			// Fallback to parsing from container name if the service label is missing
			if (!serviceName && serviceNames.length > 0) {
				console.log(`Container ${containerData.Id} missing service label, trying to parse from name`);
				for (const name of serviceNames) {
					// Docker Compose naming pattern: {project}_{service}_{replica}
					const servicePrefixWithUnderscore = `${stackId}_${name}_`;
					const servicePrefixExact = `${stackId}_${name}`;
					if (containerName.startsWith(servicePrefixWithUnderscore) || containerName === servicePrefixExact) {
						serviceName = name;
						console.log(`Matched service name: ${serviceName}`);
						break;
					}
				}
			}

			// Final fallback using Docker Compose naming convention
			if (!serviceName) {
				// Extract service name from container name pattern: {project}_{service}_{replica}
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

			// Avoid adding duplicates (handle multiple replicas)
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

		// Add placeholders for services defined in compose but not found among containers
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

		// Sort services by dependency order if possible, otherwise alphabetically
		let sortedServices = services;
		if (composeData && composeData.services) {
			try {
				const dependencyOrder = resolveDependencyOrder(composeData.services);
				sortedServices = services.sort((a, b) => {
					const aIndex = dependencyOrder.indexOf(a.name);
					const bIndex = dependencyOrder.indexOf(b.name);

					// If both services are in dependency order, sort by that
					if (aIndex !== -1 && bIndex !== -1) {
						return aIndex - bIndex;
					}

					// Otherwise, alphabetical sort
					return a.name.localeCompare(b.name);
				});
			} catch (depError) {
				console.warn(`Could not resolve dependency order for stack ${stackId}, using alphabetical sort:`, depError);
				sortedServices = services.sort((a, b) => a.name.localeCompare(b.name));
			}
		} else {
			sortedServices = services.sort((a, b) => a.name.localeCompare(b.name));
		}

		console.log(`Final services for stack ${stackId}: ${sortedServices.length} services`);
		sortedServices.forEach((s) => console.log(`  - ${s.name}: ${s.state?.Status} (id: ${s.id || 'none'})`));

		return sortedServices;
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
export async function deployStack(stackId: string, options: { profiles?: string[]; envOverrides?: Record<string, string> } = {}): Promise<boolean> {
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
		const envVars = { ...parseEnvContent(envContent), ...options.envOverrides };
		const getEnvVar = (key: string): string | undefined => envVars[key] || process.env[key];

		// Normalize content for healthchecks
		const normalizedContent = normalizeHealthcheckTest(composeContent, getEnvVar);

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

		// Add comprehensive validation before deployment
		if (composeData.services) {
			console.log(`Validating dependencies for stack ${stackId}...`);
			const dependencyValidation = validateAllDependencies(composeData.services);

			if (!dependencyValidation.valid) {
				console.error(`Dependency validation failed for stack ${stackId}:`, dependencyValidation.errors);
				throw new Error(`Invalid dependencies: ${dependencyValidation.errors.join(', ')}`);
			}

			if (dependencyValidation.warnings.length > 0) {
				console.warn(`Dependency warnings for stack ${stackId}:`, dependencyValidation.warnings);
			}
		}

		// Handle profiles
		const activeProfiles = options.profiles?.length ? options.profiles : parseActiveProfiles([], envVars);
		console.log(`Active profiles for stack ${stackId}: [${activeProfiles.join(', ')}]`);

		// Apply profile filtering
		const { filteredComposeData, deploymentPlan } = applyProfileFiltering(composeData, activeProfiles);

		// Log deployment plan
		console.log(`Deployment plan for stack ${stackId}:`);
		console.log(`  Services to deploy (${deploymentPlan.plan.servicesToDeploy.length}): [${deploymentPlan.plan.servicesToDeploy.join(', ')}]`);

		if (deploymentPlan.plan.servicesToSkip.length > 0) {
			console.log(`  Services to skip (${deploymentPlan.plan.servicesToSkip.length}):`);
			for (const skipped of deploymentPlan.plan.servicesToSkip) {
				console.log(`    - ${skipped.name}: ${skipped.reason}`);
			}
		}

		if (deploymentPlan.warnings.length > 0) {
			console.warn(`Profile warnings for stack ${stackId}:`, deploymentPlan.warnings);
		}

		if (deploymentPlan.errors.length > 0) {
			throw new Error(`Profile errors for stack ${stackId}: ${deploymentPlan.errors.join(', ')}`);
		}

		console.log(`Checking for existing containers for stack ${stackId}...`);
		const docker = await getDockerClient();

		try {
			const existingContainers = await docker.listContainers({
				all: true,
				filters: JSON.stringify({
					label: [`com.docker.compose.project=${stackId}`]
				})
			});

			if (existingContainers.length > 0) {
				console.log(`Found ${existingContainers.length} existing containers for stack ${stackId}. Stopping and removing...`);

				for (const containerInfo of existingContainers) {
					const container = docker.getContainer(containerInfo.Id);
					try {
						if (containerInfo.State === 'running') {
							await container.stop({ t: 10 });
						}
						await container.remove({ force: true });
						console.log(`Removed container ${containerInfo.Names?.[0]} (${containerInfo.Id})`);
					} catch (containerErr) {
						console.warn(`Error removing container ${containerInfo.Id}:`, containerErr);
					}
				}
			}
		} catch (cleanupErr) {
			console.warn(`Error during container cleanup for stack ${stackId}:`, cleanupErr);
		}

		// Use filtered compose data for deployment
		const hasExternalNetworks = filteredComposeData.networks && Object.values(filteredComposeData.networks).some((net: any) => net.external);

		try {
			deploymentStarted = true;
			if (hasExternalNetworks) {
				console.log(`Stack ${stackId} contains external networks. Using custom deployment approach.`);
				await deployStackWithExternalNetworks(stackId, filteredComposeData, stackDir);
			} else {
				// Standard approach for stacks without external networks
				const docker = await getDockerClient();

				// Pull images for deployable services only
				const imagePullPromises = Object.entries(filteredComposeData.services || {})
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

				// Create networks for deployable services only
				await createStackNetworks(docker, stackId, filteredComposeData.networks || {});

				// Deploy filtered services
				await createAndStartServices(docker, stackId, filteredComposeData, stackDir);
			}

			// Update database with new status
			try {
				await updateStackRuntimeInfoInDb(stackId, {
					status: 'running',
					lastPolled: Math.floor(Date.now() / 1000)
				});
			} catch (dbError) {
				console.error(`Error updating stack ${stackId} status in database:`, dbError);
			}

			stackCache.delete('compose-stacks');
			return true;
		} catch (deployErr) {
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
 * Create and start all services with proper Docker Compose spec compliance
 */
async function createAndStartServices(docker: Dockerode, stackId: string, composeData: any, stackDir: string): Promise<void> {
	if (!composeData || !composeData.services) {
		throw new Error(`No services defined in compose file for stack ${stackId}`);
	}

	// Note: composeData should already be filtered by profiles at this point
	console.log(`Creating and starting ${Object.keys(composeData.services).length} services for stack ${stackId}`);

	// Load environment variables for substitution
	let envVars: Record<string, string> = {};
	try {
		const envContent = await loadEnvFile(stackId);
		envVars = parseEnvContent(envContent);
	} catch (envError) {
		console.log(`No .env file found for stack ${stackId}, proceeding without env vars`);
	}

	const getEnvVar = (key: string): string | undefined => {
		return envVars[key] || process.env[key];
	};

	// Substitute variables in the entire compose data
	const processedComposeData = substituteVariablesInObject(composeData, getEnvVar);

	// Resolve service dependency order for proper startup sequence
	let serviceOrder: string[];
	try {
		const dependencyResolution = resolveDependencyOrderWithConditions(processedComposeData.services);
		serviceOrder = dependencyResolution.order;

		console.log(`Enhanced service startup order for stack ${stackId}: [${serviceOrder.join(', ')}]`);
		console.log(`Service deployment batches:`, dependencyResolution.batches);

		if (dependencyResolution.warnings.length > 0) {
			console.warn(`Dependency order warnings for stack ${stackId}:`, dependencyResolution.warnings);
		}
	} catch (depError) {
		console.warn(`Could not resolve enhanced dependencies for stack ${stackId}, falling back to basic resolution:`, depError);
		try {
			serviceOrder = resolveDependencyOrder(processedComposeData.services);
		} catch (basicDepError) {
			console.warn(`Basic dependency resolution also failed, using alphabetical order:`, basicDepError);
			serviceOrder = Object.keys(processedComposeData.services).sort();
		}
	}

	// Before creating containers, create required volumes
	const volumeDefinitions = createVolumeDefinitions(processedComposeData, stackId);
	for (const volumeDef of volumeDefinitions) {
		try {
			console.log(`Creating volume: ${volumeDef.name}`);
			await docker.createVolume({
				Name: volumeDef.name,
				...volumeDef.config
			});
			console.log(`Successfully created volume: ${volumeDef.name}`);
		} catch (createErr: any) {
			if (createErr.statusCode === 409) {
				console.log(`Volume ${volumeDef.name} already exists, reusing it.`);
			} else {
				console.error(`Error creating volume ${volumeDef.name}:`, createErr);
				throw createErr;
			}
		}
	}

	// Create and start services in dependency order
	for (const serviceName of serviceOrder) {
		const serviceConfig = processedComposeData.services[serviceName];
		if (!serviceConfig) {
			console.warn(`Service ${serviceName} not found in processed compose data, skipping`);
			continue;
		}

		console.log(`Creating service: ${serviceName}`);

		// Validate image is present (required by spec)
		if (!serviceConfig.image && !serviceConfig.build) {
			throw new Error(`Service ${serviceName} must specify either 'image' or 'build'`);
		}

		// Enhanced dependency condition handling
		if (serviceConfig.depends_on) {
			const dependencyConfig = createDependencyWaitConfig(serviceName, serviceConfig);

			if (dependencyConfig.warnings.length > 0) {
				console.warn(`Dependency warnings for service ${serviceName}:`, dependencyConfig.warnings);
			}

			// Wait for all dependencies
			for (const dep of dependencyConfig.dependencies) {
				console.log(`Waiting for dependency: ${dep.service} (condition: ${dep.condition}, timeout: ${dep.timeout}ms)`);

				try {
					await waitForDependency(stackId, dep.service, dep.condition, dep.timeout, dep.restart);
				} catch (depError) {
					const errorMsg = `Failed to satisfy dependency '${dep.service}' for service '${serviceName}': ${depError instanceof Error ? depError.message : String(depError)}`;
					console.error(errorMsg);

					// For critical conditions, fail the deployment
					if (dep.condition === 'service_healthy' || dep.condition === 'service_completed_successfully') {
						throw new Error(errorMsg);
					} else {
						// For service_started, just warn and continue
						console.warn(`Continuing deployment despite dependency failure: ${errorMsg}`);
					}
				}
			}
		}

		// Continue with existing container creation logic...
		// (Keep all the existing container configuration code from your current implementation)

		// Determine container name using Docker Compose convention
		let containerName = serviceConfig.container_name;
		if (!containerName || typeof containerName !== 'string') {
			containerName = `${stackId}_${serviceName}_1`;
		}

		// Validate container name doesn't have unresolved variables
		if (containerName.includes('${')) {
			console.warn(`CRITICAL: Unresolved variable in container_name for service '${serviceName}': ${containerName}. Using default name: ${stackId}_${serviceName}_1`);
			containerName = `${stackId}_${serviceName}_1`;
		}

		// Continue with the rest of your existing container configuration...
		// [Keep all existing containerConfig setup, networking, volume mounting, etc.]
		// (I'm shortening this for brevity, but keep all your existing logic)

		// Create the container configuration
		const containerConfig: any = {
			name: containerName,
			Image: serviceConfig.image,
			Labels: {
				'com.docker.compose.project': stackId,
				'com.docker.compose.service': serviceName,
				'com.docker.compose.config-hash': generateConfigHash(serviceConfig),
				'com.docker.compose.version': DEFAULT_COMPOSE_VERSION,
				...(serviceConfig.labels || {})
			},
			Env: await prepareEnvironmentVariables(serviceConfig.environment, stackDir),
			HostConfig: {
				RestartPolicy: prepareRestartPolicy(serviceConfig.restart),
				Binds: prepareVolumes(serviceConfig.volumes, processedComposeData, stackId),
				PortBindings: preparePorts(serviceConfig.ports),
				Memory: serviceConfig.mem_limit ? parseMemory(serviceConfig.mem_limit) : undefined,
				NanoCpus: serviceConfig.cpus ? Math.floor(parseFloat(serviceConfig.cpus) * 1_000_000_000) : undefined,
				ExtraHosts: prepareExtraHosts(serviceConfig.extra_hosts),
				Ulimits: prepareUlimits(serviceConfig.ulimits),
				LogConfig: prepareLogConfig(serviceConfig.logging || {}), // Add logging configuration
				Dns: serviceConfig.dns || [],
				DnsOptions: serviceConfig.dns_opt || [],
				DnsSearch: serviceConfig.dns_search || [],
				CapAdd: serviceConfig.cap_add || [],
				CapDrop: serviceConfig.cap_drop || [],
				Privileged: serviceConfig.privileged || false,
				ReadonlyRootfs: serviceConfig.read_only || false
			}
		};

		// Add command and entrypoint if specified
		if (serviceConfig.command) {
			containerConfig.Cmd = Array.isArray(serviceConfig.command) ? serviceConfig.command : [serviceConfig.command];
		}
		if (serviceConfig.entrypoint) {
			containerConfig.Entrypoint = Array.isArray(serviceConfig.entrypoint) ? serviceConfig.entrypoint : [serviceConfig.entrypoint];
		}

		// Add working directory, user, etc.
		if (serviceConfig.working_dir) containerConfig.WorkingDir = serviceConfig.working_dir;
		if (serviceConfig.user) containerConfig.User = serviceConfig.user;

		// Handle networking
		if (serviceConfig.network_mode) {
			containerConfig.HostConfig.NetworkMode = serviceConfig.network_mode;
		} else if (serviceConfig.networks) {
			// Handle Docker Compose networks
			const networks = Array.isArray(serviceConfig.networks) ? serviceConfig.networks : Object.keys(serviceConfig.networks);
			if (networks.length > 0) {
				const primaryNetwork = networks[0];
				const networkDefinition = processedComposeData.networks?.[primaryNetwork];
				const fullNetworkName = networkDefinition?.external ? networkDefinition.name || primaryNetwork : `${stackId}_${primaryNetwork}`;
				containerConfig.HostConfig.NetworkMode = fullNetworkName;
			}
		}

		// Add healthcheck if present
		if (serviceConfig.healthcheck) {
			containerConfig.Healthcheck = prepareHealthcheck(serviceConfig.healthcheck);
		}

		try {
			console.log(`Creating container: ${containerName}`);
			const container = await docker.createContainer(containerConfig);
			console.log(`Successfully created container: ${containerName} (ID: ${container.id})`);

			// Connect to additional networks if needed
			if (serviceConfig.networks && !serviceConfig.network_mode) {
				const networks = Array.isArray(serviceConfig.networks) ? serviceConfig.networks : Object.keys(serviceConfig.networks);
				const additionalNetworks = networks.slice(1); // Skip first network (already set as NetworkMode)

				for (const netName of additionalNetworks) {
					try {
						const networkDefinition = processedComposeData.networks?.[netName];
						const fullNetworkName = networkDefinition?.external ? networkDefinition.name || netName : `${stackId}_${netName}`;

						const network = docker.getNetwork(fullNetworkName);
						await network.connect({
							Container: container.id,
							EndpointConfig: {}
						});
						console.log(`Connected container ${container.id} to network: ${fullNetworkName}`);
					} catch (netErr) {
						console.error(`Error connecting container to network ${netName}:`, netErr);
					}
				}
			}

			console.log(`Starting container: ${containerName} (ID: ${container.id})`);
			await container.start();
			console.log(`Successfully started container: ${containerName}`);
		} catch (createErr) {
			console.error(`Error creating/starting container for service ${serviceName}:`, createErr);
			throw createErr;
		}
	}

	console.log(`Successfully created and started all services for stack ${stackId}`);
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
				label: [`com.docker.compose.project=${stackId}`]
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

/**
 * Enhanced dependency waiting with support for all Docker Compose conditions
 */
async function waitForDependency(stackId: string, depServiceName: string, condition: string = 'service_started', timeout: number = 30000, restart: boolean = false): Promise<void> {
	const docker = await getDockerClient();
	const pollInterval = 1000; // 1 second
	const startTime = Date.now();

	console.log(`Waiting for dependency '${depServiceName}' with condition '${condition}' for stack ${stackId} (timeout: ${timeout}ms)`);

	while (Date.now() - startTime < timeout) {
		try {
			// Find the dependency container
			const containers = await docker.listContainers({
				all: true,
				filters: JSON.stringify({
					label: [`com.docker.compose.project=${stackId}`, `com.docker.compose.service=${depServiceName}`]
				})
			});

			if (containers.length === 0) {
				// If no container found, wait a bit more
				await new Promise((resolve) => setTimeout(resolve, pollInterval));
				continue;
			}

			const depContainer = containers[0];
			const conditionMet = await checkDependencyCondition(docker, depContainer, condition);

			if (conditionMet.satisfied) {
				console.log(`Dependency '${depServiceName}' satisfied condition '${condition}': ${conditionMet.reason}`);
				return;
			}

			// If condition not met and restart is enabled, check if we need to restart
			if (restart && conditionMet.shouldRestart) {
				console.log(`Restarting dependency '${depServiceName}' due to: ${conditionMet.reason}`);
				try {
					const container = docker.getContainer(depContainer.Id);
					await container.restart();
					console.log(`Restarted dependency container '${depServiceName}'`);
				} catch (restartError) {
					console.warn(`Failed to restart dependency '${depServiceName}':`, restartError);
				}
			}

			// Wait before next poll
			await new Promise((resolve) => setTimeout(resolve, pollInterval));
		} catch (error) {
			console.warn(`Error checking dependency ${depServiceName}:`, error);
			await new Promise((resolve) => setTimeout(resolve, pollInterval));
		}
	}

	// Timeout reached
	const message = `Timeout waiting for dependency '${depServiceName}' with condition '${condition}' for stack ${stackId} (${timeout}ms)`;
	console.warn(message);

	// For health and completion conditions, this might be more critical
	if (condition === 'service_healthy' || condition === 'service_completed_successfully') {
		throw new Error(message);
	}

	// For service_started, just warn - Docker Compose is sometimes lenient
}

/**
 * Check if a dependency condition is satisfied
 */
async function checkDependencyCondition(docker: Dockerode, containerInfo: any, condition: string): Promise<{ satisfied: boolean; reason: string; shouldRestart: boolean }> {
	switch (condition) {
		case 'service_started':
			return {
				satisfied: containerInfo.State === 'running',
				reason: containerInfo.State === 'running' ? 'Container is running' : `Container state: ${containerInfo.State}`,
				shouldRestart: false
			};

		case 'service_healthy':
			if (containerInfo.State !== 'running') {
				return {
					satisfied: false,
					reason: `Container not running (state: ${containerInfo.State})`,
					shouldRestart: containerInfo.State === 'exited'
				};
			}

			try {
				const container = docker.getContainer(containerInfo.Id);
				const details = await container.inspect();

				if (!details.State.Health) {
					// No healthcheck defined, but container is running
					return {
						satisfied: true,
						reason: 'No healthcheck defined, considering running container as healthy',
						shouldRestart: false
					};
				}

				const healthStatus = details.State.Health.Status;
				const isHealthy = healthStatus === 'healthy';

				return {
					satisfied: isHealthy,
					reason: `Health status: ${healthStatus}${details.State.Health.Log ? ` (last check: ${details.State.Health.Log[details.State.Health.Log.length - 1]?.Output?.trim() || 'no output'})` : ''}`,
					shouldRestart: healthStatus === 'unhealthy'
				};
			} catch (inspectError) {
				return {
					satisfied: false,
					reason: `Failed to inspect container: ${inspectError instanceof Error ? inspectError.message : String(inspectError)}`,
					shouldRestart: false
				};
			}

		case 'service_completed_successfully':
			if (containerInfo.State === 'exited') {
				try {
					const container = docker.getContainer(containerInfo.Id);
					const details = await container.inspect();
					const exitCode = details.State.ExitCode;

					return {
						satisfied: exitCode === 0,
						reason: `Container exited with code ${exitCode}`,
						shouldRestart: exitCode !== 0
					};
				} catch (inspectError) {
					return {
						satisfied: false,
						reason: `Failed to inspect exited container: ${inspectError instanceof Error ? inspectError.message : String(inspectError)}`,
						shouldRestart: false
					};
				}
			} else if (containerInfo.State === 'running') {
				return {
					satisfied: false,
					reason: 'Container is still running, waiting for completion',
					shouldRestart: false
				};
			} else {
				return {
					satisfied: false,
					reason: `Container in unexpected state for completion check: ${containerInfo.State}`,
					shouldRestart: true
				};
			}

		default:
			return {
				satisfied: false,
				reason: `Unknown dependency condition: ${condition}`,
				shouldRestart: false
			};
	}
}

export const stackRuntimeUpdater = new StackRuntimeUpdater();

/**
 * Add new function to get profile information for a stack
 */
export async function getStackProfiles(stackId: string): Promise<{
	allProfiles: string[];
	stats: ReturnType<typeof getProfileUsageStats>;
	help: string;
}> {
	try {
		const composePath = await getComposeFilePath(stackId);
		if (!composePath) {
			throw new Error(`Compose file not found for stack ${stackId}`);
		}

		const composeContent = await fs.readFile(composePath, 'utf8');
		const envContent = await loadEnvFile(stackId);

		const envVars = parseEnvContent(envContent);
		const getEnvVar = (key: string): string | undefined => envVars[key] || process.env[key];

		const composeData = parseYamlContent(composeContent, getEnvVar);

		if (!composeData) {
			throw new Error(`Failed to parse compose file for stack ${stackId}`);
		}

		const allProfiles = getAllDefinedProfiles(composeData);
		const stats = getProfileUsageStats(composeData);
		const help = generateProfileHelp(composeData);

		return {
			allProfiles,
			stats,
			help
		};
	} catch (error) {
		console.error(`Error getting profiles for stack ${stackId}:`, error);
		throw error;
	}
}

/**
 * Add function to preview deployment with profiles
 */
export async function previewStackDeployment(
	stackId: string,
	profiles: string[] = []
): Promise<{
	deploymentPlan: ReturnType<typeof createProfileDeploymentPlan>;
	profileInfo: Awaited<ReturnType<typeof getStackProfiles>>;
}> {
	try {
		const composePath = await getComposeFilePath(stackId);
		if (!composePath) {
			throw new Error(`Compose file not found for stack ${stackId}`);
		}

		const composeContent = await fs.readFile(composePath, 'utf8');
		const envContent = await loadEnvFile(stackId);

		const envVars = parseEnvContent(envContent);
		const getEnvVar = (key: string): string | undefined => envVars[key] || process.env[key];

		const composeData = parseYamlContent(composeContent, getEnvVar);

		if (!composeData) {
			throw new Error(`Failed to parse compose file for stack ${stackId}`);
		}

		const activeProfiles = profiles.length ? profiles : parseActiveProfiles([], envVars);
		const deploymentPlan = createProfileDeploymentPlan(composeData, activeProfiles);
		const profileInfo = await getStackProfiles(stackId);

		return {
			deploymentPlan,
			profileInfo
		};
	} catch (error) {
		console.error(`Error previewing deployment for stack ${stackId}:`, error);
		throw error;
	}
}

/**
 * Add function to detect configuration changes using hash comparison
 */
export async function detectStackChanges(stackId: string): Promise<{
	hasChanges: boolean;
	changedServices: string[];
	newServices: string[];
	removedServices: string[];
}> {
	try {
		const composePath = await getComposeFilePath(stackId);
		if (!composePath) {
			throw new Error(`Compose file not found for stack ${stackId}`);
		}

		const composeContent = await fs.readFile(composePath, 'utf8');
		const envContent = await loadEnvFile(stackId);

		const envVars = parseEnvContent(envContent);
		const getEnvVar = (key: string): string | undefined => envVars[key] || process.env[key];

		const composeData = parseYamlContent(composeContent, getEnvVar);
		if (!composeData || !composeData.services) {
			return { hasChanges: false, changedServices: [], newServices: [], removedServices: [] };
		}

		// Get current running containers
		const docker = await getDockerClient();
		const containers = await docker.listContainers({
			all: true,
			filters: JSON.stringify({
				label: [`com.docker.compose.project=${stackId}`]
			})
		});

		const runningServices = new Map<string, string>(); // service -> config hash
		for (const container of containers) {
			const serviceName = container.Labels?.['com.docker.compose.service'];
			const configHash = container.Labels?.['com.docker.compose.config-hash'];
			if (serviceName && configHash) {
				runningServices.set(serviceName, configHash);
			}
		}

		const changedServices: string[] = [];
		const newServices: string[] = [];
		const currentServices = new Set<string>();

		// Check each service in compose file
		for (const [serviceName, serviceConfig] of Object.entries(composeData.services)) {
			currentServices.add(serviceName);
			const currentHash = generateConfigHash(serviceConfig);

			if (runningServices.has(serviceName)) {
				const runningHash = runningServices.get(serviceName);
				if (runningHash !== currentHash) {
					changedServices.push(serviceName);
				}
			} else {
				newServices.push(serviceName);
			}
		}

		// Find removed services
		const removedServices = Array.from(runningServices.keys()).filter((service) => !currentServices.has(service));

		const hasChanges = changedServices.length > 0 || newServices.length > 0 || removedServices.length > 0;

		return {
			hasChanges,
			changedServices,
			newServices,
			removedServices
		};
	} catch (error) {
		console.error(`Error detecting changes for stack ${stackId}:`, error);
		throw error;
	}
}

/**
 * Add function to validate stack before deployment
 */
export async function validateStackConfiguration(stackId: string): Promise<{
	valid: boolean;
	errors: string[];
	warnings: string[];
}> {
	try {
		const composePath = await getComposeFilePath(stackId);
		if (!composePath) {
			return {
				valid: false,
				errors: ['Compose file not found'],
				warnings: []
			};
		}

		const composeContent = await fs.readFile(composePath, 'utf8');
		const envContent = await loadEnvFile(stackId);

		const envVars = parseEnvContent(envContent);
		const getEnvVar = (key: string): string | undefined => envVars[key] || process.env[key];

		// Validate compose content format
		const contentValidation = validateComposeContent(composeContent);
		if (!contentValidation.valid) {
			return {
				valid: false,
				errors: contentValidation.errors,
				warnings: contentValidation.warnings
			};
		}

		const composeData = parseYamlContent(composeContent, getEnvVar);
		if (!composeData) {
			return {
				valid: false,
				errors: ['Failed to parse compose file'],
				warnings: []
			};
		}

		// Validate compose structure
		const structureValidation = validateComposeStructure(composeData);

		// Validate dependencies
		const dependencyValidation = composeData.services ? validateAllDependencies(composeData.services) : { valid: true, errors: [], warnings: [] };

		const allErrors = [...contentValidation.errors, ...structureValidation.errors, ...dependencyValidation.errors];

		const allWarnings = [...contentValidation.warnings, ...structureValidation.warnings, ...dependencyValidation.warnings];

		return {
			valid: allErrors.length === 0,
			errors: allErrors,
			warnings: allWarnings
		};
	} catch (error) {
		return {
			valid: false,
			errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
			warnings: []
		};
	}
}
