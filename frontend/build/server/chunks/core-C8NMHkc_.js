import Docker from 'dockerode';
import { g as getSettings } from './settings-service-B1w8bfJq.js';

let dockerClient = null;
let dockerHost = "unix:///var/run/docker.sock";
async function getDockerInfo() {
  const docker = await getDockerClient();
  return await docker.info();
}
async function getDockerClient() {
  if (!dockerClient) {
    console.log("Docker client is null, attempting to initialize.");
    let hostToUse = dockerHost;
    try {
      const currentSettings = await getSettings();
      if (currentSettings?.dockerHost) {
        hostToUse = currentSettings.dockerHost;
        console.log(`Fetched dockerHost from settings: "${hostToUse}"`);
      } else {
        console.log("No dockerHost found in settings, will use current module dockerHost or default.");
      }
    } catch (err) {
      console.error("Failed to get settings for Docker client initialization, using fallback:", err);
    }
    console.log(`Initializing Docker client with host: "${hostToUse}".`);
    const connectionOpts = createConnectionOptions(hostToUse);
    try {
      dockerClient = new Docker(connectionOpts);
      dockerHost = hostToUse;
      console.log(`Docker client initialized successfully with host: ${dockerHost}`, connectionOpts);
    } catch (initError) {
      console.error(`Failed to initialize Docker client with host ${hostToUse}:`, initError);
      dockerClient = null;
      dockerHost = "unix:///var/run/docker.sock";
      throw initError;
    }
  }
  if (!dockerClient) {
    console.error("PANIC: Docker client is still null after initialization attempt without throwing error.");
    throw new Error("Failed to obtain Docker client instance.");
  }
  return dockerClient;
}
function updateDockerConnection(newHost) {
  try {
    if (!newHost) {
      console.warn("No Docker host specified for updateDockerConnection, connection not established");
      return;
    }
    if (newHost === dockerHost && dockerClient !== null) {
      console.log(`Docker host for updateDockerConnection (${newHost}) is the same as current and client exists. No update forced.`);
      return;
    }
    console.log(`updateDockerConnection called. Forcing connection update to Docker at ${newHost}`);
    const connectionOpts = createConnectionOptions(newHost);
    dockerClient = new Docker(connectionOpts);
    dockerHost = newHost;
    console.log("Docker connection explicitly updated with options:", connectionOpts);
  } catch (error) {
    console.error(`Error explicitly updating Docker connection to ${newHost}:`, error);
    dockerClient = null;
  }
}
async function testDockerConnection() {
  try {
    const docker = await getDockerClient();
    const info = await docker.info();
    return !!info;
  } catch (err) {
    console.error("Docker connection test failed:", err);
    return false;
  }
}
function createConnectionOptions(host) {
  const connectionOpts = {};
  if (host.startsWith("unix://")) {
    connectionOpts.socketPath = host.replace("unix://", "");
  } else if (host.startsWith("tcp://")) {
    const url = new URL(host);
    connectionOpts.host = url.hostname;
    connectionOpts.port = Number.parseInt(url.port || "2375", 10);
  } else if (host.startsWith("https://")) {
    const url = new URL(host);
    connectionOpts.host = url.hostname;
    connectionOpts.port = Number.parseInt(url.port || "2376", 10);
    connectionOpts.protocol = "https";
  } else {
    connectionOpts.socketPath = host;
  }
  return connectionOpts;
}

export { getDockerClient as a, dockerHost as d, getDockerInfo as g, testDockerConnection as t, updateDockerConnection as u };
//# sourceMappingURL=core-C8NMHkc_.js.map
