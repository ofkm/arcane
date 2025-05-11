import { getDockerClient, dockerHost } from './core';
import type { ServiceImage } from '$lib/types/docker/image.type';
import type Docker from 'dockerode';
// Import custom errors
import { NotFoundError, ConflictError, DockerApiError } from '$lib/types/errors';

/**
 * The function `listImages` retrieves a list of Docker images and parses their information into a
 * structured format.
 * @returns The `listImages` function returns an array of `ServiceImage` objects. Each `ServiceImage`
 * object contains properties such as `id`, `repoTags`, `repoDigests`, `created`, `size`,
 * `virtualSize`, `labels`, `repo`, and `tag`. These properties are extracted from the images obtained
 * from the Docker client and processed using the `parseRepoTag` function
 */
export async function listImages(): Promise<ServiceImage[]> {
	try {
		const docker = getDockerClient();
		const images = await docker.listImages({ all: false });

		const parseRepoTag = (tag: string | undefined): { repo: string; tag: string } => {
			if (!tag || tag === '<none>:<none>') {
				return { repo: '<none>', tag: '<none>' };
			}
			const withoutDigest = tag.split('@')[0];
			const lastSlash = withoutDigest.lastIndexOf('/');
			const lastColon = withoutDigest.lastIndexOf(':');
			if (lastColon === -1 || lastColon < lastSlash) {
				return { repo: withoutDigest, tag: 'latest' };
			}
			return {
				repo: withoutDigest.substring(0, lastColon),
				tag: withoutDigest.substring(lastColon + 1)
			};
		};

		return images.map((img): ServiceImage => {
			const { repo, tag } = parseRepoTag(img.RepoTags?.[0]);
			return {
				id: img.Id,
				repoTags: img.RepoTags,
				repoDigests: img.RepoDigests,
				created: img.Created,
				size: img.Size,
				virtualSize: img.VirtualSize,
				labels: img.Labels,
				repo: repo,
				tag: tag
			};
		});
	} catch (error: any) {
		console.error('Docker Service: Error listing images:', error);
		throw new Error(`Failed to list Docker images using host "${dockerHost}".`);
	}
}

/**
 * Retrieves detailed information about a specific Docker image by its ID.
 * @param {string} imageId - The ID or name of the image to inspect.
 * @returns {Promise<Docker.ImageInspectInfo>} A promise that resolves with the detailed image information.
 * @throws {NotFoundError} If the image with the specified ID does not exist.
 * @throws {DockerApiError} For other errors during the Docker API interaction.
 */
export async function getImage(imageId: string): Promise<Docker.ImageInspectInfo> {
	try {
		const docker = getDockerClient();
		const image = docker.getImage(imageId);
		const inspectInfo = await image.inspect();
		console.log(`Docker Service: Inspected image "${imageId}" successfully.`);
		return inspectInfo;
	} catch (error: any) {
		console.error(`Docker Service: Error inspecting image "${imageId}":`, error);
		if (error.statusCode === 404) {
			throw new NotFoundError(`Image "${imageId}" not found.`);
		}
		throw new DockerApiError(`Failed to inspect image "${imageId}": ${error.message || 'Unknown Docker error'}`, error.statusCode);
	}
}

/**
 * This TypeScript function removes a Docker image by its ID, with an option to force removal if the
 * image is in use.
 * @param {string} imageId - The `imageId` parameter is a string that represents the unique identifier
 * of the Docker image that you want to remove.
 * @param {boolean} [force=false] - The `force` parameter in the `removeImage` function is a boolean
 * parameter that determines whether to forcefully remove the image even if it is being used by a
 * container. If `force` is set to `true`, the image will be removed regardless of whether it is in use
 * by a container.
 */
export async function removeImage(imageId: string, force: boolean = false): Promise<void> {
	try {
		const docker = getDockerClient();
		const image = docker.getImage(imageId);
		await image.remove({ force });
		console.log(`Docker Service: Image "${imageId}" removed successfully.`);
	} catch (error: any) {
		console.error(`Docker Service: Error removing image "${imageId}":`, error);
		if (error.statusCode === 409) {
			throw new Error(`Image "${imageId}" is being used by a container. Use force option to remove.`);
		}
		throw new Error(`Failed to remove image "${imageId}" using host "${dockerHost}". ${error.message || error.reason || ''}`);
	}
}

/**
 * The function `isImageInUse` checks if a Docker image is being used by any containers.
 * @param {string} imageId - The `imageId` parameter in the `isImageInUse` function is a string that
 * represents the ID of the image that you want to check if it is being used by any Docker containers.
 * @returns The function `isImageInUse` returns a Promise that resolves to a boolean value indicating
 * whether the image with the provided `imageId` is in use by any Docker containers. If an error occurs
 * during the process of checking for container usage, the function will log the error and default to
 * assuming that the image is in use for safety reasons.
 */
export async function isImageInUse(imageId: string): Promise<boolean> {
	try {
		const docker = getDockerClient();
		const containers = await docker.listContainers({ all: true });

		// Look for containers using this image
		return containers.some((container) => container.ImageID === imageId || container.Image === imageId);
	} catch (error) {
		console.error(`Error checking if image ${imageId} is in use:`, error);
		// Default to assuming it's in use for safety
		return true;
	}
}

/**
 * The function `pruneImages` in TypeScript prunes Docker images based on the specified mode ('all' or
 * 'dangling') and returns information about the deleted images and space reclaimed.
 * @param {'all' | 'dangling'} [mode=all] - The `mode` parameter in the `pruneImages` function is used
 * to specify whether to prune all unused images or only dangling images. It is a string literal type
 * with two possible values: `'all'` or `'dangling'`. The default value is `'all'`.
 * @returns The `pruneImages` function returns a Promise that resolves to an object with the following
 * properties:
 */
export async function pruneImages(mode: 'all' | 'dangling' = 'all'): Promise<{
	ImagesDeleted: Docker.ImageRemoveInfo[] | null;
	SpaceReclaimed: number;
}> {
	try {
		const docker = getDockerClient();
		const filterValue = mode === 'all' ? 'false' : 'true';
		const logMessage = mode === 'all' ? 'Pruning all unused images (docker image prune -a)...' : 'Pruning dangling images (docker image prune)...';

		console.log(`Docker Service: ${logMessage}`);

		const pruneOptions = {
			filters: { dangling: [filterValue] }
		};

		const result = await docker.pruneImages(pruneOptions); // Use the options object

		console.log(`Docker Service: Image prune complete. Space reclaimed: ${result.SpaceReclaimed}`);
		return result;
	} catch (error: any) {
		console.error('Docker Service: Error pruning images:', error);
		throw new Error(`Failed to prune images using host "${dockerHost}". ${error.message || error.reason || ''}`);
	}
}

/**
 * The function `pullImage` asynchronously pulls a Docker image using a specified image reference and
 * platform.
 * @param {string} imageRef - The `imageRef` parameter in the `pullImage` function is a string that
 * represents the reference to a Docker image. This typically includes the repository name and optionally
 * a tag or digest.
 * @param {string} [platform] - The `platform` parameter in the `pullImage` function is an optional
 * parameter that specifies the platform for which the Docker image should be pulled.
 * @param {object} [authConfig] - Optional authentication configuration for private registries
 */
export async function pullImage(imageRef: string, platform?: string, authConfig?: any): Promise<void> {
	const docker = getDockerClient();
	const pullOptions: any = {};

	if (platform) {
		pullOptions.platform = platform;
	}

	if (authConfig && Object.keys(authConfig).length > 0) {
		pullOptions.authconfig = authConfig;
	}

	await docker.pull(imageRef, pullOptions);
}
