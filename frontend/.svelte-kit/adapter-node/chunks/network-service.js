import { g as getDockerClient, d as dockerHost } from "./core.js";
import { C as ConflictError, D as DockerApiError, N as NotFoundError } from "./errors.js";
import { D as DEFAULT_NETWORK_NAMES } from "./constants.js";
async function listNetworks() {
  try {
    const docker = await getDockerClient();
    const networks = await docker.listNetworks();
    return networks;
  } catch (error) {
    console.error("Docker Service: Error listing networks:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list Docker networks using host "${dockerHost}". ${errorMessage}`);
  }
}
async function getNetwork(networkId) {
  try {
    const docker = await getDockerClient();
    const network = docker.getNetwork(networkId);
    const inspectInfo = await network.inspect();
    console.log(`Docker Service: Inspected network "${networkId}" successfully.`);
    return inspectInfo;
  } catch (error) {
    console.error(`Docker Service: Error inspecting network "${networkId}":`, error);
    const err = error;
    if (err.statusCode === 404) {
      throw new NotFoundError(`Network "${networkId}" not found.`);
    }
    if (err.statusCode === 500 && (networkId === "bridge" || networkId === "host" || networkId === "none")) {
      throw new NotFoundError(`Cannot inspect built-in network "${networkId}" by name, use ID if available.`);
    }
    throw new DockerApiError(`Failed to inspect network "${networkId}": ${err.message || err.reason || "Unknown Docker error"}`, err.statusCode);
  }
}
async function removeNetwork(networkId) {
  try {
    if (DEFAULT_NETWORK_NAMES.has(networkId)) {
      throw new ConflictError(`Network "${networkId}" is managed by Docker and cannot be removed.`);
    }
    const docker = await getDockerClient();
    const network = docker.getNetwork(networkId);
    await network.remove();
    console.log(`Docker Service: Network "${networkId}" removed successfully.`);
  } catch (error) {
    console.error(`Docker Service: Error removing network "${networkId}":`, error);
    const err = error;
    if (err.statusCode === 404) {
      throw new NotFoundError(`Network "${networkId}" not found.`);
    }
    if (err.statusCode === 409 || err.reason && err.reason.includes("active endpoints")) {
      throw new ConflictError(`Network "${networkId}" has active endpoints (containers connected). Disconnect containers before removal.`);
    }
    if (err.statusCode === 403 || err.reason && err.reason.includes("predefined network")) {
      throw new ConflictError(`Cannot remove predefined network "${networkId}".`);
    }
    throw new DockerApiError(`Failed to remove network "${networkId}": ${err.message || err.reason || "Unknown Docker error"}`, err.statusCode);
  }
}
async function createNetwork(options) {
  try {
    const docker = await getDockerClient();
    console.log(`Docker Service: Creating network "${options.Name}"...`, options);
    const network = await docker.createNetwork(options);
    const inspectInfo = await network.inspect();
    console.log(`Docker Service: Network "${options.Name}" (ID: ${inspectInfo.Id}) created successfully.`);
    return inspectInfo;
  } catch (error) {
    console.error(`Docker Service: Error creating network "${options.Name}":`, error);
    const err = error;
    if (err.statusCode === 409) {
      throw new ConflictError(`Network "${options.Name}" may already exist or conflict with an existing configuration.`);
    }
    const errorMessage = err.message || err.reason || "Unknown error during network creation.";
    throw new DockerApiError(`Failed to create network "${options.Name}" using host "${dockerHost}". ${errorMessage}`, err.statusCode);
  }
}
export {
  createNetwork as c,
  getNetwork as g,
  listNetworks as l,
  removeNetwork as r
};
