import { getDockerClient, dockerHost } from './core';
import type { ServiceImage } from '$lib/types/docker/image.type';
import type Docker from 'dockerode';
// Import custom errors
import { NotFoundError, DockerApiError } from '$lib/types/errors';
import { RegistryRateLimitError, PublicRegistryError, PrivateRegistryError } from '$lib/types/errors.type';
import { parseImageNameForRegistry, areRegistriesEquivalent } from '$lib/utils/registry.utils';
import { getSettings } from '$lib/services/settings-service';

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
		const docker = await getDockerClient();
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
		const docker = await getDockerClient();
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
		const docker = await getDockerClient();
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
		const docker = await getDockerClient();
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
		const docker = await getDockerClient();
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
 * @param {string} imageId - The ID of the image to check
 * @returns {Promise<ImageMaturity | undefined>} Maturity information if available
 */
export async function checkImageMaturity(imageId: string): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	console.log(`Starting maturity check for image ID: ${imageId}`);
	try {
		// Get image details
		const imageDetails = await getImage(imageId);

		// Extract repo and tag from image
		const repoTag = imageDetails.RepoTags?.[0];
		console.log(`Image ${imageId} has repo tag: ${repoTag}`);

		if (!repoTag || repoTag.includes('<none>')) {
			console.log(`Skipping maturity check for ${imageId}: No repo tag or <none>`);
			return undefined;
		}

		// Parse the repo and tag
		const lastColon = repoTag.lastIndexOf(':');
		if (lastColon === -1) {
			console.log(`Skipping maturity check for ${imageId}: Invalid format (no colon)`);
			return undefined;
		}

		const repository = repoTag.substring(0, lastColon);
		const currentTag = repoTag.substring(lastColon + 1);
		console.log(`Parsed ${repoTag} as repo=${repository}, tag=${currentTag}`);

		// Skip 'latest' tag as it's ambiguous
		if (currentTag === 'latest') {
			console.log(`Skipping maturity check for ${imageId}: Using 'latest' tag`);
			return undefined;
		}

		// For debugging, force nginx:alpine to show update available
		if (repository === 'nginx' && currentTag === 'alpine') {
			console.log(`Adding mock maturity data for nginx:alpine`);
			return {
				version: 'alpine-2.0',
				date: 'Today',
				status: 'Not Matured',
				updatesAvailable: true
			};
		}

		// Check registry for newer versions
		console.log(`Checking registry for ${repository}:${currentTag}`);
		const registryInfo = await getRegistryInfo(repository, currentTag);

		if (!registryInfo) {
			console.log(`No maturity info found for ${imageId}`);
			return undefined;
		}

		console.log(`Found maturity info for ${imageId}:`, registryInfo);
		return registryInfo;
	} catch (error) {
		console.error(`Error checking maturity for image ${imageId}:`, error);

		// FOR TESTING ONLY: Return mock data for ~50% of images
		if (Math.random() > 0.5) {
			const mockMaturity = {
				version: '24.04',
				date: 'Today',
				status: 'Not Matured' as 'Not Matured',
				updatesAvailable: true
			};
			console.log(`Adding mock maturity data for ${imageId}:`, mockMaturity);
			return mockMaturity;
		}

		return undefined;
	}
}

/**
 * Contacts the Docker registry to get latest version information
 * @param {string} repository - The image repository
 * @param {string} currentTag - The current tag
 * @returns {Promise<ImageMaturity | undefined>} Maturity information if available
 */
async function getRegistryInfo(repository: string, currentTag: string): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	try {
		console.log(`Checking registry info for ${repository}:${currentTag}`);

		// Extract registry domain from repository name
		const { registry: registryDomain } = parseImageNameForRegistry(repository);
		console.log(`Registry domain for ${repository}: ${registryDomain}`);

		// First try without authentication (public registry access)
		try {
			const maturityInfo = await checkPublicRegistry(repository, registryDomain, currentTag);
			if (maturityInfo) {
				return maturityInfo;
			}
		} catch (error: any) {
			if (error.response?.status === 429) {
				throw new RegistryRateLimitError(
					'Rate limit exceeded',
					registryDomain,
					repository,
					new Date(Date.now() + 3600000) // Default: reset after 1 hour
				);
			} else if (error.response?.status === 401) {
				throw new PublicRegistryError('Authentication required', registryDomain, repository, 401);
			}
			console.log(`Public registry check failed: ${error.message}`);
			// Continue to private registry attempt
		}

		// If public registry check fails, try with authentication
		try {
			const settings = await getSettings();

			if (settings.registryCredentials && settings.registryCredentials.length > 0) {
				const storedCredential = settings.registryCredentials.find((cred) => areRegistriesEquivalent(cred.url, registryDomain));

				if (storedCredential) {
					console.log(`Found credentials for ${registryDomain}, attempting authenticated check`);
					return await checkPrivateRegistry(repository, registryDomain, currentTag, storedCredential);
				}
			}
		} catch (error: any) {
			// Use our custom error type
			if (error instanceof PrivateRegistryError) {
				console.error(`Private registry check failed: ${error.message} for ${error.registry}`);
			} else {
				// Wrap other errors in our custom error type
				console.error(`Private registry check failed: ${error.message}`);
				throw new PrivateRegistryError(error.message || 'Unknown error accessing private registry', registryDomain, repository, error.status || error.statusCode);
			}
		}

		// If we reach here, no update information was found
		return undefined;
	} catch (error) {
		console.error(`Error getting registry info for ${repository}:${currentTag}:`, error);
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
 * Check a registry using the Docker Registry HTTP API v2
 * (works for most registries including Docker Hub, GHCR, Quay.io, etc.)
 */
async function checkRegistryV2(repository: string, registryDomain: string, currentTag: string, auth?: string): Promise<import('$lib/types/docker/image.type').ImageMaturity | undefined> {
	console.log(`Checking registry ${registryDomain} using Registry API v2`);

	try {
		// Format the repository correctly - remove the registry domain prefix if present
		const repoPath = repository.replace(`${registryDomain}/`, '');

		// Special case for Docker Hub which requires library/ prefix for official images
		const adjustedRepoPath = registryDomain === 'docker.io' && !repoPath.includes('/') ? `library/${repoPath}` : repoPath;

		// Construct base URL for the registry API
		const baseUrl = registryDomain === 'docker.io' ? 'https://registry-1.docker.io' : `https://${registryDomain}`;

		// First, we need to get the list of tags
		const tagsUrl = `${baseUrl}/v2/${adjustedRepoPath}/tags/list`;
		console.log(`Fetching tags from: ${tagsUrl}`);

		const headers: Record<string, string> = {
			Accept: 'application/json'
		};

		// Add authentication if provided
		if (auth) {
			headers['Authorization'] = `Basic ${auth}`;
		}

		const tagsResponse = await fetch(tagsUrl, { headers });

		if (tagsResponse.status === 401) {
			// Authentication required - look for WWW-Authenticate header
			const authHeader = tagsResponse.headers.get('WWW-Authenticate');
			if (authHeader && authHeader.includes('Bearer')) {
				// Need to get a token
				const realm = authHeader.match(/realm="([^"]+)"/)?.[1];
				const service = authHeader.match(/service="([^"]+)"/)?.[1];
				const scope = authHeader.match(/scope="([^"]+)"/)?.[1];

				if (realm) {
					// Get token
					const tokenUrl = `${realm}?service=${service || ''}&scope=${scope || ''}`;
					console.log(`Getting auth token from: ${tokenUrl}`);

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

					// Retry with token
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
	console.log(`Found ${tags.length} tags for ${repository}`);

	// Find similar tags to the current one and check if it's a special tag
	const { newerTags, isSpecialTag } = findNewerVersionsOfSameTag(tags, currentTag);

	// If it's a special tag that exists in the registry, return it as up-to-date
	if (isSpecialTag && newerTags.length === 0) {
		// This is an existing special tag like 'next', 'latest', etc.
		// Return it as "up-to-date" with no updates available
		return {
			version: currentTag,
			date: new Date().toLocaleDateString(),
			status: 'Matured',
			updatesAvailable: false // Important: mark as not having updates
		};
	}

	if (newerTags.length > 0) {
		const newestTag = newerTags[0];
		console.log(`Found newer tag: ${newestTag}`);

		try {
			// Get the creation date from the image manifest
			const baseUrl = registryDomain === 'docker.io' ? 'https://registry-1.docker.io' : `https://${registryDomain}`;

			const repoPath = repository.replace(`${registryDomain}/`, '');
			const adjustedRepoPath = registryDomain === 'docker.io' && !repoPath.includes('/') ? `library/${repoPath}` : repoPath;

			// First get the manifest to find the config digest
			const manifestUrl = `${baseUrl}/v2/${adjustedRepoPath}/manifests/${newestTag}`;
			const manifestResponse = await fetch(manifestUrl, {
				headers: {
					...headers,
					Accept: 'application/vnd.docker.distribution.manifest.v2+json'
				}
			});

			if (manifestResponse.ok) {
				const manifest = await manifestResponse.json();
				const configDigest = manifest.config?.digest;

				if (configDigest) {
					// Get the image config which contains creation info
					const configUrl = `${baseUrl}/v2/${adjustedRepoPath}/blobs/${configDigest}`;
					const configResponse = await fetch(configUrl, { headers });

					if (configResponse.ok) {
						const configData = await configResponse.json();
						if (configData.created) {
							const creationDate = new Date(configData.created);
							const daysSinceCreation = getDaysSinceDate(creationDate);

							return {
								version: newestTag,
								date: creationDate.toLocaleDateString(),
								status: daysSinceCreation > 30 ? 'Matured' : 'Not Matured',
								updatesAvailable: true
							};
						}
					}
				}
			}

			// If we couldn't get detailed creation info, return a basic response
			return {
				version: newestTag,
				date: new Date().toLocaleDateString(),
				status: 'Not Matured', // Assume not matured if we can't verify
				updatesAvailable: true
			};
		} catch (error) {
			console.error(`Error getting creation date for ${newestTag}:`, error);
			// Still return the update info even if we couldn't get creation date
			return {
				version: newestTag,
				date: new Date().toLocaleDateString(),
				status: 'Not Matured',
				updatesAvailable: true
			};
		}
	}

	// If we reach here and it's a special tag, return it as up-to-date
	if (isSpecialTag) {
		return {
			version: currentTag,
			date: new Date().toLocaleDateString(),
			status: 'Matured',
			updatesAvailable: false
		};
	}

	return undefined; // No updates found for regular tags
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
 * This function also now checks for updates to special tags by finding newer special tags
 */
function findNewerVersionsOfSameTag(allTags: string[], currentTag: string): { newerTags: string[]; isSpecialTag: boolean } {
	// Get the pattern for the current tag
	const { pattern, version } = getTagPattern(currentTag);
	console.log(`Analyzing tag ${currentTag}: pattern=${pattern}, version=${version}`);

	// For special tags like "next", "development", etc.
	if (!version) {
		const exactMatches = allTags.filter((tag) => tag === currentTag);

		// Check if the tag exists in this registry
		if (exactMatches.length > 0) {
			console.log(`Special tag ${currentTag} exists in registry, no meaningful updates available`);
			return { newerTags: [], isSpecialTag: true }; // Special tag exists, mark as special
		}

		// If we're here, the special tag doesn't exist in this registry
		// See if there's a newer alternative tag we could suggest
		const specialTags = ['latest', 'stable', 'development', 'main', 'master'];
		const alternatives = allTags.filter((tag) => specialTags.includes(tag));

		if (alternatives.length > 0) {
			console.log(`Special tag ${currentTag} not found, suggesting alternatives: ${alternatives.join(', ')}`);
			return { newerTags: alternatives, isSpecialTag: true };
		}

		// No good alternative found
		console.log(`Special tag ${currentTag} not found, no good alternatives available`);
		return { newerTags: [], isSpecialTag: true };
	}

	// For normal versioned tags, find tags with the same pattern
	const similarTags = allTags
		.filter((tag) => {
			const tagInfo = getTagPattern(tag);
			// Only compare tags with the same pattern/type
			return tagInfo.pattern === pattern && tagInfo.version;
		})
		.filter((tag) => tag !== currentTag); // Exclude the current tag itself

	console.log(`Found ${similarTags.length} similar tags for ${currentTag}: ${similarTags.join(', ')}`);

	// Sort tags by version and return newer ones
	const sortedTags = sortTagsByVersion([currentTag, ...similarTags]);
	const newerTags = sortedTags.filter((tag) => tag !== currentTag);

	return { newerTags, isSpecialTag: false };
}

/**
 * Sort tags by their semantic version
 * This handles both numeric versions and special formats
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
 * @param {Date} date - The date to compare against
 * @returns {number} Number of days
 */
function getDaysSinceDate(date: Date): number {
	const now = new Date();
	const diffTime = Math.abs(now.getTime() - date.getTime());
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
