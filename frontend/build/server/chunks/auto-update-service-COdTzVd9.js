import { l as listContainers, g as getContainer, f as recreateContainer } from './container-service-m5_StWPI.js';
import { listStacks, redeployStack, getStack } from './stack-custom-service-5Y1e9SF0.js';
import { p as pullImage, g as getImage } from './image-service-CL2WzxPP.js';
import { g as getSettings } from './settings-service-B1w8bfJq.js';
import yaml from 'js-yaml';

const updatingContainers = /* @__PURE__ */ new Set();
const updatingStacks = /* @__PURE__ */ new Set();
async function checkAndUpdateContainers() {
  const settings = await getSettings();
  if (!settings.autoUpdate) {
    console.log("Auto-update is disabled globally");
    return { checked: 0, updated: 0, errors: [] };
  }
  console.log("Starting container auto-update check...");
  const containers = await listContainers();
  const eligibleContainers = [];
  for (const container of containers) {
    if (container.State !== "running") continue;
    try {
      const containerDetails = await getContainer(container.Id);
      if (containerDetails?.Config?.Labels?.["arcane.auto-update"] === "true") {
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
    errors: []
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
    } catch (error) {
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
async function checkAndUpdateStacks() {
  const settings = await getSettings();
  if (!settings.autoUpdate) {
    console.log("Auto-update is disabled globally");
    return { checked: 0, updated: 0, errors: [] };
  }
  console.log("Starting stack auto-update check...");
  const allStacks = await listStacks();
  const eligibleStacks = [];
  for (const stack of allStacks) {
    if (stack.status !== "running" && stack.status !== "partially running") {
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
    errors: []
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
    } catch (error) {
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
async function isStackEligibleForAutoUpdate(stack) {
  try {
    const fullStack = await getStack(stack.id);
    if (!fullStack?.composeContent) {
      console.warn(`Stack ${stack.name} has no compose content`);
      return false;
    }
    const composeData = yaml.load(fullStack.composeContent);
    if (!composeData?.services) {
      console.warn(`Stack ${stack.name} has no services in compose file`);
      return false;
    }
    for (const [serviceName, service] of Object.entries(composeData.services)) {
      if (hasAutoUpdateLabel(service)) {
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
function hasAutoUpdateLabel(service) {
  if (!service?.labels) return false;
  if (Array.isArray(service.labels)) {
    return service.labels.some((label) => typeof label === "string" && (label === "arcane.stack.auto-update=true" || label.startsWith("arcane.stack.auto-update=true")));
  }
  if (typeof service.labels === "object" && service.labels !== null) {
    return service.labels["arcane.stack.auto-update"] === "true" || service.labels["arcane.stack.auto-update"] === true;
  }
  return false;
}
async function checkContainerImageUpdate(container) {
  const containerName = getContainerName(container);
  try {
    const imageRef = container.Image;
    if (/^sha256:[A-Fa-f0-9]{64}$/.test(imageRef)) {
      console.log(`Skipping ${containerName} - using digest-based image`);
      return false;
    }
    const currentImage = await getImage(container.ImageID);
    if (!currentImage) {
      console.warn(`Current image not found for ${containerName}`);
      return false;
    }
    console.log(`Pulling latest ${imageRef} for ${containerName}...`);
    await pullImage(imageRef);
    const updatedImage = await getImage(imageRef);
    if (!updatedImage) {
      console.warn(`Updated image not found after pull for ${containerName}`);
      return false;
    }
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
async function checkStackImagesUpdate(stack) {
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
    console.log(`Checking ${imageRefs.length} images for stack ${stack.name}: ${imageRefs.join(", ")}`);
    let updateFound = false;
    for (const imageRef of imageRefs) {
      try {
        if (/^sha256:[A-Fa-f0-9]{64}$/.test(imageRef)) {
          console.log(`Skipping digest-based image: ${imageRef}`);
          continue;
        }
        const hasUpdate = await checkImageUpdate(imageRef);
        if (hasUpdate) {
          console.log(`Update found for image ${imageRef} in stack ${stack.name}`);
          updateFound = true;
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
function extractImageReferences(composeContent) {
  try {
    const composeData = yaml.load(composeContent);
    const images = [];
    if (composeData?.services) {
      for (const [serviceName, service] of Object.entries(composeData.services)) {
        const serviceObj = service;
        if (serviceObj?.image && typeof serviceObj.image === "string") {
          images.push(serviceObj.image.trim());
        }
      }
    }
    return [...new Set(images)];
  } catch (error) {
    console.error("Error parsing compose content for images:", error);
    return [];
  }
}
async function checkImageUpdate(imageRef) {
  try {
    let currentImageId = null;
    try {
      const currentImage = await getImage(imageRef);
      currentImageId = currentImage?.Id || null;
    } catch (error) {
      console.log(`Image ${imageRef} not found locally, will pull fresh`);
    }
    console.log(`Pulling ${imageRef}...`);
    await pullImage(imageRef);
    const newImage = await getImage(imageRef);
    if (!newImage) {
      console.warn(`Failed to get image details after pull: ${imageRef}`);
      return false;
    }
    if (!currentImageId) {
      console.log(`New image pulled: ${imageRef}`);
      return true;
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
function getContainerName(container) {
  if (container.Names && container.Names.length > 0) {
    return container.Names[0].startsWith("/") ? container.Names[0].substring(1) : container.Names[0];
  }
  return container.Id.substring(0, 12);
}

export { checkAndUpdateStacks as a, checkAndUpdateContainers as c };
//# sourceMappingURL=auto-update-service-COdTzVd9.js.map
