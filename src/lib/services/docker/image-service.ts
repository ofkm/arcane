import { getDockerClient, dockerHost } from './core';
import type { ServiceImage } from '$lib/types/docker/image.type';
import type Docker from 'dockerode';
import { NotFoundError, DockerApiError, RegistryRateLimitError, PublicRegistryError, PrivateRegistryError, ApiErrorCode } from '$lib/types/errors.type';
import { parseImageNameForRegistry, areRegistriesEquivalent } from '$lib/utils/registry.utils';
import { getSettings } from '$lib/services/settings-service';
import { updateImageMaturity } from '$lib/stores/maturity-store';
import { tryCatch } from '$lib/utils/try-catch';
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
 * Run maturity checks for all images
 */
async function runMaturityChecks(): Promise<void> {
	console.log('Running scheduled image maturity checks...');

	const imagesResult = await tryCatch(listImages());
	if (imagesResult.error) {
		console.error('Error during scheduled maturity check:', imagesResult.error);
		return;
	}

	const images = imagesResult.data;
	let checkedCount = 0;
	let updatesFound = 0;

	// Check each image for maturity info, with a small delay between checks
	for (const image of images) {
		// Skip images without proper tags
		if (image.repo === '<none>' || image.tag === '<none>') {
			continue;
		}

		const maturityResult = await tryCatch(checkImageMaturity(image.id));
		const maturityInfo = maturityResult.data;

		if (!maturityResult.error) {
			checkedCount++;
			if (maturityInfo?.updatesAvailable) {
				updatesFound++;
			}
		}

		// Small delay to avoid overwhelming registries
		await new Promise((resolve) => setTimeout(resolve, 200));
	}

	console.log(`Maturity check completed: Checked ${checkedCount} images, found ${updatesFound} updates`);

	// Emit an event that the UI can listen to for updates
	if (typeof window !== 'undefined') {
		window.dispatchEvent(
			new CustomEvent('maturity-check-complete', {
				detail: { checkedCount, updatesFound }
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
		throw new Error(`Failed to list Docker images using host "${dockerHost}".`);
	}

	const docker = dockerClientResult.data;
	const imagesResult = await tryCatch(docker.listImages({ all: false }));

	if (imagesResult.error) {
		throw new Error(`Failed to list Docker images using host "${dockerHost}".`);
	}

	const images = imagesResult.data;

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
	const image = docker.getImage(imageId);

	const inspectResult = await tryCatch(image.inspect());
	if (inspectResult.error) {
		const error = inspectResult.error as any;
		if (error.statusCode === 404) {
			throw new NotFoundError(`Image "${imageId}" not found.`);
		}
		throw new DockerApiError(`Failed to inspect image "${imageId}": ${error.message || 'Unknown Docker error'}`, error.statusCode);
	}

	return inspectResult.data;
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
	} catch (error: any) {
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
	} catch (error: any) {
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
	const docker = await getDockerClient();
	const pullOptions: any = {};

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
 * and returns maturity information.
 */
export async function checkImageMaturity(imageId: string): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	const imageResult = await tryCatch(getImage(imageId));
	if (imageResult.error) {
		updateImageMaturity(imageId, undefined);
		return undefined;
	}

	const imageDetails = imageResult.data;
	const repoTag = imageDetails.RepoTags?.[0];

	if (!repoTag || repoTag.includes('<none>')) {
		updateImageMaturity(imageId, undefined);
		return undefined;
	}

	const lastColon = repoTag.lastIndexOf(':');
	if (lastColon === -1) {
		updateImageMaturity(imageId, undefined);
		return undefined;
	}

	const repository = repoTag.substring(0, lastColon);
	const currentTag = repoTag.substring(lastColon + 1);

	if (currentTag === 'latest') {
		updateImageMaturity(imageId, undefined);
		return undefined;
	}

	const registryInfoResult = await tryCatch(getRegistryInfo(repository, currentTag));
	if (registryInfoResult.error) {
		updateImageMaturity(imageId, undefined);
		return undefined;
	}

	const registryInfo = registryInfoResult.data;
	if (!registryInfo) {
		updateImageMaturity(imageId, undefined);
		return undefined;
	}

	updateImageMaturity(imageId, registryInfo);
	return registryInfo;
}

/**
 * Contacts the Docker registry to get latest version information
 */
async function getRegistryInfo(repository: string, currentTag: string): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	try {
		const { registry: registryDomain } = parseImageNameForRegistry(repository);

		try {
			const maturityInfo = await checkPublicRegistry(repository, registryDomain, currentTag);
			if (maturityInfo) {
				return maturityInfo;
			}
		} catch (error: any) {
			if (error.response?.status === 429) {
				throw new RegistryRateLimitError('Rate limit exceeded', registryDomain, repository, new Date(Date.now() + 3600000));
			} else if (error.response?.status === 401) {
				throw new PublicRegistryError('Authentication required', registryDomain, repository, 401);
			}
		}

		try {
			const settings = await getSettings();

			if (settings.registryCredentials && settings.registryCredentials.length > 0) {
				const storedCredential = settings.registryCredentials.find((cred) => areRegistriesEquivalent(cred.url, registryDomain));

				if (storedCredential) {
					return await checkPrivateRegistry(repository, registryDomain, currentTag, storedCredential);
				}
			}
		} catch (error: any) {
			if (error instanceof PrivateRegistryError) {
				console.error(`Private registry check failed: ${error.message} for ${error.registry}`);
			} else {
				throw new PrivateRegistryError(error.message || 'Unknown error accessing private registry', registryDomain, repository, error.status || error.statusCode);
			}
		}

		return undefined;
	} catch (error) {
		return undefined;
	}
}

/**
 * Check a public registry using Registry API v2
 */
async function checkPublicRegistry(repository: string, registryDomain: string, currentTag: string): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	return checkRegistryV2(repository, registryDomain, currentTag);
}

/**
 * Check a private registry using Registry API v2 with authentication
 */
async function checkPrivateRegistry(repository: string, registryDomain: string, currentTag: string, credentials: { username: string; password: string; url: string }): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
	return checkRegistryV2(repository, registryDomain, currentTag, auth);
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
async function checkRegistryV2(repository: string, registryDomain: string, currentTag: string, auth?: string): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	try {
		// Map GitHub registry domains
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
					return processTagsData(tagsData, repository, registryDomain, currentTag, headers);
				}
			}

			throw new PublicRegistryError('Registry requires authentication', registryDomain, repository, 401);
		}

		if (!tagsResponse.ok) {
			throw new PublicRegistryError(`Registry API returned ${tagsResponse.status}`, registryDomain, repository, tagsResponse.status);
		}

		const tagsData = await tagsResponse.json();
		return processTagsData(tagsData, repository, registryDomain, currentTag, headers);
	} catch (error: any) {
		if (error instanceof PublicRegistryError || error instanceof PrivateRegistryError) {
			throw error;
		}

		throw new PublicRegistryError(`Registry API error: ${error.message}`, registryDomain, repository);
	}
}

/**
 * Process tags data from the registry API
 */
async function processTagsData(tagsData: any, repository: string, registryDomain: string, currentTag: string, headers: Record<string, string>): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	const tags = tagsData.tags || [];
	const { newerTags, isSpecialTag } = findNewerVersionsOfSameTag(tags, currentTag);

	// Get the configured maturity threshold from settings
	const settings = await getSettings();
	const maturityThreshold = settings.maturityThresholdDays || 30; // Fallback to 30 if not set

	// If it's a special tag with no updates, mark as up-to-date
	if (isSpecialTag && newerTags.length === 0) {
		try {
			const dateInfo = await getImageCreationDate(repository, registryDomain, currentTag, headers);
			return {
				version: currentTag,
				date: dateInfo.date,
				status: dateInfo.daysSince > maturityThreshold ? 'Matured' : 'Not Matured',
				updatesAvailable: false
			};
		} catch (error) {
			return {
				version: currentTag,
				date: 'Unknown date',
				status: 'Matured',
				updatesAvailable: false
			};
		}
	}

	if (newerTags.length > 0) {
		const newestTag = newerTags[0];

		try {
			const dateInfo = await getImageCreationDate(repository, registryDomain, newestTag, headers);

			return {
				version: newestTag,
				date: dateInfo.date,
				status: dateInfo.daysSince > maturityThreshold ? 'Matured' : 'Not Matured',
				updatesAvailable: true
			};
		} catch (error) {
			console.error(`Failed to get creation date for ${repository}:${newestTag}:`, error);
			return {
				version: newestTag,
				date: 'Unknown date',
				status: 'Unknown',
				updatesAvailable: true
			};
		}
	}

	// Return existing special tag data
	if (isSpecialTag) {
		try {
			const dateInfo = await getImageCreationDate(repository, registryDomain, currentTag, headers);
			return {
				version: currentTag,
				date: dateInfo.date,
				status: dateInfo.daysSince > maturityThreshold ? 'Matured' : 'Not Matured',
				updatesAvailable: false
			};
		} catch (error) {
			return {
				version: currentTag,
				date: 'Unknown date',
				status: 'Matured',
				updatesAvailable: false
			};
		}
	}

	return undefined;
}

/**
 * Helper function to get image creation date from registry
 */
async function getImageCreationDate(repository: string, registryDomain: string, tag: string, headers: Record<string, string>): Promise<{ date: string; daysSince: number }> {
	// Map GitHub registry domains
	const mappedDomain = mapGitHubRegistry(registryDomain);

	const baseUrl = mappedDomain === 'docker.io' ? 'https://registry-1.docker.io' : `https://${mappedDomain}`;
	const repoPath = repository.replace(`${registryDomain}/`, '');
	const adjustedRepoPath = mappedDomain === 'docker.io' && !repoPath.includes('/') ? `library/${repoPath}` : repoPath;

	// First get the manifest to find the config digest
	const manifestUrl = `${baseUrl}/v2/${adjustedRepoPath}/manifests/${tag}`;

	const manifestResult = await tryCatch(
		fetch(manifestUrl, {
			headers: {
				...headers,
				// Accept multiple manifest formats
				Accept: 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json'
			}
		})
	);

	if (manifestResult.error || !manifestResult.data.ok) {
		// If this is Docker Hub, try the fallback
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

	// First try to get date from annotations (OCI format)
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

	// Check for created date in manifest descriptors (some OCI registries)
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

	// If no date in annotations, fall back to checking the config blob
	const configDigest = manifest.config?.digest;

	if (!configDigest) {
		// If this is Docker Hub, try the fallback
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

	// Get the image config which contains creation date
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

	// Check for the created date in config
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

	// Last resort check: look for created date in container config
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

	// If we couldn't find any date, try Docker Hub API as last resort
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
	// Remove library/ prefix for official images in Docker Hub API
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

	// Format the date properly for display
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
	// Special tags that should only be compared with themselves
	const exactMatchTags = ['latest', 'stable', 'unstable', 'dev', 'devel', 'development', 'test', 'testing', 'prod', 'production', 'main', 'master', 'stage', 'staging', 'canary', 'nightly', 'edge', 'next', 'private-registries', 'data-path', 'env-fix', 'oidc'];

	// Try to extract version number
	const versionMatch = tag.match(/(\d+(?:\.\d+)*)/);
	const version = versionMatch ? versionMatch[1] : null;

	// Get the non-version prefix for type-based tags (e.g. "alpine" from "alpine-3.14")
	const prefixMatch = tag.match(/^([a-z][\w-]*?)[\.-]?\d/i);
	const prefix = prefixMatch ? prefixMatch[1] : null;

	// Check if it's an exact match special tag first
	if (exactMatchTags.includes(tag)) {
		return { pattern: tag, version: null };
	} else if (prefix && version) {
		// It's a prefixed version like "alpine-3.14"
		return { pattern: prefix, version };
	} else if (version) {
		// It's a pure version like "1.2.3"
		const majorVersion = version.split('.')[0];
		return { pattern: majorVersion, version };
	} else {
		// It's something else - treat as exact match
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
		// Extract version numbers
		const getVersionParts = (tag: string) => {
			const verMatch = tag.match(/(\d+(?:\.\d+)*)/);
			if (!verMatch) return [0]; // No version number found

			// Convert "1.2.3" to [1, 2, 3]
			return verMatch[1].split('.').map(Number);
		};

		const aVer = getVersionParts(a);
		const bVer = getVersionParts(b);

		// Compare version numbers
		for (let i = 0; i < Math.max(aVer.length, bVer.length); i++) {
			const aNum = aVer[i] || 0;
			const bNum = bVer[i] || 0;

			if (aNum !== bNum) {
				return bNum - aNum; // Sort descending (newer first)
			}
		}

		// If versions are equal, sort alphabetically
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
