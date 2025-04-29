import { listContainers, getContainer, recreateContainer } from './container-service'; // Import recreateContainer, remove restartContainer
import { listStacks, getStack, fullyRedeployStack } from './stack-service';
import { pullImage, getImage, listImages } from './image-service';
import { getSettings } from '../settings-service';
import type { ServiceContainer } from '$lib/types/docker';
import type { Stack } from '$lib/types/docker/stack.type';

// Track which entities are being updated to avoid concurrent updates
const updatingContainers = new Set<string>();
const updatingStacks = new Set<string>();

/**
 * Checks for container image updates and applies them if configured
 */
export async function checkAndUpdateContainers(): Promise<{
	checked: number;
	updated: number;
	errors: Array<{ id: string; error: string }>;
}> {
	const settings = await getSettings();

	// Skip if global auto-update is disabled
	if (!settings.autoUpdate) {
		return { checked: 0, updated: 0, errors: [] };
	}

	const containers = await listContainers();

	// Get detailed container info for each container to access labels
	const eligibleContainers: ServiceContainer[] = [];

	for (const container of containers) {
		// Skip containers that aren't running
		if (container.state !== 'running') continue;

		try {
			// Get detailed container info to access labels
			const containerDetails = await getContainer(container.id);

			// Check if auto-update label exists and is set to true
			if (containerDetails?.labels?.['arcane.auto-update'] === 'true') {
				eligibleContainers.push(container);
			}
		} catch (error) {
			console.error(`Error fetching container details for ${container.id}:`, error);
		}
	}

	const results = {
		checked: eligibleContainers.length,
		updated: 0,
		errors: [] as Array<{ id: string; error: string }>
	};

	// Process eligible containers
	for (const container of eligibleContainers) {
		const containerId = container.id; // Use consistent ID variable
		try {
			// Skip if already being updated
			if (updatingContainers.has(containerId)) {
				console.log(`Auto-update: Skipping ${container.name} (${containerId}), already in progress.`);
				continue;
			}

			const updateAvailable = await checkContainerImageUpdate(container);
			if (updateAvailable) {
				updatingContainers.add(containerId);
				console.log(`Auto-update: Update found for container ${container.name} (${containerId}). Recreating...`);

				// Pull the latest image first
				console.log(`Auto-update: Pulling latest image ${container.image} for ${container.name}...`);
				await pullImage(container.image);

				// Recreate the container using the new helper function
				await recreateContainer(containerId);

				console.log(`Auto-update: Container ${container.name} recreated successfully`);
				results.updated++;

				updatingContainers.delete(containerId);
			} else {
				console.log(`Auto-update: Container ${container.name} (${containerId}) is up-to-date.`);
			}
		} catch (error: any) {
			console.error(`Auto-update error for container ${containerId}:`, error);
			results.errors.push({
				id: containerId,
				error: error.message || 'Unknown error during auto-update'
			});
			// Ensure the lock is released even on error
			updatingContainers.delete(containerId);
		}
	}

	return results;
}

/**
 * Checks for stack updates and applies them if configured
 */
export async function checkAndUpdateStacks(): Promise<{
	checked: number;
	updated: number;
	errors: Array<{ id: string; error: string }>;
}> {
	const settings = await getSettings();

	// Skip if global auto-update is disabled
	if (!settings.autoUpdate) {
		return { checked: 0, updated: 0, errors: [] };
	}

	const stacks = await listStacks();
	const eligibleStacks = stacks.filter(
		(s) =>
			// Only consider running stacks with auto-update enabled
			(s.status === 'running' || s.status === 'partially running') && s.meta && s.meta.autoUpdate === true
	);

	const results = {
		checked: eligibleStacks.length,
		updated: 0,
		errors: [] as Array<{ id: string; error: string }>
	};

	// Process eligible stacks
	for (const stack of eligibleStacks) {
		try {
			// Skip if already being updated
			if (updatingStacks.has(stack.id)) continue;

			const updateAvailable = await checkStackImagesUpdate(stack);
			if (updateAvailable) {
				updatingStacks.add(stack.id);

				console.log(`Auto-update: Redeploying stack ${stack.name} (${stack.id})`);
				await fullyRedeployStack(stack.id);

				console.log(`Auto-update: Stack ${stack.name} redeployed successfully`);
				results.updated++;

				updatingStacks.delete(stack.id);
			}
		} catch (error: any) {
			console.error(`Auto-update error for stack ${stack.id}:`, error);
			results.errors.push({
				id: stack.id,
				error: error.message || 'Unknown error during auto-update'
			});
			updatingStacks.delete(stack.id);
		}
	}

	return results;
}

/**
 * Checks if a container's image has an update available
 */
async function checkContainerImageUpdate(container: ServiceContainer): Promise<boolean> {
	try {
		const imageRef = container.image;
		// Skip digest-only references (e.g. sha256:… – they can’t be updated by tag)
		if (/^sha256:[A-Fa-f0-9]{64}$/.test(imageRef)) {
			return false;
		}

		// Current image digest
		const currentImage = await getImage(container.imageId);
		if (!currentImage) return false;

		// Pull the image to check for updates (but don't use it yet)
		await pullImage(imageRef);

		// Get the fresh image info
		const lastColon = imageRef.lastIndexOf(':');
		const imageName = lastColon === -1 ? imageRef : imageRef.slice(0, lastColon);
		const tag = lastColon === -1 ? 'latest' : imageRef.slice(lastColon + 1);
		const freshImages = await listImages();
		const freshImage = freshImages.find((img) => (img.repo === imageName || img.repo.endsWith(`/${imageName}`)) && img.tag === tag);

		if (!freshImage) return false;

		// Compare image IDs - if different, update is available
		return freshImage.id !== container.imageId;
	} catch (error) {
		console.error(`Error checking for image update for ${container.name}:`, error);
		return false;
	}
}

/**
 * Checks if any images referenced in a stack's compose file have updates available.
 * Iterates through all images and returns true if at least one has a new digest.
 */
async function checkStackImagesUpdate(stack: Stack): Promise<boolean> {
	let updateFound = false; // Flag to track if any update is found

	try {
		const fullStack = await getStack(stack.id);
		if (!fullStack || !fullStack.composeContent) {
			console.warn(`Stack ${stack.name} (${stack.id}) compose content not found.`);
			return false;
		}

		// Extract image references from compose file (simplified parsing)
		const composeLines = fullStack.composeContent.split('\n');
		const imageLines = composeLines.filter((line) => line.trim().startsWith('image:') || line.includes(' image:'));

		if (imageLines.length === 0) {
			console.log(`No image references found in stack ${stack.name}.`);
			return false;
		}

		const imageRefs = imageLines
			.map((line) => {
				const imagePart = line.split('image:')[1].trim();
				// Handle potential comments or extra content on the line
				return imagePart.replace(/['"]/g, '').split(/[\s#]/)[0];
			})
			.filter((ref) => ref && (ref.includes(':') || ref.includes('/'))); // Filter out invalid/local refs

		const uniqueImageRefs = [...new Set(imageRefs)]; // Check each unique image only once
		console.log(`Checking images for stack ${stack.name}: ${uniqueImageRefs.join(', ')}`);

		// Check each unique image for updates
		for (const imageRef of uniqueImageRefs) {
			try {
				// 1. Get current image details (if it exists locally)
				let currentImageId: string | null = null;
				try {
					const currentImage = await getImage(imageRef);
					if (currentImage) {
						currentImageId = currentImage.Id; // Use the full ID (digest)
					}
				} catch (e: any) {
					// Ignore errors if image doesn't exist locally yet
					if (e.statusCode !== 404) {
						console.warn(`Could not get current details for image ${imageRef}: ${e.message}`);
					}
				}

				// 2. Pull the image to get the latest version
				console.log(`Pulling ${imageRef} to check for updates...`);
				await pullImage(imageRef); // This might throw if pull fails

				// 3. Get new image details after pull
				let newImageId: string | null = null;
				try {
					const newImage = await getImage(imageRef); // Get details of the potentially updated image
					if (newImage) {
						newImageId = newImage.Id;
					} else {
						console.warn(`Image ${imageRef} not found after pull.`);
						continue; // Skip if image disappeared after pull (unlikely)
					}
				} catch (e: any) {
					console.error(`Could not get details for image ${imageRef} after pull: ${e.message}`);
					continue; // Skip this image if we can't get its details
				}

				// 4. Compare IDs
				if (newImageId && newImageId !== currentImageId) {
					console.log(`Update found for image ${imageRef} in stack ${stack.name}. New ID: ${newImageId}, Old ID: ${currentImageId}`);
					updateFound = true;
					// Do NOT return early, continue checking other images
				} else {
					console.log(`Image ${imageRef} is up-to-date.`);
				}
			} catch (error: any) {
				console.error(`Error checking/pulling image update for ${imageRef} in stack ${stack.name}:`, error.message || error);
				// Continue checking other images even if one fails
			}
		} // End of loop through imageRefs

		return updateFound; // Return true only if at least one update was found
	} catch (error: any) {
		console.error(`Error processing stack updates for ${stack.name}:`, error.message || error);
		return false; // Return false if there's an error processing the stack itself
	}
}
