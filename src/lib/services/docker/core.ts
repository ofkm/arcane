import Docker from 'dockerode';
import type { DockerConnectionOptions } from '$lib/types/docker';
import { getSettings } from '$lib/services/settings-service'; // Assuming getSettings is async and available here

let dockerClient: Docker | null = null;
export let dockerHost = 'unix:///var/run/docker.sock'; // Default and cache for the last used host

/**
 * The function `getDockerInfo` asynchronously retrieves information about the Docker environment.
 */
export async function getDockerInfo() {
	const docker = await getDockerClient(); // Changed: await getDockerClient
	return await docker.info();
}

/**
 * The function `getDockerClient` initializes and returns a Docker client.
 * It fetches Docker host from settings if the client is not already initialized.
 */
export async function getDockerClient(): Promise<Docker> {
	// Changed: now async
	if (!dockerClient) {
		console.log('Docker client is null, attempting to initialize.');
		let hostToUse = dockerHost; // Start with current module-level host (default or last used)
		try {
			const currentSettings = await getSettings();
			if (currentSettings?.dockerHost) {
				hostToUse = currentSettings.dockerHost;
				console.log(`Fetched dockerHost from settings: "${hostToUse}"`);
			} else {
				console.log('No dockerHost found in settings, will use current module dockerHost or default.');
			}
		} catch (err) {
			console.error('Failed to get settings for Docker client initialization, using fallback:', err);
			// hostToUse remains as the current dockerHost or default
		}

		console.log(`Initializing Docker client with host: "${hostToUse}".`);
		const connectionOpts = createConnectionOptions(hostToUse);
		try {
			dockerClient = new Docker(connectionOpts);
			dockerHost = hostToUse; // Update module-level variable to the host actually used.
			console.log(`Docker client initialized successfully with host: ${dockerHost}`, connectionOpts);
		} catch (initError) {
			console.error(`Failed to initialize Docker client with host ${hostToUse}:`, initError);
			dockerClient = null; // Ensure client is null if initialization fails
			dockerHost = 'unix:///var/run/docker.sock'; // Reset to default on failure to avoid broken state
			throw initError; // Re-throw error so caller knows initialization failed
		}
	}
	if (!dockerClient) {
		console.error('PANIC: Docker client is still null after initialization attempt without throwing error.');
		throw new Error('Failed to obtain Docker client instance.');
	}
	return dockerClient;
}

/**
 * The function initializes a Docker connection based on the provided options.
 * This function is typically called by createConnectionOptions or directly if needed.
 * Note: This function directly mutates dockerClient and dockerHost module variables.
 */
export function initializeDocker(options: DockerConnectionOptions): Docker {
	const connectionOpts: Record<string, any> = {};

	if (options.socketPath) {
		connectionOpts.socketPath = options.socketPath;
		dockerHost = options.socketPath;
	} else if (options.host && options.port) {
		connectionOpts.host = options.host;
		connectionOpts.port = options.port;
		dockerHost = `${options.host}:${options.port}`;

		if (options.ca || options.cert || options.key) {
			connectionOpts.ca = options.ca;
			connectionOpts.cert = options.cert;
			connectionOpts.key = options.key;
		}
	}

	dockerClient = new Docker(connectionOpts);
	return dockerClient;
}

/**
 * The function `updateDockerConnection` establishes a connection to a Docker host based on the
 * provided host string. This forces a re-initialization of the client.
 */
export function updateDockerConnection(newHost: string): void {
	try {
		if (!newHost) {
			console.warn('No Docker host specified for updateDockerConnection, connection not established');
			return;
		}

		if (newHost === dockerHost && dockerClient !== null) {
			console.log(`Docker host for updateDockerConnection (${newHost}) is the same as current and client exists. No update forced.`);
			return;
		}

		console.log(`updateDockerConnection called. Forcing connection update to Docker at ${newHost}`);

		const connectionOpts = createConnectionOptions(newHost);
		dockerClient = new Docker(connectionOpts); // Create new client
		dockerHost = newHost; // Update module-level variable

		console.log('Docker connection explicitly updated with options:', connectionOpts);
	} catch (error) {
		console.error(`Error explicitly updating Docker connection to ${newHost}:`, error);
		dockerClient = null; // Ensure client is null if update fails
	}
}

/**
 * The function `testDockerConnection` checks if a connection to Docker can be established.
 */
export async function testDockerConnection(): Promise<boolean> {
	// Changed: now async
	try {
		const docker = await getDockerClient(); // Changed: await getDockerClient
		const info = await docker.info();
		return !!info;
	} catch (err) {
		console.error('Docker connection test failed:', err);
		return false;
	}
}

/**
 * The function `createConnectionOptions` parses a host string to create connection options for
 * different types of connections such as Unix socket, TCP, and HTTPS.
 * @param {string} host - The `createConnectionOptions` function takes a `host` parameter as input and
 * based on the format of the host, it constructs connection options for different types of connections
 * like Unix socket, TCP, or HTTPS.
 * @returns The `createConnectionOptions` function returns a record object containing connection
 * options based on the provided `host` parameter. The connection options include `socketPath`, `host`,
 * `port`, and `protocol` properties depending on the format of the `host` string.
 */
function createConnectionOptions(host: string): Record<string, any> {
	const connectionOpts: Record<string, any> = {};

	if (host.startsWith('unix://')) {
		connectionOpts.socketPath = host.replace('unix://', '');
	} else if (host.startsWith('tcp://')) {
		const url = new URL(host);
		connectionOpts.host = url.hostname;
		connectionOpts.port = Number.parseInt(url.port || '2375', 10);
	} else if (host.startsWith('https://')) {
		const url = new URL(host);
		connectionOpts.host = url.hostname;
		connectionOpts.port = Number.parseInt(url.port || '2376', 10);
		connectionOpts.protocol = 'https';
	} else {
		connectionOpts.socketPath = host;
	}

	return connectionOpts;
}

/* The statement `export default getDockerClient;` is exporting the `getDockerClient` function as the
default export of the module. */
export default getDockerClient;

/**
 * Perform any other necessary cleanup for this module if needed.
 */
export function cleanup() {
	console.log('core.ts cleanup called.');
}
