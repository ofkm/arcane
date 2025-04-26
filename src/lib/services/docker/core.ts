import Docker from 'dockerode';
import type { DockerConnectionOptions } from '$lib/types/docker';

let dockerClient: Docker | null = null;
export let dockerHost = 'unix:///var/run/docker.sock';

/**
 * The function `getDockerInfo` asynchronously retrieves information about the Docker environment using
 * a Docker client.
 * @returns The `getDockerInfo` function is returning information about the Docker engine, such as its
 * version, number of containers, images, and other relevant details.
 */
export async function getDockerInfo() {
	const docker = getDockerClient();
	return await docker.info();
}

/**
 * The function `getDockerClient` initializes and returns a Docker client based on the provided
 * `dockerHost` connection options.
 * @returns The function `getDockerClient()` returns the Docker client instance that is either newly
 * created or already existing based on the condition check for `dockerClient`.
 */
export function getDockerClient(): Docker {
	if (!dockerClient) {
		const connectionOpts = createConnectionOptions(dockerHost);

		dockerClient = new Docker(connectionOpts);
		console.log(`Initialized Docker client with host: ${dockerHost}`, connectionOpts);
	}
	return dockerClient;
}

/**
 * The function initializes a Docker connection based on the provided options, supporting different
 * connection types such as socket and TCP.
 * @param {DockerConnectionOptions} options - The `options` parameter in the `initializeDocker`
 * function is of type `DockerConnectionOptions`. This parameter is an object that can contain the
 * following properties:
 * @returns The function `initializeDocker` is returning an instance of the Docker client that is
 * initialized with the connection options provided in the `options` parameter.
 */
export function initializeDocker(options: DockerConnectionOptions): Docker {
	const connectionOpts: Record<string, any> = {};

	// Handle different connection types (socket, tcp, etc.)
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
 * provided host string.
 * @param {string} host - The `host` parameter in the `updateDockerConnection` function is a string
 * that represents the connection endpoint for Docker. It can be in one of the following formats:
 * @returns If the `host` parameter is empty or falsy, a warning message is logged and the function
 * returns early without establishing a new Docker connection.
 */
export function updateDockerConnection(host: string): void {
	try {
		// Only create a new connection if we have a valid host
		if (!host) {
			console.warn('No Docker host specified, connection not established');
			return;
		}

		console.log(`Connecting to Docker at ${host}`);
		const connectionOpts = createConnectionOptions(host);

		dockerClient = new Docker(connectionOpts);
		dockerHost = host;
		console.log('Docker connection updated with options:', connectionOpts);
	} catch (error) {
		console.error('Error connecting to Docker:', error);
	}
}

/**
 * The function `testDockerConnection` checks if a connection to Docker can be established and returns
 * a boolean indicating the success of the connection test.
 * @returns The `testDockerConnection` function returns a Promise that resolves to a boolean value. If
 * the Docker connection test is successful, it will return `true`. If the test fails, it will return
 * `false`.
 */
export async function testDockerConnection(): Promise<boolean> {
	try {
		const docker = getDockerClient();
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
default export of the module. This means that when another module imports from this module without
specifying a particular named export, it will receive the `getDockerClient` function as the default
export. */
export default getDockerClient;
