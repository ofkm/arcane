import Docker from 'dockerode';
import type { DockerConnectionOptions } from '$lib/types/docker';
import { getSettings } from '$lib/services/settings-service';

let dockerClient: Docker | null = null;
export let dockerHost = 'unix:///var/run/docker.sock';

export async function getDockerInfo() {
	const docker = await getDockerClient();
	return await docker.info();
}

export async function getDockerClient(): Promise<Docker> {
	if (!dockerClient) {
		console.log('Docker client is null, attempting to initialize.');
		let hostToUse = dockerHost;
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
		}

		console.log(`Initializing Docker client with host: "${hostToUse}".`);
		const connectionOpts = createConnectionOptions(hostToUse);
		try {
			dockerClient = new Docker(connectionOpts);
			dockerHost = hostToUse;
			console.log(`Docker client initialized successfully with host: ${dockerHost}`, connectionOpts);
		} catch (initError) {
			console.error(`Failed to initialize Docker client with host ${hostToUse}:`, initError);
			dockerClient = null;
			dockerHost = 'unix:///var/run/docker.sock';
			throw initError;
		}
	}
	if (!dockerClient) {
		console.error('PANIC: Docker client is still null after initialization attempt without throwing error.');
		throw new Error('Failed to obtain Docker client instance.');
	}
	return dockerClient;
}

export function initializeDocker(options: DockerConnectionOptions): Docker {
	const connectionOpts: Record<string, unknown> = {};

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
		dockerClient = new Docker(connectionOpts);
		dockerHost = newHost;

		console.log('Docker connection explicitly updated with options:', connectionOpts);
	} catch (error) {
		console.error(`Error explicitly updating Docker connection to ${newHost}:`, error);
		dockerClient = null;
	}
}

export async function testDockerConnection(): Promise<boolean> {
	try {
		const docker = await getDockerClient();
		const info = await docker.info();
		return !!info;
	} catch (err) {
		console.error('Docker connection test failed:', err);
		return false;
	}
}

function createConnectionOptions(host: string): Record<string, unknown> {
	const connectionOpts: Record<string, unknown> = {};

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

export default getDockerClient;

export function cleanup() {
	console.log('core.ts cleanup called.');
}
