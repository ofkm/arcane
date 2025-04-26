import Docker from 'dockerode';
import type { VolumeCreateOptions } from 'dockerode';
import type { NetworkInspectInfo, NetworkCreateOptions } from 'dockerode';

let dockerClient: Docker | null = null;
let dockerHost: string = 'unix:///var/run/docker.sock'; 

// Define and export the type returned by listNetworks
export type ServiceNetwork = {
	id: string;
	name: string;
	driver: string;
	scope: string;
	subnet: string | null;
	gateway: string | null;
	created: string;
};

/**
 * Lists Docker networks.
 */
export async function listNetworks(): Promise<ServiceNetwork[]> {
	try {
		const docker = getDockerClient();
		const networks = await docker.listNetworks();
		return networks.map(
			(net): ServiceNetwork => ({
				id: net.Id,
				name: net.Name,
				driver: net.Driver,
				scope: net.Scope,
				subnet: net.IPAM?.Config?.[0]?.Subnet ?? null,
				gateway: net.IPAM?.Config?.[0]?.Gateway ?? null,
				created: net.Created
			})
		);
	} catch (error: any) {
		console.error('Docker Service: Error listing networks:', error);
		throw new Error(`Failed to list Docker networks using host "${dockerHost}".`);
	}
}

/**
 * Removes a Docker network.
 * @param networkId - The ID or name of the network to remove.
 */
export async function removeNetwork(networkId: string): Promise<void> {
	try {
		const DEFAULT_NETWORKS = new Set(['host', 'bridge', 'none', 'ingress']);
		if (DEFAULT_NETWORKS.has(networkId)) {
			throw new Error(`Network "${networkId}" is managed by Docker and cannot be removed.`);
		}
		const docker = getDockerClient();
		const network = docker.getNetwork(networkId);
		await network.remove();
		console.log(`Docker Service: Network "${networkId}" removed successfully.`);
	} catch (error: any) {
		console.error(`Docker Service: Error removing network "${networkId}":`, error);
		if (error.statusCode === 404) {
			throw new Error(`Network "${networkId}" not found.`);
		}
		if (error.statusCode === 409) {
			// 409 Conflict usually means it's in use or predefined
			throw new Error(`Network "${networkId}" cannot be removed (possibly in use or predefined).`);
		}
		throw new Error(`Failed to remove network "${networkId}" using host "${dockerHost}". ${error.message || error.reason || ''}`);
	}
}

/**
 * Creates a Docker network.
 * @param options - Options for creating the network (e.g., Name, Driver, Labels, CheckDuplicate, Internal, IPAM).
 */
export async function createNetwork(options: NetworkCreateOptions): Promise<NetworkInspectInfo> {
	try {
		const docker = getDockerClient();
		console.log(`Docker Service: Creating network "${options.Name}"...`, options);

		// Dockerode's createNetwork returns the Network object, we need to inspect it after creation
		const network = await docker.createNetwork(options);

		// Inspect the newly created network to get full details
		const inspectInfo = await network.inspect();

		console.log(`Docker Service: Network "${options.Name}" (ID: ${inspectInfo.Id}) created successfully.`);
		return inspectInfo; // Return the detailed inspect info
	} catch (error: any) {
		console.error(`Docker Service: Error creating network "${options.Name}":`, error);
		// Check for specific Docker errors
		if (error.statusCode === 409) {
			// Could be duplicate name if CheckDuplicate was true, or other conflicts
			throw new Error(`Network "${options.Name}" may already exist or conflict with an existing configuration.`);
		}
		throw new Error(`Failed to create network "${options.Name}" using host "${dockerHost}". ${error.message || error.reason || ''}`);
	}
}

// Define and export the type returned by listVolumes
export type ServiceVolume = {
	name: string;
	driver: string;
	scope: string;
	mountpoint: string;
	labels: { [label: string]: string } | null;
};

/**
 * Lists Docker volumes.
 */
export async function listVolumes(): Promise<ServiceVolume[]> {
	try {
		const docker = getDockerClient();
		const volumeResponse = await docker.listVolumes();
		const volumes = volumeResponse.Volumes || [];

		return volumes.map(
			(vol): ServiceVolume => ({
				name: vol.Name,
				driver: vol.Driver,
				scope: vol.Scope,
				mountpoint: vol.Mountpoint,
				labels: vol.Labels
			})
		);
	} catch (error: any) {
		console.error('Docker Service: Error listing volumes:', error);
		throw new Error(`Failed to list Docker volumes using host "${dockerHost}".`);
	}
}

/**
 * Check if a volume is in use by any container
 * @param volumeName The name of the volume to check
 * @returns Boolean indicating if the volume is in use
 */
export async function isVolumeInUse(volumeName: string): Promise<boolean> {
	try {
		const docker = getDockerClient();
		const containers = await docker.listContainers({ all: true });

		// Inspect each container to check its mounts
		for (const containerInfo of containers) {
			const container = docker.getContainer(containerInfo.Id);
			const details = await container.inspect();

			// Check if any mount points to our volume
			const volumeMounts = details.Mounts.filter((mount) => mount.Type === 'volume' && mount.Name === volumeName);

			if (volumeMounts.length > 0) {
				return true;
			}
		}

		return false;
	} catch (error) {
		console.error(`Error checking if volume ${volumeName} is in use:`, error);
		// Default to assuming it's in use for safety
		return true;
	}
}

/**
 * Creates a Docker volume.
 * @param options - Options for creating the volume (e.g., Name, Driver, Labels).
 */
export async function createVolume(options: VolumeCreateOptions): Promise<any> {
	try {
		const docker = getDockerClient();
		// createVolume returns the volume data directly - no need to inspect
		const volume = await docker.createVolume(options);

		console.log(`Docker Service: Volume "${options.Name}" created successfully.`);

		// Return the creation response which contains basic info
		return {
			Name: volume.Name,
			Driver: volume.Driver,
			Mountpoint: volume.Mountpoint,
			Labels: volume.Labels || {},
			Scope: volume.Scope || 'local',
			CreatedAt: new Date().toISOString() // Since inspect would give us this
		};
	} catch (error: any) {
		console.error(`Docker Service: Error creating volume "${options.Name}":`, error);
		// Check for specific Docker errors, like volume already exists (often 409)
		if (error.statusCode === 409) {
			throw new Error(`Volume "${options.Name}" already exists.`);
		}
		throw new Error(
			`Failed to create volume "${options.Name}" using host "${dockerHost}". ${
				error.message || error.reason || '' // Include reason if available
			}`
		);
	}
}

/**
 * Removes a Docker volume.
 * @param name - The name of the volume to remove.
 * @param force - Whether to force removal if the volume is in use.
 */
export async function removeVolume(name: string, force: boolean = false): Promise<void> {
	try {
		const docker = getDockerClient();
		const volume = docker.getVolume(name);
		await volume.remove({ force });
		console.log(`Docker Service: Volume "${name}" removed successfully.`);
	} catch (error: any) {
		console.error(`Docker Service: Error removing volume "${name}":`, error);
		if (error.statusCode === 409) {
			throw new Error(`Volume "${name}" is in use by a container. Use force option to remove.`);
		}
		throw new Error(`Failed to remove volume "${name}" using host "${dockerHost}". ${error.message || error.reason || ''}`);
	}
}

/**
 * Pulls a Docker image from a registry.
 * @param imageRef - The image reference to pull (e.g., 'nginx:latest')
 * @param platform - Optional platform specification (e.g., 'linux/amd64')
 */
export async function pullImage(imageRef: string, platform?: string): Promise<void> {
	try {
		const docker = getDockerClient();

		const pullOptions: any = {};
		if (platform) {
			pullOptions.platform = platform;
		}

		console.log(`Docker Service: Pulling image "${imageRef}"...`);

		// Pull the image - this returns a stream
		const stream = await docker.pull(imageRef, pullOptions);

		// Wait for the pull to complete by consuming the stream
		await new Promise((resolve, reject) => {
			docker.modem.followProgress(stream, (err: any, output: any) => {
				if (err) {
					reject(err);
				} else {
					resolve(output);
				}
			});
		});

		console.log(`Docker Service: Image "${imageRef}" pulled successfully.`);
	} catch (error: any) {
		console.error(`Docker Service: Error pulling image "${imageRef}":`, error);

		// Handle specific error cases
		if (error.statusCode === 404) {
			throw new Error(`Image "${imageRef}" not found in registry.`);
		}

		throw new Error(`Failed to pull image "${imageRef}". ${error.message || error.reason || ''}`);
	}
}

export default getDockerClient;
