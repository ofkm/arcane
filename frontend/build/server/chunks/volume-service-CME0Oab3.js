import { a as getDockerClient, d as dockerHost } from './core-C8NMHkc_.js';
import { C as ConflictError, D as DockerApiError, N as NotFoundError } from './errors-BtZyvX-k.js';

async function listVolumes() {
  try {
    const docker = await getDockerClient();
    const volumeResponse = await docker.listVolumes();
    return volumeResponse.Volumes || [];
  } catch (error) {
    console.error("Docker Service: Error listing volumes:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list Docker volumes using host "${dockerHost}". ${errorMessage}`);
  }
}
async function isVolumeInUse(volumeName) {
  try {
    const docker = await getDockerClient();
    const containers = await docker.listContainers({ all: true });
    for (const containerInfo of containers) {
      const details = await docker.getContainer(containerInfo.Id).inspect();
      if (details.Mounts?.some((m) => m.Type === "volume" && m.Name === volumeName)) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(`Error checking if volume ${volumeName} is in use:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to check if volume ${volumeName} is in use: ${errorMessage}`);
  }
}
async function getVolume(volumeName) {
  try {
    const docker = await getDockerClient();
    const volume = docker.getVolume(volumeName);
    const inspectInfo = await volume.inspect();
    console.log(`Docker Service: Inspected volume "${volumeName}" successfully.`);
    return inspectInfo;
  } catch (error) {
    console.error(`Docker Service: Error inspecting volume "${volumeName}":`, error);
    if (error.statusCode === 404) {
      throw new NotFoundError(`Volume "${volumeName}" not found.`);
    }
    const errorMessage = error.message || error.reason || "Unknown Docker error";
    throw new DockerApiError(`Failed to inspect volume "${volumeName}": ${errorMessage}`, error.statusCode);
  }
}
async function createVolume(options) {
  try {
    const docker = await getDockerClient();
    const volumeInfo = await docker.createVolume(options);
    console.log(`Docker Service: Volume "${options.Name}" created successfully.`);
    return volumeInfo;
  } catch (error) {
    console.error(`Docker Service: Error creating volume "${options.Name}":`, error);
    if (error.statusCode === 409) {
      throw new ConflictError(`Volume "${options.Name}" already exists.`);
    }
    const errorMessage = error.message || error.reason || "Unknown Docker error";
    throw new DockerApiError(`Failed to create volume "${options.Name}" using host "${dockerHost}". ${errorMessage}`, error.statusCode);
  }
}
async function removeVolume(name, force = false) {
  try {
    const docker = await getDockerClient();
    const volume = docker.getVolume(name);
    await volume.remove({ force });
    console.log(`Docker Service: Volume "${name}" removed successfully (force=${force}).`);
  } catch (error) {
    console.error(`Docker Service: Error removing volume "${name}" (force=${force}):`, error);
    if (error.statusCode === 404) {
      throw new NotFoundError(`Volume "${name}" not found.`);
    }
    if (error.statusCode === 409) {
      throw new ConflictError(`Volume "${name}" is in use. Use the force option to remove if necessary.`);
    }
    const errorMessage = error.message || error.reason || "Unknown Docker error";
    throw new DockerApiError(`Failed to remove volume "${name}": ${errorMessage}`, error.statusCode);
  }
}

export { createVolume as c, getVolume as g, isVolumeInUse as i, listVolumes as l, removeVolume as r };
//# sourceMappingURL=volume-service-CME0Oab3.js.map
