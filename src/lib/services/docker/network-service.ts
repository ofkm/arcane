import { getDockerClient, dockerHost } from '$lib/services/docker/core';
import type { ServiceNetwork } from '$lib/types/docker/network.type';
import type { NetworkInspectInfo, NetworkCreateOptions } from 'dockerode';

/* The line `const DEFAULT_NETWORK_NAMES = new Set(['host', 'bridge', 'none', 'ingress']);` is creating
a Set named `DEFAULT_NETWORK_NAMES` that contains the default network names managed by Docker. These
default network names are 'host', 'bridge', 'none', and 'ingress'. The purpose of this set is to
provide a quick and efficient way to check if a given network name is one of the default networks
when needed in the code. */
export const DEFAULT_NETWORK_NAMES = new Set(['host', 'bridge', 'none', 'ingress']);

/**
 * This TypeScript function asynchronously lists Docker networks and maps the network properties to a
 * custom ServiceNetwork type.
 * @returns The `listNetworks` function returns a Promise that resolves to an array of `ServiceNetwork`
 * objects. Each `ServiceNetwork` object contains properties such as `id`, `name`, `driver`, `scope`,
 * `subnet`, `gateway`, and `created`, which are extracted from the networks obtained from the Docker
 * client.
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
				created: net.Created ?? ''
			})
		);
	} catch (error: any) {
		console.error('Docker Service: Error listing networks:', error);
		throw new Error(`Failed to list Docker networks using host "${dockerHost}".`);
	}
}

/**
 * The function `removeNetwork` removes a Docker network, handling default networks and error cases.
 * @param {string} networkId - The `networkId` parameter in the `removeNetwork` function is a string
 * that represents the ID of the Docker network that you want to remove. This function checks if the
 * specified network is one of the default networks managed by Docker (`host`, `bridge`, `none`,
 * `ingress`). If
 */
export async function removeNetwork(networkId: string): Promise<void> {
	try {
		if (DEFAULT_NETWORK_NAMES.has(networkId)) {
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
 * The function `createNetwork` in TypeScript creates a Docker network with the specified options and
 * returns detailed inspection information.
 * @param {NetworkCreateOptions} options - The `options` parameter in the `createNetwork` function is
 * of type `NetworkCreateOptions`. This object likely contains the configuration details for creating a
 * network in Docker. The specific properties and structure of the `NetworkCreateOptions` type would be
 * defined elsewhere in your codebase.
 * @returns The function `createNetwork` is returning a Promise that resolves to a `NetworkInspectInfo`
 * object, which contains detailed information about the network that was created.
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
