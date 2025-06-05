import { a as getDockerClient, d as dockerHost } from './core-C8NMHkc_.js';
import { C as ConflictError, N as NotFoundError, D as DockerApiError } from './errors-BtZyvX-k.js';

const containerCache = /* @__PURE__ */ new Map();
const CONTAINER_CACHE_TTL = 15e3;
function invalidateContainerCache(containerId) {
  if (containerId) {
    containerCache.delete(`container-${containerId}`);
  }
  containerCache.delete("list-containers-all");
  containerCache.delete("list-containers-running");
}
async function listContainers(all = true) {
  const cacheKey = `list-containers-${all ? "all" : "running"}`;
  const cachedData = containerCache.get(cacheKey);
  if (cachedData && Date.now() - cachedData.timestamp < CONTAINER_CACHE_TTL) {
    return cachedData.data;
  }
  try {
    const docker = await getDockerClient();
    const containersData = await docker.listContainers({ all });
    containerCache.set(cacheKey, {
      data: containersData,
      timestamp: Date.now()
    });
    return containersData;
  } catch (error) {
    console.error("Docker Service: Error listing containers:", error);
    throw new Error(`Failed to list Docker containers using host "${dockerHost}".`);
  }
}
async function getContainer(containerId) {
  const cacheKey = `container-${containerId}`;
  const cachedData = containerCache.get(cacheKey);
  if (cachedData && Date.now() - cachedData.timestamp < CONTAINER_CACHE_TTL) {
    return cachedData.data;
  }
  try {
    const docker = await getDockerClient();
    const container = docker.getContainer(containerId);
    const inspectData = await container.inspect();
    containerCache.set(cacheKey, {
      data: inspectData,
      timestamp: Date.now()
    });
    return inspectData;
  } catch (error) {
    console.error(`Docker Service: Error getting container ${containerId}:`, error);
    if (error instanceof Error && "statusCode" in error && error.statusCode === 404) {
      return null;
    }
    throw new Error(`Failed to get container details for ${containerId} using host "${dockerHost}".`);
  }
}
async function startContainer(containerId) {
  try {
    const docker = await getDockerClient();
    const container = docker.getContainer(containerId);
    await container.start();
    invalidateContainerCache(containerId);
  } catch (error) {
    console.error(`Docker Service: Error starting container ${containerId}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to start container ${containerId} using host "${dockerHost}". ${errorMessage}`);
  }
}
async function stopContainer(containerId) {
  try {
    const docker = await getDockerClient();
    const container = docker.getContainer(containerId);
    await container.stop();
    invalidateContainerCache(containerId);
  } catch (error) {
    console.error(`Docker Service: Error stopping container ${containerId}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to stop container ${containerId} using host "${dockerHost}". ${errorMessage}`);
  }
}
async function restartContainer(containerId) {
  try {
    const docker = await getDockerClient();
    const container = docker.getContainer(containerId);
    await container.restart();
    invalidateContainerCache(containerId);
  } catch (error) {
    console.error(`Docker Service: Error restarting container ${containerId}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to restart container ${containerId} using host "${dockerHost}". ${errorMessage}`);
  }
}
async function removeContainer(containerId, force = false) {
  try {
    const docker = await getDockerClient();
    const container = docker.getContainer(containerId);
    await container.remove({ force });
    invalidateContainerCache(containerId);
    console.log(`Docker Service: Container ${containerId} removed successfully (force=${force}).`);
  } catch (error) {
    console.error(`Docker Service: Error removing container ${containerId} (force=${force}):`, error);
    if (error instanceof Error && "statusCode" in error) {
      const dockerError = error;
      if (dockerError.statusCode === 404) {
        throw new NotFoundError(`Container ${containerId} not found.`);
      }
      if (dockerError.statusCode === 409) {
        throw new ConflictError(`Cannot remove running container ${containerId}. Stop it first or use the force option.`);
      }
      throw new DockerApiError(`Failed to remove container ${containerId}: ${dockerError.message || "Unknown Docker error"}`, dockerError.statusCode);
    }
    throw new DockerApiError(`Failed to remove container ${containerId}: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}
async function getContainerLogs(containerId, options = {}) {
  try {
    const docker = await getDockerClient();
    const container = docker.getContainer(containerId);
    const logOptions = {
      tail: options.tail === "all" ? void 0 : options.tail || 100,
      stdout: options.stdout !== false,
      stderr: options.stderr !== false,
      timestamps: true,
      since: options.since || 0,
      until: options.until || void 0
    };
    const logsBuffer = options.follow === true ? await container.logs({ ...logOptions, follow: true }) : await container.logs({ ...logOptions, follow: false });
    let logString = logsBuffer.toString();
    if (logOptions.stdout || logOptions.stderr) {
      const lines = logString.split("\n");
      const processedLines = lines.map((line) => {
        if (!line) return "";
        if (line.length > 8) {
          return line.substring(8);
        }
        return line;
      }).filter(Boolean);
      logString = processedLines.join("\n");
    }
    return logString;
  } catch (error) {
    console.error(`Docker Service: Error getting logs for container ${containerId}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get logs for container ${containerId} using host "${dockerHost}". ${errorMessage}`);
  }
}
async function createContainer(config) {
  try {
    const docker = await getDockerClient();
    const containerOptions = { ...config };
    const container = await docker.createContainer(containerOptions);
    await container.start();
    const containerInfo = await container.inspect();
    invalidateContainerCache();
    return {
      id: containerInfo.Id,
      name: containerInfo.Name.substring(1),
      // Docker names often start with /
      state: containerInfo.State.Status,
      status: containerInfo.State.Running ? "running" : "stopped",
      created: containerInfo.Created
    };
  } catch (error) {
    console.error("Error creating container:", error);
    const imageName = config.Image || "unknown image";
    const containerName = config.name || "unnamed container";
    if (error instanceof Error) {
      const errorMessage = error.message || "";
      if (errorMessage.includes("IPAMConfig")) {
        throw new Error(`Failed to create container: Invalid IP address configuration. ${errorMessage}`);
      }
      if (errorMessage.includes("NanoCpus")) {
        throw new Error(`Invalid CPU limit specified: ${errorMessage}`);
      }
      if (errorMessage.includes("Memory")) {
        throw new Error(`Invalid Memory limit specified: ${errorMessage}`);
      }
      if (errorMessage.toLowerCase().includes("name is already in use by container") || error.statusCode === 409) {
        throw new ConflictError(`Failed to create container: The name "${containerName}" is already in use.`);
      }
      throw new Error(`Failed to create container with image "${imageName}": ${errorMessage}`);
    }
    throw new Error(`Failed to create container with image "${imageName}": Unknown error`);
  }
}
async function getContainerStats(containerId) {
  try {
    const docker = await getDockerClient();
    const container = docker.getContainer(containerId);
    try {
      await container.inspect();
    } catch (inspectError) {
      if (inspectError instanceof Error && "statusCode" in inspectError && inspectError.statusCode === 404) {
        throw new NotFoundError(`Container ${containerId} not found when trying to get stats.`);
      }
      throw inspectError;
    }
    const stats = await container.stats({ stream: false });
    if (!stats || !stats.memory_stats || !stats.cpu_stats) {
      console.warn(`Docker Service: Received incomplete stats for container ${containerId}. It might not be running.`);
      return null;
    }
    return stats;
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      const dockerError = error;
      if (dockerError.statusCode === 404) {
        console.warn(`Docker Service: Container ${containerId} not found or not running when fetching stats.`);
        return null;
      }
      if (dockerError.statusCode === 500 && dockerError.message?.includes("is not running")) {
        console.warn(`Docker Service: Container ${containerId} is not running when fetching stats.`);
        return null;
      }
    }
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error(`Docker Service: Error getting stats for container ${containerId}:`, error);
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : String(error);
    throw new DockerApiError(`Failed to get stats for container ${containerId}: ${message || "Unknown Docker error"}`, statusCode);
  }
}
async function recreateContainer(containerId) {
  const docker = await getDockerClient();
  let originalContainer = null;
  try {
    console.log(`Recreating container ${containerId}: Fetching original config...`);
    originalContainer = await getContainer(containerId);
    if (!originalContainer) {
      throw new DockerApiError(`Container ${containerId} not found for recreation.`, 404);
    }
    const createOptions = {
      name: originalContainer.Name?.substring(1),
      Image: originalContainer.Config?.Image,
      Env: originalContainer.Config?.Env,
      Labels: originalContainer.Config?.Labels,
      ExposedPorts: originalContainer.Config?.ExposedPorts,
      HostConfig: {
        PortBindings: originalContainer.HostConfig?.PortBindings || {},
        NetworkMode: originalContainer.HostConfig?.NetworkMode || (originalContainer.NetworkSettings?.Networks?.bridge ? "bridge" : Object.keys(originalContainer.NetworkSettings?.Networks || {})[0] || void 0),
        Binds: originalContainer.HostConfig?.Binds || originalContainer.Mounts?.filter((mount) => mount.Type === "bind" || mount.Type === "volume").map((mount) => `${mount.Source}:${mount.Destination}${mount.RW ? "" : ":ro"}`),
        RestartPolicy: originalContainer.HostConfig?.RestartPolicy,
        Memory: originalContainer.HostConfig?.Memory,
        NanoCpus: originalContainer.HostConfig?.NanoCpus
      },
      Cmd: originalContainer.Config?.Cmd,
      Entrypoint: originalContainer.Config?.Entrypoint,
      WorkingDir: originalContainer.Config?.WorkingDir,
      User: originalContainer.Config?.User,
      Volumes: originalContainer.Config?.Volumes,
      Tty: originalContainer.Config?.Tty,
      OpenStdin: originalContainer.Config?.OpenStdin,
      StdinOnce: originalContainer.Config?.StdinOnce
    };
    if (originalContainer.NetworkSettings?.Networks && createOptions.HostConfig) {
      const networks = Object.entries(originalContainer.NetworkSettings.Networks);
      if (networks.length > 0 && networks[0][0] !== "bridge" && createOptions.HostConfig.NetworkMode !== networks[0][0]) {
        const [networkName, networkConfigValue] = networks[0];
        const networkConfig = networkConfigValue;
        if (createOptions.HostConfig.NetworkMode !== networkName) {
          createOptions.HostConfig.NetworkMode = networkName;
        }
        if (networkConfig.IPAMConfig?.IPv4Address) {
          createOptions.NetworkingConfig = {
            EndpointsConfig: {
              [networkName]: {
                IPAMConfig: {
                  IPv4Address: networkConfig.IPAMConfig.IPv4Address
                }
              }
            }
          };
        }
      }
    }
    try {
      console.log(`Recreating container ${containerId}: Stopping...`);
      await stopContainer(containerId);
    } catch (stopError) {
      if (stopError instanceof Error && "statusCode" in stopError && stopError.statusCode !== 304 && stopError.statusCode !== 404) {
        console.warn(`Could not stop container ${containerId} before removal: ${stopError instanceof Error ? stopError.message : "Unknown error"}`);
      }
    }
    console.log(`Recreating container ${containerId}: Removing...`);
    await removeContainer(containerId, true);
    console.log(`Recreating container ${containerId}: Creating new container with image ${createOptions.Image}...`);
    const newContainer = await docker.createContainer(createOptions);
    console.log(`Recreating container ${containerId}: Starting new container ${newContainer.id}...`);
    await startContainer(newContainer.id);
    invalidateContainerCache();
    console.log(`Recreating container ${containerId}: Successfully recreated and started as ${newContainer.id}.`);
    const allContainers = await listContainers(true);
    const newServiceContainer = allContainers.find((c) => c.Id === newContainer.id);
    if (!newServiceContainer) {
      throw new Error(`Container ${newContainer.id} was created but not found in container list`);
    }
    return newServiceContainer;
  } catch (error) {
    console.error(`Failed to recreate container ${containerId}:`, error);
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : String(error);
    throw new DockerApiError(`Failed to recreate container ${originalContainer?.Name?.substring(1) || containerId}: ${message || "Unknown error"}`, statusCode);
  }
}

export { getContainerLogs as a, getContainerStats as b, createContainer as c, stopContainer as d, restartContainer as e, recreateContainer as f, getContainer as g, listContainers as l, removeContainer as r, startContainer as s };
//# sourceMappingURL=container-service-m5_StWPI.js.map
