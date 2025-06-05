import { listContainers, getContainer, recreateContainer } from './container-service';
import { listStacks, getStack, redeployStack } from './stack-custom-service';
import { pullImage, getImage } from './image-service';
import { getSettings } from '../settings-service';
import yaml from 'js-yaml';
import type { Stack } from '$lib/types/docker/stack.type';
import type { ContainerInfo } from 'dockerode';

const updatingContainers = new Set<string>();
const updatingStacks = new Set<string>();

export async function checkAndUpdateContainers(): Promise<{
	checked: number;
	updated: number;
	errors: Array<{ id: string; error: string }>;
}> {
	const settings = await getSettings();

	if (!settings.autoUpdate) {
		console.log('Auto-update is disabled globally');
		return { checked: 0, updated: 0, errors: [] };
	}

	console.log('Starting container auto-update check...');
	const containers = await listContainers();
	const eligibleContainers: ContainerInfo[] = [];

	// Find containers with auto-update label
	for (const container of containers) {
		if (container.State !== 'running') continue;

		try {
			const containerDetails = await getContainer(container.Id);
			if (containerDetails?.Config?.Labels?.['arcane.auto-update'] === 'true') {
				eligibleContainers.push(container);
				console.log(`Container ${getContainerName(container)} is eligible for auto-update`);
			}
		} catch (error) {
			console.error(`Error fetching container details for ${container.Id}:`, error);
		}
	}

	const results = {
		checked: eligibleContainers.length,
		updated: 0,
		errors: [] as Array<{ id: string; error: string }>
	};

	console.log(`Found ${eligibleContainers.length} containers eligible for auto-update`);

	for (const container of eligibleContainers) {
		const containerId = container.Id;
		const containerName = getContainerName(container);

		try {
			if (updatingContainers.has(containerId)) {
				console.log(`Skipping ${containerName}, already updating`);
				continue;
			}

			updatingContainers.add(containerId);
			console.log(`Checking for updates: ${containerName}`);

			const updateAvailable = await checkContainerImageUpdate(container);
			if (updateAvailable) {
				console.log(`Update available for ${containerName}, recreating...`);
				await pullImage(container.Image);
				await recreateContainer(containerId);
				console.log(`Successfully updated ${containerName}`);
				results.updated++;
			} else {
				console.log(`${containerName} is up-to-date`);
			}
		} catch (error: unknown) {
			console.error(`Error updating container ${containerName}:`, error);
			const msg = error instanceof Error ? error.message : String(error);
			results.errors.push({ id: containerId, error: msg });
		} finally {
			updatingContainers.delete(containerId);
		}
	}

	console.log(`Container auto-update completed: ${results.updated}/${results.checked} updated`);
	return results;
}

export async function checkAndUpdateStacks(): Promise<{
	checked: number;
	updated: number;
	errors: Array<{ id: string; error: string }>;
}> {
	const settings = await getSettings();

	if (!settings.autoUpdate) {
		console.log('Auto-update is disabled globally');
		return { checked: 0, updated: 0, errors: [] };
	}

	console.log('Starting stack auto-update check...');
	const allStacks = await listStacks();
	const eligibleStacks: Stack[] = [];

	// Find stacks with auto-update label and that are running
	for (const stack of allStacks) {
		if (stack.status !== 'running' && stack.status !== 'partially running') {
			console.log(`Skipping stack ${stack.name} - not running (status: ${stack.status})`);
			continue;
		}

		try {
			const isEligible = await isStackEligibleForAutoUpdate(stack);
			if (isEligible) {
				eligibleStacks.push(stack);
				console.log(`Stack ${stack.name} is eligible for auto-update`);
			} else {
				console.log(`Stack ${stack.name} is not eligible for auto-update (no label found)`);
			}
		} catch (error) {
			console.error(`Error checking eligibility for stack ${stack.name}:`, error);
		}
	}

	const results = {
		checked: eligibleStacks.length,
		updated: 0,
		errors: [] as Array<{ id: string; error: string }>
	};

	console.log(`Found ${eligibleStacks.length} stacks eligible for auto-update`);

	for (const stack of eligibleStacks) {
		try {
			if (updatingStacks.has(stack.id)) {
				console.log(`Skipping stack ${stack.name}, already updating`);
				continue;
			}

			updatingStacks.add(stack.id);
			console.log(`Checking for updates: ${stack.name}`);

			const updateAvailable = await checkStackImagesUpdate(stack);
			if (updateAvailable) {
				console.log(`Updates available for stack ${stack.name}, redeploying...`);
				await redeployStack(stack.id);
				console.log(`Successfully redeployed stack ${stack.name}`);
				results.updated++;
			} else {
				console.log(`Stack ${stack.name} is up-to-date`);
			}
		} catch (error: unknown) {
			console.error(`Error updating stack ${stack.name}:`, error);
			const msg = error instanceof Error ? error.message : String(error);
			results.errors.push({ id: stack.id, error: msg });
		} finally {
			updatingStacks.delete(stack.id);
		}
	}

	console.log(`Stack auto-update completed: ${results.updated}/${results.checked} updated`);
	return results;
}

/**
 * Check if a stack is eligible for auto-update by looking for the label
 */
async function isStackEligibleForAutoUpdate(stack: Stack): Promise<boolean> {
	try {
		const fullStack = await getStack(stack.id);
		if (!fullStack?.composeContent) {
			console.warn(`Stack ${stack.name} has no compose content`);
			return false;
		}

		const composeData = yaml.load(fullStack.composeContent) as any;
		if (!composeData?.services) {
			console.warn(`Stack ${stack.name} has no services in compose file`);
			return false;
		}

		// Check each service for the auto-update label
		for (const [serviceName, service] of Object.entries(composeData.services)) {
			if (hasAutoUpdateLabel(service as any)) {
				console.log(`Found auto-update label in service ${serviceName} of stack ${stack.name}`);
				return true;
			}
		}

		return false;
	} catch (error) {
		console.error(`Error parsing compose file for stack ${stack.name}:`, error);
		return false;
	}
}

/**
 * Check if a service has the auto-update label
 */
function hasAutoUpdateLabel(service: any): boolean {
	if (!service?.labels) return false;

	// Handle array format: ["arcane.stack.auto-update=true"]
	if (Array.isArray(service.labels)) {
		return service.labels.some((label: string) => typeof label === 'string' && (label === 'arcane.stack.auto-update=true' || label.startsWith('arcane.stack.auto-update=true')));
	}

	// Handle object format: {"arcane.stack.auto-update": "true"}
	if (typeof service.labels === 'object' && service.labels !== null) {
		return service.labels['arcane.stack.auto-update'] === 'true' || service.labels['arcane.stack.auto-update'] === true;
	}

	return false;
}

/**
 * Check if container image has updates available
 */
async function checkContainerImageUpdate(container: ContainerInfo): Promise<boolean> {
	const containerName = getContainerName(container);

	try {
		const imageRef = container.Image;

		// Skip digest-based images
		if (/^sha256:[A-Fa-f0-9]{64}$/.test(imageRef)) {
			console.log(`Skipping ${containerName} - using digest-based image`);
			return false;
		}

		// Get current image details
		const currentImage = await getImage(container.ImageID);
		if (!currentImage) {
			console.warn(`Current image not found for ${containerName}`);
			return false;
		}

		console.log(`Pulling latest ${imageRef} for ${containerName}...`);
		await pullImage(imageRef);

		// Get updated image details
		const updatedImage = await getImage(imageRef);
		if (!updatedImage) {
			console.warn(`Updated image not found after pull for ${containerName}`);
			return false;
		}

		// Compare image IDs
		const hasUpdate = updatedImage.Id !== container.ImageID;
		if (hasUpdate) {
			console.log(`Update found for ${containerName}: ${container.ImageID} -> ${updatedImage.Id}`);
		}

		return hasUpdate;
	} catch (error) {
		console.error(`Error checking image update for ${containerName}:`, error);
		return false;
	}
}

/**
 * Check if stack images have updates available
 */
async function checkStackImagesUpdate(stack: Stack): Promise<boolean> {
	try {
		const fullStack = await getStack(stack.id);
		if (!fullStack?.composeContent) {
			console.warn(`No compose content for stack ${stack.name}`);
			return false;
		}

		const imageRefs = extractImageReferences(fullStack.composeContent);
		if (imageRefs.length === 0) {
			console.log(`No images found in stack ${stack.name}`);
			return false;
		}

		console.log(`Checking ${imageRefs.length} images for stack ${stack.name}: ${imageRefs.join(', ')}`);

		let updateFound = false;
		for (const imageRef of imageRefs) {
			try {
				// Skip digest-based images
				if (/^sha256:[A-Fa-f0-9]{64}$/.test(imageRef)) {
					console.log(`Skipping digest-based image: ${imageRef}`);
					continue;
				}

				const hasUpdate = await checkImageUpdate(imageRef);
				if (hasUpdate) {
					console.log(`Update found for image ${imageRef} in stack ${stack.name}`);
					updateFound = true;
					// Continue checking other images for logging purposes
				}
			} catch (error) {
				console.error(`Error checking image ${imageRef} in stack ${stack.name}:`, error);
			}
		}

		return updateFound;
	} catch (error) {
		console.error(`Error checking stack images for ${stack.name}:`, error);
		return false;
	}
}

/**
 * Extract image references from compose content
 */
function extractImageReferences(composeContent: string): string[] {
	try {
		const composeData = yaml.load(composeContent) as any;
		const images: string[] = [];

		if (composeData?.services) {
			for (const [serviceName, service] of Object.entries(composeData.services)) {
				const serviceObj = service as any;
				if (serviceObj?.image && typeof serviceObj.image === 'string') {
					images.push(serviceObj.image.trim());
				}
			}
		}

		return [...new Set(images)]; // Remove duplicates
	} catch (error) {
		console.error('Error parsing compose content for images:', error);
		return [];
	}
}

/**
 * Check if a single image has updates
 */
async function checkImageUpdate(imageRef: string): Promise<boolean> {
	try {
		// Get current image ID
		let currentImageId: string | null = null;
		try {
			const currentImage = await getImage(imageRef);
			currentImageId = currentImage?.Id || null;
		} catch (error) {
			// Image might not exist locally yet
			console.log(`Image ${imageRef} not found locally, will pull fresh`);
		}

		// Pull latest version
		console.log(`Pulling ${imageRef}...`);
		await pullImage(imageRef);

		// Get new image ID
		const newImage = await getImage(imageRef);
		if (!newImage) {
			console.warn(`Failed to get image details after pull: ${imageRef}`);
			return false;
		}

		// Compare IDs
		if (!currentImageId) {
			console.log(`New image pulled: ${imageRef}`);
			return true; // New image, consider it an update
		}

		const hasUpdate = newImage.Id !== currentImageId;
		if (hasUpdate) {
			console.log(`Image updated: ${imageRef} (${currentImageId} -> ${newImage.Id})`);
		} else {
			console.log(`Image up-to-date: ${imageRef}`);
		}

		return hasUpdate;
	} catch (error) {
		console.error(`Error checking image update for ${imageRef}:`, error);
		return false;
	}
}

/**
 * Get container name from container info
 */
function getContainerName(container: ContainerInfo): string {
	if (container.Names && container.Names.length > 0) {
		return container.Names[0].startsWith('/') ? container.Names[0].substring(1) : container.Names[0];
	}
	return container.Id.substring(0, 12);
}
