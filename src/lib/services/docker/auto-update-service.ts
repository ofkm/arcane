import { listContainers, getContainer, restartContainer } from './container-service';
import { listStacks, getStack, fullyRedeployStack } from './stack-service';
import { pullImage, getImage } from './image-service';
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
		try {
			// Skip if already being updated
			if (updatingContainers.has(container.id)) continue;

			const updateAvailable = await checkContainerImageUpdate(container);
			if (updateAvailable) {
				updatingContainers.add(container.id);

				console.log(`Auto-update: Updating container ${container.name} (${container.id})`);
				await pullImage(container.image);
				await restartContainer(container.id);

				console.log(`Auto-update: Container ${container.name} updated successfully`);
				results.updated++;

				updatingContainers.delete(container.id);
			}
		} catch (error: any) {
			console.error(`Auto-update error for container ${container.id}:`, error);
			results.errors.push({
				id: container.id,
				error: error.message || 'Unknown error during auto-update'
			});
			updatingContainers.delete(container.id);
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

		// Skip images with no repository or tag (like sha256:...)
		if (!imageRef.includes(':') && !imageRef.includes('/')) {
			return false;
		}

		// Current image digest
		const currentImage = await getImage(container.imageId);
		if (!currentImage) return false;

		// Pull the image to check for updates (but don't use it yet)
		await pullImage(imageRef);

		// Get the fresh image info
		const [imageName, tag] = imageRef.includes(':') ? imageRef.split(':') : [imageRef, 'latest'];
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
 * Checks if any images in a stack have updates available
 */
async function checkStackImagesUpdate(stack: Stack): Promise<boolean> {
	try {
		const fullStack = await getStack(stack.id);
		if (!fullStack || !fullStack.composeContent) return false;

		// Extract image references from compose file
		const composeLines = fullStack.composeContent.split('\n');
		const imageLines = composeLines.filter((line) => line.trim().startsWith('image:') || line.includes(' image:'));

		if (imageLines.length === 0) return false;

		// Extract image names
		const imageRefs = imageLines.map((line) => {
			const imagePart = line.split('image:')[1].trim();
			return imagePart.replace(/['"]/g, '').split(' ')[0];
		});

		// Check each image for updates
		for (const imageRef of imageRefs) {
			try {
				// Skip images with no repository or tag (like sha256:...)
				if (!imageRef.includes(':') && !imageRef.includes('/')) {
					continue;
				}

				// Pull the image to check for updates
				await pullImage(imageRef);

				// For simplicity, if we successfully pulled a new image, we'll consider it an update
				// A more sophisticated implementation would compare image digests
				return true;
			} catch (error) {
				console.error(`Error checking image update for ${imageRef}:`, error);
				// Continue with other images even if one fails
			}
		}

		return false;
	} catch (error) {
		console.error(`Error checking for stack updates for ${stack.name}:`, error);
		return false;
	}
}

// Helper function to properly import
import { listImages } from './image-service';
