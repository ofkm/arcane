import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { basename } from 'node:path';
import DockerodeCompose from 'dockerode-compose';
import yaml from 'js-yaml';
import { nanoid } from 'nanoid';

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
async function ensureStacksDir(): Promise<string> {
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
 * The function `getStackDir` returns the directory path for a given stack ID after ensuring the
 * existence of the stacks directory.
 * @param {string} stackId - The `stackId` parameter is a string that represents the unique identifier
 * of a stack.
 * @returns The function `getStackDir` returns a Promise that resolves to a string representing the
 * directory path where the stack with the given `stackId` is located.
 */
async function getStackDir(stackId: string): Promise<string> {
	const stacksDir = await ensureStacksDir();
	const safeId = basename(stackId); // strips path
	if (safeId !== stackId) {
		throw new Error('Invalid stack id');
	}
	return join(stacksDir, safeId);
}

/**
 * The function `getComposeFilePath` returns the path to the docker-compose.yml file within the
 * directory of a given stack ID.
 * @param {string} stackId - The `stackId` parameter is a string that represents the unique identifier
 * of a stack in a system.
 * @returns The function `getComposeFilePath` returns a Promise that resolves to a string representing
 * the file path of the `docker-compose.yml` file within the directory of the stack identified by
 * `stackId`.
 */
async function getComposeFilePath(stackId: string): Promise<string> {
	const stackDir = await getStackDir(stackId);
	return join(stackDir, 'docker-compose.yml');
}

/**
 * The function `getStackMetaPath` returns the path to the meta.json file within the directory of a
 * given stack ID.
 * @param {string} stackId - StackId is a string parameter that represents the unique identifier of a
 * stack.
 * @returns The function `getStackMetaPath` returns a `Promise` that resolves to a string representing
 * the path to the `meta.json` file within the directory of the stack identified by the `stackId`
 * parameter.
 */
async function getStackMetaPath(stackId: string): Promise<string> {
	const stackDir = await getStackDir(stackId);
	return join(stackDir, 'meta.json');
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

	try {
		const composeData = yaml.load(composeContent) as any;
		if (!composeData || !composeData.services) {
			return [];
		}

		const serviceNames = Object.keys(composeData.services);

		const containers = await docker.listContainers({ all: true });

		const stackPrefix = `${stackId}_`;
		const stackContainers = containers.filter((container) => {
			const names = container.Names || [];
			return names.some((name) => name.startsWith(`/${stackPrefix}`));
		});

		const services: StackService[] = [];

		for (const containerData of stackContainers) {
			let containerName = containerData.Names?.[0] || '';
			containerName = containerName.substring(1);

			let serviceName = '';
			for (const name of serviceNames) {
				if (containerName.startsWith(`${stackId}_${name}_`) || containerName === `${stackId}_${name}`) {
					serviceName = name;
					break;
				}
			}

			if (!serviceName) {
				serviceName = containerName;
			}

			const service: StackService = {
				id: containerData.Id,
				name: serviceName,
				state: {
					Running: containerData.State === 'running',
					Status: containerData.State,
					ExitCode: 0
				}
			};

			services.push(service);
		}

		for (const name of serviceNames) {
			if (!services.some((s) => s.name === name)) {
				services.push({
					id: '',
					name: name,
					state: {
						Running: false,
						Status: 'not created',
						ExitCode: 0
					}
				});
			}
		}

		return services;
	} catch (err) {
		console.error(`Error getting services for stack ${stackId}:`, err);
		return [];
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
			try {
				const metaPath = await getStackMetaPath(dir);
				const composePath = await getComposeFilePath(dir);

				const [metaContent, composeContent] = await Promise.all([fs.readFile(metaPath, 'utf8'), fs.readFile(composePath, 'utf8')]);

				const meta = JSON.parse(metaContent) as StackMeta;

				const services = await getStackServices(dir, composeContent);

				const serviceCount = services.length;
				const runningCount = services.filter((s) => s.state?.Running).length;

				let status: Stack['status'] = 'stopped';
				if (runningCount === serviceCount && serviceCount > 0) {
					status = 'running';
				} else if (runningCount > 0) {
					status = 'partially running';
				}

				stacks.push({
					id: dir,
					name: meta.name,
					serviceCount,
					runningCount,
					status,
					createdAt: meta.createdAt,
					updatedAt: meta.updatedAt
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
 * This TypeScript function retrieves information about a stack, including its services and status,
 * based on the provided stack ID.
 * @param {string} stackId - The `stackId` parameter is a string that represents the unique identifier
 * of a stack. It is used to retrieve information about a specific stack, such as its metadata,
 * services, status, and content.
 * @returns The `getStack` function returns a Promise that resolves to an object of type `Stack`. The
 * `Stack` object contains properties such as `id`, `name`, `services`, `serviceCount`, `runningCount`,
 * `status`, `createdAt`, `updatedAt`, and `composeContent`. These properties hold information about a
 * specific stack identified by `stackId`.
 */
export async function getStack(stackId: string): Promise<Stack> {
	try {
		const metaPath = await getStackMetaPath(stackId);
		const composePath = await getComposeFilePath(stackId);

		const [metaContent, composeContent] = await Promise.all([fs.readFile(metaPath, 'utf8'), fs.readFile(composePath, 'utf8')]);

		const meta = JSON.parse(metaContent) as StackMeta;

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
			composeContent
		};
	} catch (err) {
		console.error(`Error getting stack ${stackId}:`, err);
		throw new Error(`Stack not found or cannot be accessed`);
	}
}

/**
 * The function `createStack` creates a new stack with a unique ID, saves the stack's metadata and
 * Docker Compose file to disk, and returns information about the created stack.
 * @param {string} name - The `name` parameter is a string that represents the name of the stack being
 * created. It is used to identify the stack and is included in the metadata of the stack.
 * @param {string} composeContent - The `composeContent` parameter in the `createStack` function is a
 * string that represents the content of a Docker Compose file. This file defines the services,
 * networks, and volumes for a Docker application. It is used to configure and run multiple Docker
 * containers as a single application.
 * @returns The `createStack` function returns a Promise that resolves to a `Stack` object with the
 * following properties:
 * - `id`: The unique identifier of the stack
 * - `name`: The name of the stack
 * - `serviceCount`: The number of services defined in the Docker Compose file
 * - `runningCount`: The number of services currently running
 * - `status`: The status of the
 */
export async function createStack(name: string, composeContent: string): Promise<Stack> {
	const stackId = nanoid();
	const stackDir = await getStackDir(stackId);
	const composePath = join(stackDir, 'docker-compose.yml');
	const metaPath = join(stackDir, 'meta.json');

	const meta: StackMeta = {
		name,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};

	try {
		await fs.mkdir(stackDir, { recursive: true });
		await Promise.all([fs.writeFile(composePath, composeContent, 'utf8'), fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8')]);

		let serviceCount = 0;
		try {
			const composeData = yaml.load(composeContent) as any;
			if (composeData?.services) {
				serviceCount = Object.keys(composeData.services).length;
			}
		} catch (parseErr) {
			console.warn(`Could not parse compose file during creation for stack ${stackId}:`, parseErr);
		}

		return {
			id: stackId,
			name: meta.name,
			serviceCount: serviceCount,
			runningCount: 0,
			status: 'stopped',
			createdAt: meta.createdAt,
			updatedAt: meta.updatedAt,
			composeContent: composeContent
		};
	} catch (err) {
		console.error('Error creating stack:', err);
		try {
			await fs.rm(stackDir, { recursive: true, force: true });
		} catch (cleanupErr) {
			console.error(`Failed to cleanup partially created stack directory ${stackDir}:`, cleanupErr);
		}
		throw new Error('Failed to create stack files');
	}
}

/**
 * The function `updateStack` updates a stack's metadata and compose file, calculates the status of the
 * stack based on its services, and returns the updated stack information.
 * @param {string} stackId - The `stackId` parameter is a string that represents the unique identifier
 * of the stack that you want to update.
 * @param {StackUpdate} updates - The `updates` parameter in the `updateStack` function is an object
 * that contains the changes you want to apply to the stack. It can have the following properties:
 * @returns The `updateStack` function returns a Promise that resolves to a `Stack` object with the
 * following properties:
 * - `id`: The ID of the stack
 * - `name`: The updated name of the stack
 * - `serviceCount`: The total number of services in the stack
 * - `runningCount`: The number of services currently running in the stack
 * - `status`: The status of the
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
			updatedAt: new Date().toISOString()
		};

		const promises = [fs.writeFile(metaPath, JSON.stringify(updatedMeta, null, 2), 'utf8')];

		if (updates.composeContent) {
			promises.push(fs.writeFile(composePath, updates.composeContent, 'utf8'));
		}

		await Promise.all(promises);

		const composeContent = updates.composeContent || (await fs.readFile(composePath, 'utf8'));
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
			updatedAt: updatedMeta.updatedAt
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
 * success.
 * @param {string} stackId - The `stackId` parameter is a string that represents the identifier of the
 * stack that you want to stop.
 * @returns The `stopStack` function returns a Promise that resolves to a boolean value. If the stack
 * is stopped successfully, it returns `true`. If an error occurs during the process of stopping the
 * stack, it will log the error, throw a new Error with a message indicating the failure, and the
 * Promise will be rejected.
 */
export async function stopStack(stackId: string): Promise<boolean> {
	try {
		const compose = await getComposeInstance(stackId);
		await compose.down();
		return true;
	} catch (err: unknown) {
		console.error(`Error stopping stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to stop stack: ${errorMessage}`);
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
	try {
		const compose = await getComposeInstance(stackId);
		await compose.down();
		await compose.up();
		return true;
	} catch (err: unknown) {
		console.error(`Error restarting stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to restart stack: ${errorMessage}`);
	}
}

/**
 * The function `fulllyRedployStack` asynchronously stops, pulls latest images, and restarts a
 * specified stack, returning true if successful.
 * @param {string} stackId - The `stackId` parameter in the `fulllyRedployStack` function is a string
 * that represents the identifier of the stack that you want to fully redeploy. This function stops the
 * stack, pulls the latest images, and then starts the stack again to ensure a full redeployment of the
 * specified
 * @returns The `fulllyRedployStack` function returns a `Promise<boolean>`. The function attempts to
 * fully redeploy a stack by stopping it, pulling the latest images, and then starting it again. If all
 * commands succeed, the function resolves the promise with a value of `true`. If an error occurs
 * during the process, the function catches the error, logs it, and then throws a new `
 */
export async function fulllyRedployStack(stackId: string): Promise<boolean> {
	try {
		const compose = await getComposeInstance(stackId);

		// Stop the stack
		console.log(`Stopping stack ${stackId}...`);
		await compose.down();
		console.log(`Stack ${stackId} stopped.`);

		// Pull the latest images
		console.log(`Pulling images for stack ${stackId}...`);
		await compose.pull();
		console.log(`Images pulled for stack ${stackId}.`);

		// Start the stack again
		console.log(`Starting stack ${stackId}...`);
		await compose.up();
		console.log(`Stack ${stackId} started.`);

		// If all commands succeeded, return true
		return true;
	} catch (err: unknown) {
		console.error(`Error restarting stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to restart stack: ${errorMessage}`);
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
	try {
		const compose = await getComposeInstance(stackId);
		const stackDir = await getStackDir(stackId);

		await compose.down();
		try {
			await fs.rm(stackDir, { recursive: true, force: true });
		} catch (e) {
			console.error(`Failed to remove stack directory ${stackDir}:`, e);
			return false;
		}

		return true;
	} catch (err: unknown) {
		console.error(`Error removing stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to remove stack: ${errorMessage}`);
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
