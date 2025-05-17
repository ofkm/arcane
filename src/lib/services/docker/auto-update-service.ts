import { listContainers, getContainer, recreateContainer } from './container-service';
import { listStacks, getStack, fullyRedeployStack } from './stack-service';
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
		return { checked: 0, updated: 0, errors: [] };
	}

	const containers = await listContainers();
	const eligibleContainers: ContainerInfo[] = [];

	for (const container of containers) {
		if (container.State !== 'running') continue;
		try {
			const containerDetails = await getContainer(container.Id);
			if (containerDetails?.Config.Labels?.['arcane.auto-update'] === 'true') {
				eligibleContainers.push(container);
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

	for (const container of eligibleContainers) {
		const containerId = container.Id;
		const containerName = container.Names && container.Names.length > 0 ? container.Names[0].substring(1) : containerId;
		try {
			if (updatingContainers.has(containerId)) {
				console.log(`Auto-update: Skipping ${containerName} (${containerId}), already in progress.`);
				continue;
			}

			const updateAvailable = await checkContainerImageUpdate(container);
			if (updateAvailable) {
				updatingContainers.add(containerId);
				console.log(`Auto-update: Update found for container ${containerName} (${containerId}). Recreating...`);
				console.log(`Auto-update: Pulling latest image ${container.Image} for ${containerName}...`);
				await pullImage(container.Image);
				await recreateContainer(containerId);
				console.log(`Auto-update: Container ${containerName} recreated successfully`);
				results.updated++;
				updatingContainers.delete(containerId);
			} else {
				console.log(`Auto-update: Container ${containerName} (${containerId}) is up-to-date.`);
			}
		} catch (error: unknown) {
			console.error(`Auto-update error for container ${containerId}:`, error);
			const msg = error instanceof Error ? error.message : String(error);
			results.errors.push({
				id: containerId,
				error: msg
			});
			updatingContainers.delete(containerId);
		}
	}

	return results;
}

export async function checkAndUpdateStacks(): Promise<{
	checked: number;
	updated: number;
	errors: Array<{ id: string; error: string }>;
}> {
	const settings = await getSettings();

	if (!settings.autoUpdate) {
		return { checked: 0, updated: 0, errors: [] };
	}

	const allListedStacks = await listStacks();
	const eligibleStacksForProcessing: Stack[] = [];

	for (const listedStack of allListedStacks) {
		if (listedStack.status !== 'running' && listedStack.status !== 'partially running') {
			continue;
		}
		try {
			const fullStack = await getStack(listedStack.id);
			if (!fullStack.composeContent) {
				console.warn(`Auto-update: Stack ${listedStack.id} has no compose content, skipping eligibility check.`);
				continue;
			}
			const composeData = yaml.load(fullStack.composeContent) as Record<string, unknown>;
			let stackIsEligibleByLabel = false;
			if (composeData && typeof composeData === 'object' && 'services' in composeData) {
				const services = (composeData as { services: Record<string, any> }).services;
				for (const serviceName in services) {
					const service = services[serviceName];
					if (service.labels) {
						let labelValue: string | undefined = undefined;
						if (Array.isArray(service.labels)) {
							const foundLabel = service.labels.find((l: string) => l.startsWith('arcane.stack.auto-update='));
							if (foundLabel) {
								labelValue = foundLabel.split('=')[1];
							}
						} else if (typeof service.labels === 'object' && service.labels !== null) {
							labelValue = service.labels['arcane.stack.auto-update'];
						}
						if (labelValue === 'true') {
							stackIsEligibleByLabel = true;
							break;
						}
					}
				}
			}
			if (stackIsEligibleByLabel) {
				eligibleStacksForProcessing.push(listedStack);
			}
		} catch (error) {
			console.error(`Auto-update: Error checking eligibility for stack ${listedStack.id}:`, error);
		}
	}

	const results = {
		checked: eligibleStacksForProcessing.length,
		updated: 0,
		errors: [] as Array<{ id: string; error: string }>
	};

	for (const stackToUpdate of eligibleStacksForProcessing) {
		try {
			if (updatingStacks.has(stackToUpdate.id)) {
				console.log(`Auto-update: Skipping stack ${stackToUpdate.name} (${stackToUpdate.id}), already in progress.`);
				continue;
			}
			const updateAvailable = await checkStackImagesUpdate(stackToUpdate);
			if (updateAvailable) {
				updatingStacks.add(stackToUpdate.id);
				console.log(`Auto-update: Redeploying stack ${stackToUpdate.name} (${stackToUpdate.id})`);
				await fullyRedeployStack(stackToUpdate.id);
				console.log(`Auto-update: Stack ${stackToUpdate.name} redeployed successfully`);
				results.updated++;
				updatingStacks.delete(stackToUpdate.id);
			} else {
				console.log(`Auto-update: Stack ${stackToUpdate.name} (${stackToUpdate.id}) is up-to-date or no images triggered an update.`);
			}
		} catch (error: unknown) {
			console.error(`Auto-update error for stack ${stackToUpdate.id}:`, error);
			const msg = error instanceof Error ? error.message : String(error);
			results.errors.push({
				id: stackToUpdate.id,
				error: msg
			});
			updatingStacks.delete(stackToUpdate.id);
		}
	}

	return results;
}

async function checkContainerImageUpdate(container: ContainerInfo): Promise<boolean> {
	const containerName = container.Names && container.Names.length > 0 ? container.Names[0].substring(1) : container.Id;
	try {
		const imageRef = container.Image;
		if (/^sha256:[A-Fa-f0-9]{64}$/.test(imageRef)) {
			console.log(`Auto-update: Skipping image check for ${containerName}, image is by digest: ${imageRef}`);
			return false;
		}
		const currentImage = await getImage(container.ImageID);
		if (!currentImage) {
			console.warn(`Auto-update: Current image details not found for ${containerName} (ImageID: ${container.ImageID})`);
			return false;
		}

		console.log(`Auto-update: Pulling image ${imageRef} for ${containerName} to check for updates...`);
		await pullImage(imageRef);

		const freshPulledImageDetails = await getImage(imageRef);
		if (!freshPulledImageDetails) {
			console.warn(`Auto-update: Image details for ${imageRef} not found after pull for ${containerName}.`);
			return false;
		}

		if (freshPulledImageDetails.Id !== container.ImageID) {
			console.log(`Auto-update: New image version found for ${containerName}. Current: ${container.ImageID}, New: ${freshPulledImageDetails.Id}`);
			return true;
		} else {
			console.log(`Auto-update: Image ${imageRef} for ${containerName} is already up-to-date (ID: ${container.ImageID}).`);
			return false;
		}
	} catch (error: unknown) {
		console.error(`Error checking for image update for ${containerName}:`, error);
		return false;
	}
}

async function checkStackImagesUpdate(stack: Stack): Promise<boolean> {
	let updateFound = false;
	try {
		const fullStack = await getStack(stack.id);
		if (!fullStack || !fullStack.composeContent) {
			console.warn(`Stack ${stack.name} (${stack.id}) compose content not found.`);
			return false;
		}
		const composeLines = fullStack.composeContent.split('\n');
		const imageLines = composeLines.filter((line) => line.trim().startsWith('image:') || line.includes(' image:'));
		if (imageLines.length === 0) {
			console.log(`No image references found in stack ${stack.name}.`);
			return false;
		}
		const imageRefs = imageLines
			.map((line) => {
				const imagePart = line.split('image:')[1].trim();
				return imagePart.replace(/['"]/g, '').split(/[\s#]/)[0];
			})
			.filter((ref) => ref && (ref.includes(':') || ref.includes('/')));
		const uniqueImageRefs = [...new Set(imageRefs)];
		console.log(`Checking images for stack ${stack.name}: ${uniqueImageRefs.join(', ')}`);
		for (const imageRef of uniqueImageRefs) {
			try {
				let currentImageId: string | null = null;
				try {
					const currentImage = await getImage(imageRef);
					if (currentImage) {
						currentImageId = currentImage.Id;
					}
				} catch (e: unknown) {
					if (e instanceof Error && 'statusCode' in e && (e as { statusCode?: number }).statusCode !== 404) {
						console.warn(`Could not get current details for image ${imageRef}: ${e.message}`);
					}
				}
				console.log(`Pulling ${imageRef} to check for updates...`);
				await pullImage(imageRef);
				let newImageId: string | null = null;
				try {
					const newImage = await getImage(imageRef);
					if (newImage) {
						newImageId = newImage.Id;
					} else {
						console.warn(`Image ${imageRef} not found after pull.`);
						continue;
					}
				} catch (e: unknown) {
					console.error(`Could not get details for image ${imageRef} after pull: ${e instanceof Error ? e.message : String(e)}`);
					continue;
				}
				if (newImageId && newImageId !== currentImageId) {
					console.log(`Update found for image ${imageRef} in stack ${stack.name}. New ID: ${newImageId}, Old ID: ${currentImageId}`);
					updateFound = true;
				} else {
					console.log(`Image ${imageRef} is up-to-date.`);
				}
			} catch (error: unknown) {
				console.error(`Error checking/pulling image update for ${imageRef} in stack ${stack.name}:`, error);
			}
		}
		return updateFound;
	} catch (error: unknown) {
		console.error(`Error processing stack updates for ${stack.name}:`, error);
		return false;
	}
}
