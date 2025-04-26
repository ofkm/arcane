import { getDockerClient, dockerHost } from './core';
import type { ServiceImage } from '$lib/types/docker/image.type';
import type Docker from 'dockerode';

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
 * with two possible values: `'all'` or `'dangling'`. The default value is `'all'`, meaning that if
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
 * optional platform.
 * @param {string} imageRef - The `imageRef` parameter in the `pullImage` function is a string that
 * represents the reference to the Docker image that you want to pull. It typically includes the image
 * name and tag, such as `nginx:latest` or `myapp:v1.0`.
 * @param {string} [platform] - The `platform` parameter in the `pullImage` function is an optional
 * parameter that specifies the platform for which the image should be pulled. This parameter allows
 * you to specify the architecture, operating system, and variant of the platform for which the image
 * is intended. If provided, the Docker client will attempt
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

		const pullTimeout = 10 * 60 * 1000; // 10 min

		// Wait for the pull to complete by consuming the stream with 10 minute timeout
		const result = await Promise.race([new Promise((resolve, reject) => docker.modem.followProgress(stream, (err, out) => (err ? reject(err) : resolve(out)))), new Promise((_, reject) => setTimeout(() => reject(new Error(`Pull timed-out after ${pullTimeout} ms`)), pullTimeout))]);

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
