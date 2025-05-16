import { getDockerClient, dockerHost } from '$lib/services/docker/core';
import type { NetworkInspectInfo, NetworkCreateOptions } from 'dockerode'; // Added NetworkInfo
import { NotFoundError, ConflictError, DockerApiError } from '$lib/types/errors'; // #file:/Users/kylemendell/dev/ofkm/arcane/src/lib/types/errors.ts
import { DEFAULT_NETWORK_NAMES } from '$lib/constants';

/**
 * This TypeScript function asynchronously lists Docker networks.
 * @returns The `listNetworks` function returns a Promise that resolves to an array of `NetworkInspectInfo`
 * objects, representing the summary information for each network.
 */
export async function listNetworks(): Promise<NetworkInspectInfo[]> {
	// Changed return type
	try {
		const docker = await getDockerClient();
		const networks = await docker.listNetworks();
		// docker.listNetworks() directly returns an array of objects conforming to NetworkInspectInfo[]
		return networks; // Return Dockerode's NetworkInspectInfo[] directly
	} catch (error: unknown) {
		console.error('Docker Service: Error listing networks:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to list Docker networks using host "${dockerHost}". ${errorMessage}`);
	}
}

/**
 * Retrieves detailed information about a specific Docker network by its ID.
 * @param {string} networkId - The ID or name of the network to inspect.
 * @returns {Promise<NetworkInspectInfo>} A promise that resolves with the detailed network information.
 * @throws {NotFoundError} If the network with the specified ID does not exist.
 * @throws {DockerApiError} For other errors during the Docker API interaction.
 */
export async function getNetwork(networkId: string): Promise<NetworkInspectInfo> {
	try {
		const docker = await getDockerClient();
		const network = docker.getNetwork(networkId);
		const inspectInfo = await network.inspect();
		console.log(`Docker Service: Inspected network "${networkId}" successfully.`);
		return inspectInfo;
	} catch (error: unknown) {
		console.error(`Docker Service: Error inspecting network "${networkId}":`, error);
		const err = error as { statusCode?: number; message?: string; reason?: string };
		if (err.statusCode === 404) {
			throw new NotFoundError(`Network "${networkId}" not found.`);
		}
		// Docker might return 500 for built-in networks if trying to inspect by name sometimes
		if (err.statusCode === 500 && (networkId === 'bridge' || networkId === 'host' || networkId === 'none')) {
			throw new NotFoundError(`Cannot inspect built-in network "${networkId}" by name, use ID if available.`);
		}
		throw new DockerApiError(`Failed to inspect network "${networkId}": ${err.message || err.reason || 'Unknown Docker error'}`, err.statusCode);
	}
}

/**
 * The function `removeNetwork` removes a Docker network, handling default networks and error cases.
 * @param {string} networkId - The `networkId` parameter in the `removeNetwork` function is a string
 * that represents the ID of the Docker network that you want to remove. This function checks if the
 * specified network is one of the default networks managed by Docker (`host`, `bridge`, `none`,
 * `ingress`). If
 * @throws {NotFoundError} If the network does not exist.
 * @throws {ConflictError} If the network is in use (e.g., by containers).
 * @throws {DockerApiError} For other Docker API errors.
 */
export async function removeNetwork(networkId: string): Promise<void> {
	try {
		if (DEFAULT_NETWORK_NAMES.has(networkId)) {
			throw new ConflictError(`Network "${networkId}" is managed by Docker and cannot be removed.`);
		}
		const docker = await getDockerClient();
		const network = docker.getNetwork(networkId);
		await network.remove();
		console.log(`Docker Service: Network "${networkId}" removed successfully.`);
	} catch (error: unknown) {
		console.error(`Docker Service: Error removing network "${networkId}":`, error);
		const err = error as { statusCode?: number; message?: string; reason?: string };
		if (err.statusCode === 404) {
			throw new NotFoundError(`Network "${networkId}" not found.`);
		}
		if (err.statusCode === 409 || (err.reason && err.reason.includes('active endpoints'))) {
			// 409 or specific reason indicates it's likely in use
			throw new ConflictError(`Network "${networkId}" has active endpoints (containers connected). Disconnect containers before removal.`);
		}
		// Handle removal of predefined networks (usually forbidden)
		if (err.statusCode === 403 || (err.reason && err.reason.includes('predefined network'))) {
			throw new ConflictError(`Cannot remove predefined network "${networkId}".`);
		}
		throw new DockerApiError(`Failed to remove network "${networkId}": ${err.message || err.reason || 'Unknown Docker error'}`, err.statusCode);
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
		const docker = await getDockerClient();
		console.log(`Docker Service: Creating network "${options.Name}"...`, options);

		// Dockerode's createNetwork returns the Network object, we need to inspect it after creation
		const network = await docker.createNetwork(options);

		// Inspect the newly created network to get full details
		const inspectInfo = await network.inspect();

		console.log(`Docker Service: Network "${options.Name}" (ID: ${inspectInfo.Id}) created successfully.`);
		return inspectInfo; // Return the detailed inspect info
	} catch (error: unknown) {
		console.error(`Docker Service: Error creating network "${options.Name}":`, error);
		const err = error as { statusCode?: number; message?: string; reason?: string };
		if (err.statusCode === 409) {
			// Could be duplicate name if CheckDuplicate was true, or other conflicts
			throw new ConflictError(`Network "${options.Name}" may already exist or conflict with an existing configuration.`);
		}
		const errorMessage = err.message || err.reason || 'Unknown error during network creation.';
		throw new DockerApiError(`Failed to create network "${options.Name}" using host "${dockerHost}". ${errorMessage}`, err.statusCode);
	}
}
