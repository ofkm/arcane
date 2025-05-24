import { listContainers, getContainer, recreateContainer } from './container-service';
import { listStacks, getStack } from './stack-service';
import { redeployStack } from './stack-custom-service';
import { pullImage, getImage } from './image-service';
import { getSettings } from '../settings-service';
import yaml from 'js-yaml';
import type { Stack } from '$lib/types/docker/stack.type';
import type { ContainerInfo } from 'dockerode';

// ==================== TYPES & CONSTANTS ====================

interface UpdateResult {
	checked: number;
	updated: number;
	errors: Array<{ id: string; error: string }>;
}

interface ImageUpdateCheck {
	imageRef: string;
	currentImageId: string | null;
	newImageId: string | null;
	hasUpdate: boolean;
}

// ==================== STATE MANAGEMENT ====================

const updatingContainers = new Set<string>();
const updatingStacks = new Set<string>();

// ==================== UTILITY FUNCTIONS ====================

/**
 * Checks if auto-update is enabled in settings
 */
async function isAutoUpdateEnabled(): Promise<boolean> {
	const settings = await getSettings();
	return settings.autoUpdate;
}

/**
 * Safely extracts container name from container info
 */
function getContainerName(container: ContainerInfo): string {
	return container.Names && container.Names.length > 0 ? container.Names[0].substring(1) : container.Id;
}

/**
 * Checks if an image reference is a digest (SHA256)
 */
function isImageDigest(imageRef: string): boolean {
	return /^sha256:[A-Fa-f0-9]{64}$/.test(imageRef);
}

/**
 * Extracts image references from compose content
 */
function extractImageReferences(composeContent: string): string[] {
	const composeLines = composeContent.split('\n');
	const imageLines = composeLines.filter((line) => line.trim().startsWith('image:') || line.includes(' image:'));

	if (imageLines.length === 0) {
		return [];
	}

	const imageRefs = imageLines
		.map((line) => {
			const imagePart = line.split('image:')[1]?.trim();
			if (!imagePart) return '';
			return imagePart.replace(/['"]/g, '').split(/[\s#]/)[0];
		})
		.filter((ref) => ref && (ref.includes(':') || ref.includes('/')));

	return [...new Set(imageRefs)]; // Remove duplicates
}

/**
 * Safely handles errors and returns a standardized error message
 */
function handleError(error: unknown, context: string): string {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`${context}:`, error);
	return message;
}

// ==================== CONTAINER ELIGIBILITY ====================

/**
 * Checks if a container is eligible for auto-update
 */
async function isContainerEligible(container: ContainerInfo): Promise<boolean> {
	if (container.State !== 'running') {
		return false;
	}

	try {
		const containerDetails = await getContainer(container.Id);
		return containerDetails?.Config.Labels?.['arcane.auto-update'] === 'true';
	} catch (error) {
		console.error(`Error fetching container details for ${container.Id}:`, error);
		return false;
	}
}

/**
 * Gets all containers eligible for auto-update
 */
async function getEligibleContainers(): Promise<ContainerInfo[]> {
	const containers = await listContainers();
	const eligibleContainers: ContainerInfo[] = [];

	for (const container of containers) {
		if (await isContainerEligible(container)) {
			eligibleContainers.push(container);
		}
	}

	return eligibleContainers;
}

// ==================== STACK ELIGIBILITY ====================

/**
 * Checks if a stack service has auto-update enabled
 */
function isServiceAutoUpdateEnabled(service: any): boolean {
	if (!service.labels) {
		return false;
	}

	let labelValue: string | undefined = undefined;

	if (Array.isArray(service.labels)) {
		const foundLabel = service.labels.find((l: string) => l.startsWith('arcane.stack.auto-update='));
		if (foundLabel) {
			labelValue = foundLabel.split('=')[1];
		}
	} else if (typeof service.labels === 'object' && service.labels !== null) {
		labelValue = service.labels['arcane.stack.auto-update'];
	}

	return labelValue === 'true';
}

/**
 * Checks if a stack is eligible for auto-update
 */
async function isStackEligible(stack: Stack): Promise<boolean> {
	if (stack.status !== 'running' && stack.status !== 'partially running') {
		return false;
	}

	try {
		const fullStack = await getStack(stack.id);
		if (!fullStack?.composeContent) {
			console.warn(`Auto-update: Stack ${stack.id} has no compose content, skipping eligibility check.`);
			return false;
		}

		const composeData = yaml.load(fullStack.composeContent) as Record<string, unknown>;

		if (!composeData || typeof composeData !== 'object' || !('services' in composeData)) {
			return false;
		}

		const services = (composeData as { services: Record<string, any> }).services;

		// Check if any service has auto-update enabled
		for (const serviceName in services) {
			const service = services[serviceName];
			if (isServiceAutoUpdateEnabled(service)) {
				return true;
			}
		}

		return false;
	} catch (error) {
		console.error(`Auto-update: Error checking eligibility for stack ${stack.id}:`, error);
		return false;
	}
}

/**
 * Gets all stacks eligible for auto-update
 */
async function getEligibleStacks(): Promise<Stack[]> {
	const allStacks = await listStacks();
	const eligibleStacks: Stack[] = [];

	for (const stack of allStacks) {
		if (await isStackEligible(stack)) {
			eligibleStacks.push(stack);
		}
	}

	return eligibleStacks;
}

// ==================== IMAGE UPDATE CHECKING ====================

/**
 * Checks if a container image has an update available
 */
async function checkContainerImageUpdate(container: ContainerInfo): Promise<boolean> {
	const containerName = getContainerName(container);

	try {
		const imageRef = container.Image;

		// Skip digest-based images
		if (isImageDigest(imageRef)) {
			console.log(`Auto-update: Skipping image check for ${containerName}, image is by digest: ${imageRef}`);
			return false;
		}

		// Get current image details
		const currentImage = await getImage(container.ImageID);
		if (!currentImage) {
			console.warn(`Auto-update: Current image details not found for ${containerName} (ImageID: ${container.ImageID})`);
			return false;
		}

		// Pull latest image
		console.log(`Auto-update: Pulling image ${imageRef} for ${containerName} to check for updates...`);
		await pullImage(imageRef);

		// Get fresh image details
		const freshImage = await getImage(imageRef);
		if (!freshImage) {
			console.warn(`Auto-update: Image details for ${imageRef} not found after pull for ${containerName}.`);
			return false;
		}

		// Compare image IDs
		const hasUpdate = freshImage.Id !== container.ImageID;

		if (hasUpdate) {
			console.log(`Auto-update: New image version found for ${containerName}. Current: ${container.ImageID}, New: ${freshImage.Id}`);
		} else {
			console.log(`Auto-update: Image ${imageRef} for ${containerName} is already up-to-date (ID: ${container.ImageID}).`);
		}

		return hasUpdate;
	} catch (error) {
		console.error(`Error checking for image update for ${containerName}:`, error);
		return false;
	}
}

/**
 * Checks a single image for updates
 */
async function checkSingleImageUpdate(imageRef: string, stackName: string): Promise<ImageUpdateCheck> {
	const result: ImageUpdateCheck = {
		imageRef,
		currentImageId: null,
		newImageId: null,
		hasUpdate: false
	};

	try {
		// Get current image ID
		try {
			const currentImage = await getImage(imageRef);
			if (currentImage) {
				result.currentImageId = currentImage.Id;
			}
		} catch (error: any) {
			// Only warn if it's not a 404 (image not found locally)
			if (error.statusCode !== 404) {
				console.warn(`Could not get current details for image ${imageRef}: ${error.message}`);
			}
		}

		// Pull latest image
		console.log(`Pulling ${imageRef} to check for updates...`);
		await pullImage(imageRef);

		// Get new image ID
		try {
			const newImage = await getImage(imageRef);
			if (newImage) {
				result.newImageId = newImage.Id;
			} else {
				console.warn(`Image ${imageRef} not found after pull.`);
				return result;
			}
		} catch (error) {
			console.error(`Could not get details for image ${imageRef} after pull: ${error instanceof Error ? error.message : String(error)}`);
			return result;
		}

		// Check for updates
		if (result.newImageId && result.newImageId !== result.currentImageId) {
			console.log(`Update found for image ${imageRef} in stack ${stackName}. New ID: ${result.newImageId}, Old ID: ${result.currentImageId}`);
			result.hasUpdate = true;
		} else {
			console.log(`Image ${imageRef} is up-to-date.`);
		}
	} catch (error) {
		console.error(`Error checking/pulling image update for ${imageRef} in stack ${stackName}:`, error);
	}

	return result;
}

/**
 * Checks if any images in a stack have updates available
 */
async function checkStackImagesUpdate(stack: Stack): Promise<boolean> {
	try {
		const fullStack = await getStack(stack.id);
		if (!fullStack?.composeContent) {
			console.warn(`Stack ${stack.name} (${stack.id}) compose content not found.`);
			return false;
		}

		// Extract image references from compose content
		const imageRefs = extractImageReferences(fullStack.composeContent);

		if (imageRefs.length === 0) {
			console.log(`No image references found in stack ${stack.name}.`);
			return false;
		}

		console.log(`Checking images for stack ${stack.name}: ${imageRefs.join(', ')}`);

		// Check each image for updates
		let updateFound = false;
		for (const imageRef of imageRefs) {
			const updateCheck = await checkSingleImageUpdate(imageRef, stack.name);
			if (updateCheck.hasUpdate) {
				updateFound = true;
			}
		}

		return updateFound;
	} catch (error) {
		console.error(`Error processing stack updates for ${stack.name}:`, error);
		return false;
	}
}

// ==================== UPDATE OPERATIONS ====================

/**
 * Updates a single container
 */
async function updateContainer(container: ContainerInfo): Promise<void> {
	const containerId = container.Id;
	const containerName = getContainerName(container);

	if (updatingContainers.has(containerId)) {
		console.log(`Auto-update: Skipping ${containerName} (${containerId}), already in progress.`);
		return;
	}

	try {
		updatingContainers.add(containerId);

		const updateAvailable = await checkContainerImageUpdate(container);
		if (!updateAvailable) {
			console.log(`Auto-update: Container ${containerName} (${containerId}) is up-to-date.`);
			return;
		}

		console.log(`Auto-update: Update found for container ${containerName} (${containerId}). Recreating...`);
		console.log(`Auto-update: Pulling latest image ${container.Image} for ${containerName}...`);

		await pullImage(container.Image);
		await recreateContainer(containerId);

		console.log(`Auto-update: Container ${containerName} recreated successfully`);
	} finally {
		updatingContainers.delete(containerId);
	}
}

/**
 * Updates a single stack
 */
async function updateStack(stack: Stack): Promise<void> {
	if (updatingStacks.has(stack.id)) {
		console.log(`Auto-update: Skipping stack ${stack.name} (${stack.id}), already in progress.`);
		return;
	}

	try {
		updatingStacks.add(stack.id);

		const updateAvailable = await checkStackImagesUpdate(stack);
		if (!updateAvailable) {
			console.log(`Auto-update: Stack ${stack.name} (${stack.id}) is up-to-date or no images triggered an update.`);
			return;
		}

		console.log(`Auto-update: Redeploying stack ${stack.name} (${stack.id})`);
		await redeployStack(stack.id);
		console.log(`Auto-update: Stack ${stack.name} redeployed successfully`);
	} finally {
		updatingStacks.delete(stack.id);
	}
}

// ==================== MAIN EXPORTED FUNCTIONS ====================

/**
 * Checks and updates all eligible containers
 */
export async function checkAndUpdateContainers(): Promise<UpdateResult> {
	if (!(await isAutoUpdateEnabled())) {
		return { checked: 0, updated: 0, errors: [] };
	}

	const eligibleContainers = await getEligibleContainers();
	const results: UpdateResult = {
		checked: eligibleContainers.length,
		updated: 0,
		errors: []
	};

	for (const container of eligibleContainers) {
		const containerId = container.Id;
		const containerName = getContainerName(container);

		try {
			await updateContainer(container);

			// Check if container was actually updated (not skipped)
			if (!updatingContainers.has(containerId)) {
				const updateWasAvailable = await checkContainerImageUpdate(container);
				if (updateWasAvailable) {
					results.updated++;
				}
			}
		} catch (error) {
			const errorMessage = handleError(error, `Auto-update error for container ${containerId}`);
			results.errors.push({
				id: containerId,
				error: errorMessage
			});
		}
	}

	return results;
}

/**
 * Checks and updates all eligible stacks
 */
export async function checkAndUpdateStacks(): Promise<UpdateResult> {
	if (!(await isAutoUpdateEnabled())) {
		return { checked: 0, updated: 0, errors: [] };
	}

	const eligibleStacks = await getEligibleStacks();
	const results: UpdateResult = {
		checked: eligibleStacks.length,
		updated: 0,
		errors: []
	};

	for (const stack of eligibleStacks) {
		try {
			const hadUpdate = await checkStackImagesUpdate(stack);
			await updateStack(stack);

			// Only increment if there was actually an update available
			if (hadUpdate && !updatingStacks.has(stack.id)) {
				results.updated++;
			}
		} catch (error) {
			const errorMessage = handleError(error, `Auto-update error for stack ${stack.id}`);
			results.errors.push({
				id: stack.id,
				error: errorMessage
			});
		}
	}

	return results;
}
