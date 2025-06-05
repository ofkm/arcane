import { getDockerClient, dockerHost } from './core';
import type { ServiceImage } from '$lib/types/docker/image.type';
import type Docker from 'dockerode';
import { NotFoundError, DockerApiError, RegistryRateLimitError, PublicRegistryError, PrivateRegistryError } from '$lib/types/errors.type';
import { parseImageNameForRegistry, areRegistriesEquivalent } from '$lib/utils/registry.utils';
import { getSettings } from '$lib/services/settings-service';
import { tryCatch } from '$lib/utils/try-catch';
import { imageMaturityDb } from '../database/image-maturity-db-service';

let maturityPollingInterval: NodeJS.Timeout | null = null;

/**
 * Starts the maturity polling scheduler based on user settings
 */
export async function initMaturityPollingScheduler(): Promise<void> {
	const settings = await getSettings();

	// Clear any existing timer
	if (maturityPollingInterval) {
		clearInterval(maturityPollingInterval);
		maturityPollingInterval = null;
	}

	// If polling is disabled, do nothing
	if (!settings.pollingEnabled) {
		console.log('Image maturity polling is disabled in settings');
		return;
	}

	// Use the configured polling interval (default to 10 minutes if not set)
	const intervalMinutes = settings.pollingInterval || 10;
	const intervalMs = intervalMinutes * 60 * 1000;

	console.log(`Starting image maturity polling with interval of ${intervalMinutes} minutes`);

	// Schedule regular checks
	maturityPollingInterval = setInterval(runMaturityChecks, intervalMs);

	// Run initial check
	runMaturityChecks();
}

/**
 * Stops the maturity polling scheduler
 */
export async function stopMaturityPollingScheduler(): Promise<void> {
	if (maturityPollingInterval) {
		clearInterval(maturityPollingInterval);
		maturityPollingInterval = null;
		console.log('Image maturity polling scheduler stopped');
	}
}

/**
 * Run maturity checks for all images - DATABASE VERSION
 */
async function runMaturityChecks(): Promise<void> {
	console.log('Running scheduled image maturity checks...');

	const imagesResult = await tryCatch(listImages());
	if (imagesResult.error) {
		console.error('Error during scheduled maturity check:', imagesResult.error);
		return;
	}

	const images = imagesResult.data;
	const validImages = images.filter((image) => image.repo !== '<none>' && image.tag !== '<none>');

	console.log(`Found ${validImages.length} valid images to check maturity for`);

	if (validImages.length === 0) {
		console.log('No valid images found for maturity checking');
		return;
	}

	// Clean up orphaned records first
	const existingImageIds = validImages.map((img) => img.Id);
	const cleanedUp = await imageMaturityDb.cleanupOrphanedRecords(existingImageIds);
	if (cleanedUp > 0) {
		console.log(`Cleaned up ${cleanedUp} orphaned maturity records`);
	}

	// Get images that need checking (haven't been checked recently)
	const settings = await getSettings();
	const checkIntervalMinutes = settings.pollingInterval || 120; // Default 2 hours

	const imagesToCheck = await imageMaturityDb.getImagesNeedingCheck(checkIntervalMinutes, 50);
	const imageIdsNeedingCheck = new Set(imagesToCheck.map((record) => record.id));

	// Add any images not in database yet
	for (const image of validImages) {
		const existing = await imageMaturityDb.getImageMaturity(image.Id);
		if (!existing) {
			imageIdsNeedingCheck.add(image.Id);
		}
	}

	const imagesToProcess = validImages.filter((img) => imageIdsNeedingCheck.has(img.Id));

	console.log(`${imagesToProcess.length} images need fresh maturity checks`);

	if (imagesToProcess.length === 0) {
		console.log('All images have recent maturity data');
		return;
	}

	// Process images in batches
	const batchSize = 10;
	let checkedCount = 0;
	let updatesFound = 0;
	const updates: Array<{
		imageId: string;
		repository: string;
		tag: string;
		maturity: import('$lib/types/docker/image.type').ImageMaturity;
		metadata: any;
	}> = [];

	for (let i = 0; i < imagesToProcess.length; i += batchSize) {
		const batch = imagesToProcess.slice(i, i + batchSize);
		console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(imagesToProcess.length / batchSize)}: ${batch.length} images`);

		for (const image of batch) {
			const startTime = Date.now();
			const maturityResult = await tryCatch(checkImageMaturityInternal(image.Id));
			const responseTime = Date.now() - startTime;

			if (!maturityResult.error && maturityResult.data) {
				updates.push({
					imageId: image.Id,
					repository: image.repo,
					tag: image.tag,
					maturity: maturityResult.data,
					metadata: {
						registryDomain: parseImageNameForRegistry(image.repo).registry,
						responseTimeMs: responseTime
					}
				});
				checkedCount++;

				if (maturityResult.data.updatesAvailable) {
					updatesFound++;
				}
			} else {
				// Store error information
				updates.push({
					imageId: image.Id,
					repository: image.repo,
					tag: image.tag,
					maturity: {
						version: image.tag,
						date: 'Unknown date',
						status: 'Unknown',
						updatesAvailable: false
					},
					metadata: {
						registryDomain: parseImageNameForRegistry(image.repo).registry,
						responseTimeMs: responseTime,
						error: maturityResult.error?.message || 'Unknown error'
					}
				});
				checkedCount++;
			}

			// Small delay between checks
			await new Promise((resolve) => setTimeout(resolve, 200));
		}

		// Batch update database after each batch
		if (updates.length > 0) {
			await imageMaturityDb.setImageMaturityBatch(updates);
			updates.length = 0; // Clear the array
		}

		// Larger delay between batches
		if (i + batchSize < imagesToProcess.length) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	console.log(`Maturity check completed: Checked ${checkedCount} images, found ${updatesFound} with updates`);

	// Get and log statistics
	const stats = await imageMaturityDb.getMaturityStats();
	console.log(`Maturity stats: ${stats.total} total, ${stats.withUpdates} with updates, ${stats.recentlyChecked} recently checked`);

	// Emit an event that the UI can listen to for updates
	if (typeof window !== 'undefined') {
		window.dispatchEvent(
			new CustomEvent('maturity-check-complete', {
				detail: {
					checkedCount,
					updatesFound,
					stats
				}
			})
		);
	}
}

/**
 * The function `listImages` retrieves a list of Docker images and parses their information into a
 * structured format.
 * @returns The `listImages` function returns an array of `ServiceImage` objects. Each `ServiceImage`
 * object contains properties such as `id`, `repoTags`, `repoDigests`, `created`, `size`,
 * `virtualSize`, `labels`, `repo`, and `tag`. These properties are extracted from the images obtained
 * from the Docker client and processed using the `parseRepoTag` function
 */
export async function listImages(): Promise<ServiceImage[]> {
	const dockerClientResult = await tryCatch(getDockerClient());
	if (dockerClientResult.error) {
		throw new DockerApiError(`Failed to get Docker client: ${dockerClientResult.error.message}`, 500);
	}
	const docker = dockerClientResult.data;

	const imagesResult = await tryCatch(docker.listImages({ all: false }));
	if (imagesResult.error) {
		throw new DockerApiError(`Failed to list Docker images: ${(imagesResult.error as Error).message}`, 500);
	}

	const dockerImages: Docker.ImageInfo[] = imagesResult.data || [];

	const parseRepoTag = (tagString: string | undefined): { repo: string; tag: string } => {
		if (!tagString || tagString === '<none>:<none>') {
			return { repo: '<none>', tag: '<none>' };
		}
		const withoutDigest = tagString.split('@')[0]; // Remove digest if present
		const lastColon = withoutDigest.lastIndexOf(':');
		const lastSlash = withoutDigest.lastIndexOf('/'); // To handle scoped repos like gcr.io/project/image:tag

		// If no colon, or colon is part of a port in the repo name (e.g. localhost:5000/myimage)
		// or if colon is part of a scoped repo name before the final tag.
		if (lastColon === -1 || (lastSlash !== -1 && lastColon < lastSlash)) {
			return { repo: withoutDigest, tag: 'latest' }; // Default to 'latest' if no tag specified
		}
		return {
			repo: withoutDigest.substring(0, lastColon),
			tag: withoutDigest.substring(lastColon + 1)
		};
	};

	return dockerImages.map((img: Docker.ImageInfo): ServiceImage => {
		// RepoTags can be null or an empty array for untagged images
		const { repo, tag } = parseRepoTag(img.RepoTags?.[0]); // Use optional chaining and take the first tag

		return {
			...img, // Spread all properties from Docker.ImageInfo (e.g., Id, Created, Size, Labels)
			repo: repo,
			tag: tag
		};
	});
}

/**
 * Retrieves detailed information about a specific Docker image by its ID.
 * @param {string} imageId - The ID or name of the image to inspect.
 * @returns {Promise<Docker.ImageInspectInfo>} A promise that resolves with the detailed image information.
 * @throws {NotFoundError} If the image with the specified ID does not exist.
 * @throws {DockerApiError} For other errors during the Docker API interaction.
 */
export async function getImage(imageId: string): Promise<Docker.ImageInspectInfo> {
	const dockerResult = await tryCatch(getDockerClient());
	if (dockerResult.error) {
		throw new DockerApiError(`Failed to get Docker client: ${dockerResult.error.message}`, 500);
	}

	const docker = dockerResult.data;
	const image = docker.getImage(imageId); // imageId can be name:tag or ID

	const inspectResult = await tryCatch(image.inspect());
	if (inspectResult.error) {
		const error = inspectResult.error as { statusCode?: number; json?: { message?: string }; message?: string }; // Dockerode errors often have a json.message
		if (error.statusCode === 404) {
			throw new NotFoundError(`Image "${imageId}" not found.`);
		}
		const errorMessage = error.json?.message || error.message || 'Unknown Docker error';
		throw new DockerApiError(`Failed to inspect image "${imageId}": ${errorMessage}`, error.statusCode ?? 500);
	}

	return inspectResult.data; // This is Docker.ImageInspectInfo
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
		const docker = await getDockerClient();
		const image = docker.getImage(imageId);
		await image.remove({ force });
	} catch (error: unknown) {
		if ((error as { statusCode?: number }).statusCode === 409) {
			throw new Error(`Image "${imageId}" is being used by a container. Use force option to remove.`);
		}
		throw new Error(`Failed to remove image "${imageId}" using host "${dockerHost}". ${(error as { message?: string; reason?: string }).message || (error as { reason?: string }).reason || ''}`);
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
		const docker = await getDockerClient();
		const containers = await docker.listContainers({ all: true });

		// Look for containers using this image
		return containers.some((container) => container.ImageID === imageId || container.Image === imageId);
	} catch (error) {
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
		const docker = await getDockerClient();
		const filterValue = mode === 'all' ? 'false' : 'true';

		const pruneOptions = {
			filters: { dangling: [filterValue] }
		};

		const result = await docker.pruneImages(pruneOptions); // Use the options object
		return result;
	} catch (error: unknown) {
		throw new Error(`Failed to prune images using host "${dockerHost}". ${(error as { message?: string; reason?: string }).message || (error as { reason?: string }).reason || ''}`);
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
export async function pullImage(imageRef: string, platform?: string, authConfig?: Record<string, unknown>): Promise<void> {
	const docker = await getDockerClient();
	const pullOptions: Record<string, unknown> = {};

	if (platform) {
		pullOptions.platform = platform;
	}

	if (authConfig && Object.keys(authConfig).length > 0) {
		pullOptions.authconfig = authConfig;
	}

	await docker.pull(imageRef, pullOptions);
}

/**
 * Checks if a newer version of an image is available in the registry
 * and returns maturity information. Now uses database storage.
 */
export async function checkImageMaturity(imageId: string): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	// Check database first
	const record = await imageMaturityDb.getImageMaturity(imageId);

	// If we have recent data (within last 2 hours), return it
	if (record) {
		const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
		if (record.lastChecked > twoHoursAgo) {
			return imageMaturityDb.recordToImageMaturity(record);
		}
	}

	// Otherwise, perform fresh check
	const imageDetails = await getImage(imageId);
	if (!imageDetails || !imageDetails.RepoTags?.[0]) {
		return undefined;
	}

	const repoTag = imageDetails.RepoTags[0];
	const lastColon = repoTag.lastIndexOf(':');
	if (lastColon === -1) return undefined;

	const repository = repoTag.substring(0, lastColon);
	const tag = repoTag.substring(lastColon + 1);

	const startTime = Date.now();
	const maturity = await checkImageMaturityInternal(imageId);
	const responseTime = Date.now() - startTime;

	if (maturity) {
		// Store in database
		await imageMaturityDb.setImageMaturity(imageId, repository, tag, maturity, {
			registryDomain: parseImageNameForRegistry(repository).registry,
			responseTimeMs: responseTime
		});
	}

	return maturity;
}

/**
 * Batch check multiple images for maturity - DATABASE VERSION
 */
export async function checkImageMaturityBatch(imageIds: string[]): Promise<Map<string, import('$lib/types/docker/image.type').ImageMaturity | undefined>> {
	const results = new Map<string, import('$lib/types/docker/image.type').ImageMaturity | undefined>();

	// Get existing records from database
	const records = await imageMaturityDb.getImageMaturityBatch(imageIds);
	const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

	const imageIdsNeedingCheck: string[] = [];

	// Check which images have recent data
	for (const imageId of imageIds) {
		const record = records.get(imageId);
		if (record && record.lastChecked > twoHoursAgo) {
			results.set(imageId, imageMaturityDb.recordToImageMaturity(record));
		} else {
			imageIdsNeedingCheck.push(imageId);
		}
	}

	// Fresh check for images without recent data
	if (imageIdsNeedingCheck.length > 0) {
		const updates: Array<{
			imageId: string;
			repository: string;
			tag: string;
			maturity: import('$lib/types/docker/image.type').ImageMaturity;
			metadata: any;
		}> = [];

		for (const imageId of imageIdsNeedingCheck) {
			try {
				const imageDetails = await getImage(imageId);
				if (!imageDetails || !imageDetails.RepoTags?.[0]) {
					continue;
				}

				const repoTag = imageDetails.RepoTags[0];
				const lastColon = repoTag.lastIndexOf(':');
				if (lastColon === -1) continue;

				const repository = repoTag.substring(0, lastColon);
				const tag = repoTag.substring(lastColon + 1);

				const startTime = Date.now();
				const maturity = await checkImageMaturityInternal(imageId);
				const responseTime = Date.now() - startTime;

				if (maturity) {
					results.set(imageId, maturity);
					updates.push({
						imageId,
						repository,
						tag,
						maturity,
						metadata: {
							registryDomain: parseImageNameForRegistry(repository).registry,
							responseTimeMs: responseTime
						}
					});
				}
			} catch (error) {
				console.warn(`Failed to check maturity for image ${imageId}:`, error);
			}

			// Small delay between checks
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Batch update database
		if (updates.length > 0) {
			await imageMaturityDb.setImageMaturityBatch(updates);
		}
	}

	return results;
}

/**
 * Internal maturity check function (no caching logic)
 */
async function checkImageMaturityInternal(imageId: string): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	const imageResult = await tryCatch(getImage(imageId));
	if (imageResult.error) {
		console.warn(`checkImageMaturityInternal: Failed to get image details for ${imageId}:`, imageResult.error);
		return undefined;
	}

	const imageDetails = imageResult.data;
	const repoTag = imageDetails.RepoTags?.[0];

	if (!repoTag || repoTag.includes('<none>')) {
		return undefined;
	}

	const lastColon = repoTag.lastIndexOf(':');
	if (lastColon === -1) {
		return undefined;
	}

	const repository = repoTag.substring(0, lastColon);
	const currentTag = repoTag.substring(lastColon + 1);

	let localCreatedDate: Date | undefined = undefined;
	if (imageDetails.Created) {
		const parsedDate = new Date(imageDetails.Created);
		if (!isNaN(parsedDate.getTime())) {
			localCreatedDate = parsedDate;
		} else {
			console.warn(`checkImageMaturityInternal: Invalid Created date string for image ${imageId}: ${imageDetails.Created}`);
		}
	}

	const registryInfoResult = await tryCatch(getRegistryInfo(repository, currentTag, localCreatedDate));
	if (registryInfoResult.error) {
		if (registryInfoResult.error instanceof RegistryRateLimitError) {
			console.warn(`Registry rate limit hit for ${repository}:${currentTag}: ${registryInfoResult.error.message}`);
		} else if (registryInfoResult.error instanceof PublicRegistryError || registryInfoResult.error instanceof PrivateRegistryError) {
			console.warn(`Registry access error for ${repository}:${currentTag}: ${registryInfoResult.error.message}`);
		} else {
			console.error(`Error getting registry info for ${repository}:${currentTag}:`, registryInfoResult.error);
		}
		return undefined;
	}

	return registryInfoResult.data;
}

/**
 * Get maturity statistics for monitoring
 */
export async function getMaturityStats() {
	return await imageMaturityDb.getMaturityStats();
}

/**
 * Get images with available updates
 */
export async function getImagesWithUpdates() {
	const records = await imageMaturityDb.getImagesWithUpdates();
	return records.map((record) => ({
		imageId: record.id,
		repository: record.repository,
		tag: record.tag,
		maturity: imageMaturityDb.recordToImageMaturity(record)
	}));
}

/**
 * Invalidate maturity data for a specific repository
 */
export async function invalidateRepositoryMaturity(repository: string): Promise<number> {
	return await imageMaturityDb.invalidateRepository(repository);
}

/**
 * Clear all maturity data
 */
export async function clearMaturityCache(): Promise<void> {
	await imageMaturityDb.cleanupOldRecords(0); // Remove all records
}

/**
 * Contacts the Docker registry to get latest version information
 */
async function getRegistryInfo(repository: string, currentTag: string, localCreatedDate?: Date): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	try {
		const { registry: registryDomain } = parseImageNameForRegistry(repository);

		// Attempt 1: Try public registry first
		try {
			const publicMaturityInfo = await checkPublicRegistry(repository, registryDomain, currentTag, localCreatedDate);
			if (publicMaturityInfo) {
				return publicMaturityInfo;
			}
		} catch (error: unknown) {
			if (error instanceof RegistryRateLimitError) {
				// If public check hits a rate limit, re-throw immediately.
				// It's unlikely trying private credentials for the same domain will bypass this.
				throw error;
			}
			// For other PublicRegistryErrors (e.g., 401/403 on a public endpoint for a private image),
			// or other general errors, log and proceed to try private credentials.
			console.warn(`Public registry check failed for ${repository}:${currentTag} (will try private if configured): ${(error as { message?: string }).message}`);
		}

		// Attempt 2: Try private registries if configured
		const settings = await getSettings();
		if (settings.registryCredentials && settings.registryCredentials.length > 0) {
			// Filter all credentials that match the current registry domain
			const matchingCredentials = settings.registryCredentials.filter((cred) => areRegistriesEquivalent(cred.url, registryDomain));

			if (matchingCredentials.length > 0) {
				console.log(`Found ${matchingCredentials.length} potential private credential(s) for domain ${registryDomain} for image ${repository}:${currentTag}.`);
			}

			for (const credential of matchingCredentials) {
				try {
					console.log(`Attempting private registry check for ${repository}:${currentTag} using credential for URL: ${credential.url}`);
					const privateMaturityInfo = await checkPrivateRegistry(repository, registryDomain, currentTag, credential, localCreatedDate);
					if (privateMaturityInfo) {
						// If a check with a credential succeeds, return the info
						return privateMaturityInfo;
					}
					// If privateMaturityInfo is undefined but no error, it means the check was "successful"
					// but no maturity info was determined (e.g. image/tag not found with these creds).
					// We should continue to try other credentials if any.
				} catch (error: unknown) {
					if (error instanceof RegistryRateLimitError) {
						// If a rate limit is hit with any private credential, re-throw.
						console.warn(`Private registry check for ${repository}:${currentTag} hit rate limit with credential for ${credential.url}.`);
						throw error;
					} else if (error instanceof PrivateRegistryError) {
						// Log specific private registry errors (like auth failure for *this* credential)
						// and continue to the next credential.
						console.warn(`Private registry check failed for ${repository}:${currentTag} with credential for ${credential.url}: ${(error as { message?: string }).message}. Trying next if available.`);
					} else {
						// For other unexpected errors during a specific private check, log and continue.
						console.error(`Unexpected error during private registry check for ${repository}:${currentTag} with credential for ${credential.url}:`, error);
					}
				}
			}
		}
		// If all attempts (public and all matching private credentials) fail to yield maturity info
		return undefined;
	} catch (error) {
		// Catch errors re-thrown from within (like critical RateLimitErrors)
		if (error instanceof RegistryRateLimitError || error instanceof PublicRegistryError || error instanceof PrivateRegistryError) {
			// These are "expected" errors that should have been handled or logged appropriately above,
			// but if they are re-thrown to here, it means we should stop processing for this image.
			// The calling function (checkImageMaturity) will handle this.
			throw error;
		}
		// For other unexpected errors in getRegistryInfo logic itself
		console.error(`Unexpected error in getRegistryInfo for ${repository}:${currentTag}:`, error);
		return undefined;
	}
}

/**
 * Check a public registry using Registry API v2
 */
async function checkPublicRegistry(repository: string, registryDomain: string, currentTag: string, localCreatedDate?: Date): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	return checkRegistryV2(repository, registryDomain, currentTag, undefined, localCreatedDate);
}

/**
 * Check a private registry using Registry API v2 with authentication
 */
async function checkPrivateRegistry(repository: string, registryDomain: string, currentTag: string, credentials: { username: string; password: string; url: string }, localCreatedDate?: Date): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
	return checkRegistryV2(repository, registryDomain, currentTag, auth, localCreatedDate);
}

/**
 * Helper function to convert ghcr.io to docker.pkg.github.com
 */
function mapGitHubRegistry(domain: string): string {
	return domain === 'ghcr.io' ? 'ghcr.io' : domain;
}

/**
 * Check a registry using the Docker Registry HTTP API v2
 */
async function checkRegistryV2(repository: string, registryDomain: string, currentTag: string, auth?: string, localCreatedDate?: Date): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	try {
		const mappedDomain = mapGitHubRegistry(registryDomain);

		const repoPath = repository.replace(`${registryDomain}/`, '');
		const adjustedRepoPath = mappedDomain === 'docker.io' && !repoPath.includes('/') ? `library/${repoPath}` : repoPath;
		const baseUrl = mappedDomain === 'docker.io' ? 'https://registry-1.docker.io' : `https://${mappedDomain}`;
		const tagsUrl = `${baseUrl}/v2/${adjustedRepoPath}/tags/list`;

		const headers: Record<string, string> = {
			Accept: 'application/json'
		};

		if (auth) {
			headers['Authorization'] = `Basic ${auth}`;
		}

		const tagsResponse = await fetch(tagsUrl, { headers });

		if (tagsResponse.status === 401) {
			const authHeader = tagsResponse.headers.get('WWW-Authenticate');
			if (authHeader && authHeader.includes('Bearer')) {
				const realm = authHeader.match(/realm="([^"]+)"/)?.[1];
				const service = authHeader.match(/service="([^"]+)"/)?.[1];
				const scope = authHeader.match(/scope="([^"]+)"/)?.[1];

				if (realm) {
					const tokenUrl = `${realm}?service=${service || ''}&scope=${scope || ''}`;

					const tokenHeaders: Record<string, string> = {};
					if (auth) {
						tokenHeaders['Authorization'] = `Basic ${auth}`;
					}

					const tokenResponse = await fetch(tokenUrl, { headers: tokenHeaders });
					if (!tokenResponse.ok) {
						throw new PublicRegistryError(`Failed to authenticate with registry: ${tokenResponse.status}`, registryDomain, repository, tokenResponse.status);
					}

					const tokenData = await tokenResponse.json();
					const token = tokenData.token || tokenData.access_token;

					if (!token) {
						throw new PublicRegistryError('Registry authentication failed - no token', registryDomain, repository);
					}

					headers['Authorization'] = `Bearer ${token}`;
					const authenticatedResponse = await fetch(tagsUrl, { headers });

					if (!authenticatedResponse.ok) {
						throw new PublicRegistryError(`Registry API returned ${authenticatedResponse.status}`, registryDomain, repository, authenticatedResponse.status);
					}
					const tagsData = await authenticatedResponse.json();
					return processTagsData(tagsData, repository, registryDomain, currentTag, headers, localCreatedDate);
				}
			}
			throw new PublicRegistryError('Registry requires authentication', registryDomain, repository, 401);
		}

		if (!tagsResponse.ok) {
			throw new PublicRegistryError(`Registry API returned ${tagsResponse.status}`, registryDomain, repository, tagsResponse.status);
		}

		const tagsData = await tagsResponse.json();
		return processTagsData(tagsData, repository, registryDomain, currentTag, headers, localCreatedDate);
	} catch (error: unknown) {
		if (error instanceof PublicRegistryError || error instanceof PrivateRegistryError || error instanceof RegistryRateLimitError) {
			throw error;
		}
		throw new PublicRegistryError(`Registry API error for ${repository}: ${(error as { message?: string }).message}`, registryDomain, repository);
	}
}

/**
 * Process tags data from the registry API
 */
async function processTagsData(tagsData: Record<string, unknown>, repository: string, registryDomain: string, currentTag: string, headers: Record<string, string>, localCreatedDate?: Date): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	const tags = tagsData.tags || [];
	if (!Array.isArray(tags)) {
		console.warn(`processTagsData: tagsData.tags is not an array for ${repository}. Received:`, tagsData);
		return undefined;
	}
	const { newerTags } = findNewerVersionsOfSameTag(tags, currentTag);

	const settings = await getSettings();
	const maturityThreshold = settings.maturityThresholdDays || 30;

	const createMaturityObject = (version: string, dateSource: Date | { date: string; daysSince: number }, updatesAvailable: boolean): import('$lib/types/docker/image.type').ImageMaturity => {
		let dateString: string;
		let daysSince: number;
		const dateFormatOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

		if (dateSource instanceof Date) {
			if (isNaN(dateSource.getTime())) {
				dateString = 'Invalid date';
				daysSince = -1;
			} else {
				dateString = dateSource.toLocaleDateString(undefined, dateFormatOptions);
				daysSince = getDaysSinceDate(dateSource);
			}
		} else {
			dateString = dateSource.date;
			daysSince = dateSource.daysSince;
		}

		const status: import('$lib/types/docker/image.type').ImageMaturity['status'] = daysSince === -1 || dateString === 'Invalid date' || dateString === 'Unknown date' ? 'Unknown' : daysSince > maturityThreshold ? 'Matured' : 'Not Matured';

		return {
			version,
			date: dateString,
			status,
			updatesAvailable
		};
	};

	if (newerTags.length > 0) {
		const newestTag = newerTags[0];
		try {
			const dateInfoFromRegistry = await getImageCreationDate(repository, registryDomain, newestTag, headers);
			return createMaturityObject(newestTag, dateInfoFromRegistry, true);
		} catch (error) {
			console.error(`Failed to get creation date from registry for newer tag ${repository}:${newestTag}:`, error);
			return createMaturityObject(newestTag, { date: 'Unknown date', daysSince: -1 }, true);
		}
	} else {
		if (localCreatedDate) {
			return createMaturityObject(currentTag, localCreatedDate, false);
		} else {
			try {
				const dateInfoFromRegistry = await getImageCreationDate(repository, registryDomain, currentTag, headers);
				return createMaturityObject(currentTag, dateInfoFromRegistry, false);
			} catch (error) {
				console.error(`Failed to get creation date from registry for current tag ${repository}:${currentTag}:`, error);
				return createMaturityObject(currentTag, { date: 'Unknown date', daysSince: -1 }, false);
			}
		}
	}
}

/**
 * Helper function to get image creation date from registry
 */
async function getImageCreationDate(repository: string, registryDomain: string, tag: string, headers: Record<string, string>): Promise<{ date: string; daysSince: number }> {
	const mappedDomain = mapGitHubRegistry(registryDomain);

	const baseUrl = mappedDomain === 'docker.io' ? 'https://registry-1.docker.io' : `https://${mappedDomain}`;
	const repoPath = repository.replace(`${registryDomain}/`, '');
	const adjustedRepoPath = mappedDomain === 'docker.io' && !repoPath.includes('/') ? `library/${repoPath}` : repoPath;

	const manifestUrl = `${baseUrl}/v2/${adjustedRepoPath}/manifests/${tag}`;

	const manifestResult = await tryCatch(
		fetch(manifestUrl, {
			headers: {
				...headers,
				Accept: 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json'
			}
		})
	);

	if (manifestResult.error || !manifestResult.data.ok) {
		if (registryDomain === 'docker.io' || registryDomain === 'registry-1.docker.io') {
			const dockerHubResult = await tryCatch(getDockerHubCreationDate(repoPath, tag));
			if (!dockerHubResult.error) {
				return dockerHubResult.data;
			}
		}

		return {
			date: 'Unknown date',
			daysSince: -1
		};
	}

	const manifestResponse = manifestResult.data;
	const manifestDataResult = await tryCatch(manifestResponse.json());

	if (manifestDataResult.error) {
		return {
			date: 'Unknown date',
			daysSince: -1
		};
	}

	const manifest = manifestDataResult.data;

	if (manifest.annotations && manifest.annotations['org.opencontainers.image.created']) {
		const createdDate = new Date(manifest.annotations['org.opencontainers.image.created']);

		if (!isNaN(createdDate.getTime())) {
			const daysSince = getDaysSinceDate(createdDate);
			const dateFormatOptions: Intl.DateTimeFormatOptions = {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			};

			return {
				date: createdDate.toLocaleDateString(undefined, dateFormatOptions),
				daysSince: daysSince
			};
		}
	}

	if (manifest.manifests && Array.isArray(manifest.manifests)) {
		for (const descriptor of manifest.manifests) {
			if (descriptor.annotations && descriptor.annotations['org.opencontainers.image.created']) {
				const createdDate = new Date(descriptor.annotations['org.opencontainers.image.created']);

				if (!isNaN(createdDate.getTime())) {
					const daysSince = getDaysSinceDate(createdDate);
					const dateFormatOptions: Intl.DateTimeFormatOptions = {
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					};

					return {
						date: createdDate.toLocaleDateString(undefined, dateFormatOptions),
						daysSince: daysSince
					};
				}
			}
		}
	}

	const configDigest = manifest.config?.digest;

	if (!configDigest) {
		if (registryDomain === 'docker.io' || registryDomain === 'registry-1.docker.io') {
			const dockerHubResult = await tryCatch(getDockerHubCreationDate(repoPath, tag));
			if (!dockerHubResult.error) {
				return dockerHubResult.data;
			}
		}

		return {
			date: 'Unknown date',
			daysSince: -1
		};
	}

	const configUrl = `${baseUrl}/v2/${adjustedRepoPath}/blobs/${configDigest}`;
	const configResult = await tryCatch(fetch(configUrl, { headers }));

	if (configResult.error || !configResult.data.ok) {
		return {
			date: 'Unknown date',
			daysSince: -1
		};
	}

	const configResponse = configResult.data;
	const configDataResult = await tryCatch(configResponse.json());

	if (configDataResult.error) {
		return {
			date: 'Unknown date',
			daysSince: -1
		};
	}

	const configData = configDataResult.data;

	if (configData.created) {
		const creationDate = new Date(configData.created);

		if (!isNaN(creationDate.getTime())) {
			const daysSince = getDaysSinceDate(creationDate);
			const dateFormatOptions: Intl.DateTimeFormatOptions = {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			};

			return {
				date: creationDate.toLocaleDateString(undefined, dateFormatOptions),
				daysSince: daysSince
			};
		}
	}

	if (configData.config && configData.config.Labels && configData.config.Labels['org.opencontainers.image.created']) {
		const labelDate = new Date(configData.config.Labels['org.opencontainers.image.created']);

		if (!isNaN(labelDate.getTime())) {
			const daysSince = getDaysSinceDate(labelDate);
			const dateFormatOptions: Intl.DateTimeFormatOptions = {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			};

			return {
				date: labelDate.toLocaleDateString(undefined, dateFormatOptions),
				daysSince: daysSince
			};
		}
	}

	if (registryDomain === 'docker.io' || registryDomain === 'registry-1.docker.io') {
		const dockerHubResult = await tryCatch(getDockerHubCreationDate(repoPath, tag));
		if (!dockerHubResult.error) {
			return dockerHubResult.data;
		}
	}

	return {
		date: 'Unknown date',
		daysSince: -1
	};
}

/**
 * Fallback to get image creation date from Docker Hub API
 */
async function getDockerHubCreationDate(repository: string, tag: string): Promise<{ date: string; daysSince: number }> {
	const repoPath = repository.startsWith('library/') ? repository.substring(8) : repository;
	const url = `https://hub.docker.com/v2/repositories/${repoPath}/tags/${tag}`;

	const responseResult = await tryCatch(fetch(url));
	if (responseResult.error || !responseResult.data.ok) {
		return {
			date: 'Unknown date',
			daysSince: -1
		};
	}

	const response = responseResult.data;
	const dataResult = await tryCatch(response.json());

	if (dataResult.error || !dataResult.data.last_updated) {
		return {
			date: 'Unknown date',
			daysSince: -1
		};
	}

	const data = dataResult.data;
	const creationDate = new Date(data.last_updated);
	const daysSince = getDaysSinceDate(creationDate);

	const dateFormatOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	};

	return {
		date: creationDate.toLocaleDateString(undefined, dateFormatOptions),
		daysSince: daysSince
	};
}

/**
 * Get the tag pattern for semantic comparison between tags
 * This allows comparing similar versions while avoiding unrelated tags
 */
function getTagPattern(tag: string): { pattern: string; version: string | null } {
	const exactMatchTags = ['latest', 'stable', 'unstable', 'dev', 'devel', 'development', 'test', 'testing', 'prod', 'production', 'main', 'master', 'stage', 'staging', 'canary', 'nightly', 'edge', 'next', 'private-registries', 'data-path', 'env-fix', 'oidc'];

	const versionMatch = tag.match(/(\d+(?:\.\d+)*)/);
	const version = versionMatch ? versionMatch[1] : null;

	const prefixMatch = tag.match(/^([a-z][\w-]*?)[.-]?\d/i);
	const prefix = prefixMatch ? prefixMatch[1] : null;

	if (exactMatchTags.includes(tag)) {
		return { pattern: tag, version: null };
	} else if (prefix && version) {
		return { pattern: prefix, version };
	} else if (version) {
		const majorVersion = version.split('.')[0];
		return { pattern: majorVersion, version };
	} else {
		return { pattern: tag, version: null };
	}
}

/**
 * Find newer versions of similar tags
 */
function findNewerVersionsOfSameTag(allTags: string[], currentTag: string): { newerTags: string[]; isSpecialTag: boolean } {
	const { pattern, version } = getTagPattern(currentTag);

	if (!version) {
		const exactMatches = allTags.filter((tag) => tag === currentTag);

		if (exactMatches.length > 0) {
			return { newerTags: [], isSpecialTag: true };
		}

		const specialTags = ['latest', 'stable', 'development', 'main', 'master'];
		const alternatives = allTags.filter((tag) => specialTags.includes(tag));

		if (alternatives.length > 0) {
			return { newerTags: alternatives, isSpecialTag: true };
		}

		return { newerTags: [], isSpecialTag: true };
	}

	const similarTags = allTags
		.filter((tag) => {
			const tagInfo = getTagPattern(tag);
			return tagInfo.pattern === pattern && tagInfo.version;
		})
		.filter((tag) => tag !== currentTag);

	const sortedTags = sortTagsByVersion([currentTag, ...similarTags]);
	const newerTags = sortedTags.filter((tag) => tag !== currentTag);

	return { newerTags, isSpecialTag: false };
}

/**
 * Sort tags by their semantic version
 */
function sortTagsByVersion(tags: string[]): string[] {
	return [...tags].sort((a, b) => {
		const getVersionParts = (tag: string) => {
			const verMatch = tag.match(/(\d+(?:\.\d+)*)/);
			if (!verMatch) return [0];

			return verMatch[1].split('.').map(Number);
		};

		const aVer = getVersionParts(a);
		const bVer = getVersionParts(b);

		for (let i = 0; i < Math.max(aVer.length, bVer.length); i++) {
			const aNum = aVer[i] || 0;
			const bNum = bVer[i] || 0;

			if (aNum !== bNum) {
				return bNum - aNum;
			}
		}

		return b.localeCompare(a);
	});
}

/**
 * Calculates days between now and a given date
 */
function getDaysSinceDate(date: Date): number {
	const now = new Date();
	const diffTime = Math.abs(now.getTime() - date.getTime());
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
