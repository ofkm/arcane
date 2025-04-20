import Docker from "dockerode";
import { getSettings } from "$lib/services/settings-service";
import type { DockerConnectionOptions } from "$lib/types/docker";

let dockerClient: Docker | null = null;
let dockerHost: string = "unix:///var/run/docker.sock"; // Default value

/**
 * Initialize Docker connection with the given options
 * @param options Docker connection options
 */
export function initializeDocker(options: DockerConnectionOptions): Docker {
  let connectionOpts: any = {};

  // Handle different connection types (socket, tcp, etc.)
  if (options.socketPath) {
    connectionOpts.socketPath = options.socketPath;
    dockerHost = options.socketPath;
  } else if (options.host && options.port) {
    connectionOpts.host = options.host;
    connectionOpts.port = options.port;
    dockerHost = `${options.host}:${options.port}`;

    if (options.ca || options.cert || options.key) {
      connectionOpts.ca = options.ca;
      connectionOpts.cert = options.cert;
      connectionOpts.key = options.key;
    }
  }

  dockerClient = new Docker(connectionOpts);
  return dockerClient;
}

/**
 * Update the Docker connection with a new host string
 * @param host Docker host connection string
 */
export function updateDockerConnection(host: string): void {
  try {
    // Only create a new connection if we have a valid host
    if (!host) {
      console.warn("No Docker host specified, connection not established");
      return;
    }

    console.log(`Connecting to Docker at ${host}`);
    let connectionOpts: any = {};

    // Parse the host string to determine connection type
    if (host.startsWith("unix://")) {
      // Unix socket connection - remove the unix:// prefix
      connectionOpts.socketPath = host.replace("unix://", "");
    } else if (host.startsWith("tcp://")) {
      // TCP connection (no TLS)
      const url = new URL(host);
      connectionOpts.host = url.hostname;
      connectionOpts.port = parseInt(url.port || "2375", 10);
    } else if (host.startsWith("https://")) {
      // HTTPS connection (TLS)
      const url = new URL(host);
      connectionOpts.host = url.hostname;
      connectionOpts.port = parseInt(url.port || "2376", 10);
      connectionOpts.protocol = "https";
    } else {
      // If it doesn't have a prefix, assume it's a direct socket path
      connectionOpts.socketPath = host;
    }

    dockerClient = new Docker(connectionOpts);
    dockerHost = host;
    console.log("Docker connection updated with options:", connectionOpts);
  } catch (error) {
    console.error("Error connecting to Docker:", error);
  }
}

/**
 * Get the Docker client instance. Initialize with default options if not already initialized.
 */
export function getDockerClient(): Docker {
  if (!dockerClient) {
    let connectionOpts: any = {};

    // Parse the dockerHost to get the proper connection options
    if (dockerHost.startsWith("unix://")) {
      connectionOpts.socketPath = dockerHost.replace("unix://", "");
    } else if (dockerHost.startsWith("tcp://")) {
      const url = new URL(dockerHost);
      connectionOpts.host = url.hostname;
      connectionOpts.port = parseInt(url.port || "2375", 10);
    } else if (dockerHost.startsWith("https://")) {
      const url = new URL(dockerHost);
      connectionOpts.host = url.hostname;
      connectionOpts.port = parseInt(url.port || "2376", 10);
      connectionOpts.protocol = "https";
    } else {
      // If it doesn't have a prefix, assume it's a direct socket path
      connectionOpts.socketPath = dockerHost;
    }

    dockerClient = new Docker(connectionOpts);
    console.log(
      `Initialized Docker client with host: ${dockerHost}`,
      connectionOpts
    );
  }
  return dockerClient;
}

/**
 * Test Docker connection
 * @returns Promise resolving to true if connection is successful
 */
export async function testDockerConnection(): Promise<boolean> {
  try {
    const docker = getDockerClient();
    const info = await docker.info();
    return !!info;
  } catch (err) {
    console.error("Docker connection test failed:", err);
    return false;
  }
}

/**
 * Get Docker system information
 */
export async function getDockerInfo() {
  const docker = getDockerClient();
  return await docker.info();
}

// Define and export the type returned by listContainers
export type ServiceContainer = {
  id: string;
  names: string[];
  name: string; // Your derived name
  image: string;
  imageId: string;
  command: string;
  created: number;
  state: string; // 'created', 'running', 'paused', 'restarting', 'removing', 'exited', 'dead'
  status: string; // e.g., "Up 2 hours"
  ports: Docker.Port[];
};

/**
 * Lists Docker containers.
 */
export async function listContainers(all = true): Promise<ServiceContainer[]> {
  try {
    const docker = getDockerClient();
    const containers = await docker.listContainers({ all });
    return containers.map(
      (c): ServiceContainer => ({
        id: c.Id,
        names: c.Names,
        name: c.Names[0]?.substring(1) || c.Id.substring(0, 12),
        image: c.Image,
        imageId: c.ImageID,
        command: c.Command,
        created: c.Created,
        state: c.State,
        status: c.Status,
        ports: c.Ports,
      })
    );
  } catch (error: any) {
    console.error("Docker Service: Error listing containers:", error);
    throw new Error(
      `Failed to list Docker containers using host "${dockerHost}".`
    );
  }
}

/**
 * Gets details for a specific container.
 */
export async function getContainer(containerId: string) {
  try {
    const docker = getDockerClient();
    const container = docker.getContainer(containerId);
    const inspectData = await container.inspect();
    return {
      id: inspectData.Id,
      name: inspectData.Name.substring(1),
      created: inspectData.Created,
      path: inspectData.Path,
      args: inspectData.Args,
      state: inspectData.State,
      image: inspectData.Image,
      config: inspectData.Config,
      networkSettings: inspectData.NetworkSettings,
      mounts: inspectData.Mounts,
    };
  } catch (error: any) {
    console.error(
      `Docker Service: Error getting container ${containerId}:`,
      error
    );
    if (error.statusCode === 404) {
      return null;
    }
    throw new Error(
      `Failed to get container details for ${containerId} using host "${dockerHost}".`
    );
  }
}

/**
 * Starts a specific container.
 * @param containerId - The ID of the container.
 */
export async function startContainer(containerId: string): Promise<void> {
  try {
    const docker = getDockerClient();
    const container = docker.getContainer(containerId);
    await container.start();
  } catch (error: any) {
    console.error(
      `Docker Service: Error starting container ${containerId}:`,
      error
    );
    throw new Error(
      `Failed to start container ${containerId} using host "${dockerHost}". ${
        error.message || ""
      }`
    );
  }
}

/**
 * Stops a specific container.
 * @param containerId - The ID of the container.
 */
export async function stopContainer(containerId: string): Promise<void> {
  try {
    const docker = getDockerClient();
    const container = docker.getContainer(containerId);
    await container.stop();
  } catch (error: any) {
    console.error(
      `Docker Service: Error stopping container ${containerId}:`,
      error
    );
    throw new Error(
      `Failed to stop container ${containerId} using host "${dockerHost}". ${
        error.message || ""
      }`
    );
  }
}

/**
 * Restarts a specific container.
 * @param containerId - The ID of the container.
 */
export async function restartContainer(containerId: string): Promise<void> {
  try {
    const docker = getDockerClient();
    const container = docker.getContainer(containerId);
    await container.restart();
  } catch (error: any) {
    console.error(
      `Docker Service: Error restarting container ${containerId}:`,
      error
    );
    throw new Error(
      `Failed to restart container ${containerId} using host "${dockerHost}". ${
        error.message || ""
      }`
    );
  }
}

/**
 * Removes a specific container.
 * @param containerId - The ID of the container.
 * @param force - Force removal even if running (default: false).
 */
export async function removeContainer(
  containerId: string,
  force = false
): Promise<void> {
  try {
    const docker = getDockerClient();
    const container = docker.getContainer(containerId);
    await container.remove({ force });
  } catch (error: any) {
    console.error(
      `Docker Service: Error removing container ${containerId}:`,
      error
    );
    if (error.statusCode === 404) {
      throw new Error(`Container ${containerId} not found.`);
    }
    if (error.statusCode === 409) {
      throw new Error(
        `Cannot remove running container ${containerId}. Stop it first or use force.`
      );
    }
    throw new Error(
      `Failed to remove container ${containerId} using host "${dockerHost}". ${
        error.message || ""
      }`
    );
  }
}

/**
 * Gets logs for a specific container.
 * @param containerId - The ID of the container.
 * @param options - Optional parameters for log retrieval
 */
export async function getContainerLogs(
  containerId: string,
  options: {
    tail?: number | "all";
    since?: number;
    until?: number;
    follow?: boolean;
    stdout?: boolean;
    stderr?: boolean;
  } = {}
): Promise<string> {
  try {
    const docker = getDockerClient();
    const container = docker.getContainer(containerId);

    const logOptions = {
      tail: options.tail === "all" ? undefined : options.tail || 100,
      stdout: options.stdout !== false,
      stderr: options.stderr !== false,
      timestamps: true,
      since: options.since || 0,
      until: options.until || undefined,
    };

    const logsBuffer =
      options.follow === true
        ? await container.logs({ ...logOptions, follow: true })
        : await container.logs({ ...logOptions, follow: false });
    let logString = logsBuffer.toString();

    if (logOptions.stdout || logOptions.stderr) {
      const lines = logString.split("\n");
      const processedLines = lines
        .map((line) => {
          if (!line) return "";
          if (line.length > 8) {
            return line.substring(8);
          }
          return line;
        })
        .filter(Boolean);

      logString = processedLines.join("\n");
    }

    return logString;
  } catch (error: any) {
    console.error(
      `Docker Service: Error getting logs for container ${containerId}:`,
      error
    );
    throw new Error(
      `Failed to get logs for container ${containerId} using host "${dockerHost}". ${
        error.message || ""
      }`
    );
  }
}

// Define and export the type returned by listImages
export type ServiceImage = {
  id: string;
  repoTags: string[] | undefined;
  repoDigests: string[] | undefined;
  created: number;
  size: number;
  virtualSize: number;
  labels: { [label: string]: string } | undefined;
  repo: string;
  tag: string;
};

/**
 * Lists Docker images.
 */
export async function listImages(): Promise<ServiceImage[]> {
  try {
    const docker = getDockerClient();
    const images = await docker.listImages({ all: false });

    const parseRepoTag = (
      tag: string | undefined
    ): { repo: string; tag: string } => {
      if (!tag || tag === "<none>:<none>") {
        return { repo: "<none>", tag: "<none>" };
      }
      const parts = tag.split(":");
      if (parts.length === 1) {
        return { repo: parts[0], tag: "latest" };
      }
      const tagPart = parts.pop() || "latest";
      const repoPart = parts.join(":");
      return { repo: repoPart, tag: tagPart };
    };

    return images.map((img): ServiceImage => {
      const { repo, tag } = parseRepoTag(img.RepoTags?.[0]);
      return {
        id: img.Id,
        repoTags: img.RepoTags,
        repoDigests: img.RepoDigests,
        created: img.Created,
        size: img.Size,
        virtualSize: img.VirtualSize,
        labels: img.Labels,
        repo: repo,
        tag: tag,
      };
    });
  } catch (error: any) {
    console.error("Docker Service: Error listing images:", error);
    throw new Error(`Failed to list Docker images using host "${dockerHost}".`);
  }
}

// Define and export the type returned by listNetworks
export type ServiceNetwork = {
  id: string;
  name: string;
  driver: string;
  scope: string;
  subnet: string | null;
  gateway: string | null;
  created: string;
};

/**
 * Lists Docker networks.
 */
export async function listNetworks(): Promise<ServiceNetwork[]> {
  try {
    const docker = getDockerClient();
    const networks = await docker.listNetworks();
    return networks.map(
      (net): ServiceNetwork => ({
        id: net.Id,
        name: net.Name,
        driver: net.Driver,
        scope: net.Scope,
        subnet: net.IPAM?.Config?.[0]?.Subnet ?? null,
        gateway: net.IPAM?.Config?.[0]?.Gateway ?? null,
        created: net.Created,
      })
    );
  } catch (error: any) {
    console.error("Docker Service: Error listing networks:", error);
    throw new Error(
      `Failed to list Docker networks using host "${dockerHost}".`
    );
  }
}

// Define and export the type returned by listVolumes
export type ServiceVolume = {
  name: string;
  driver: string;
  scope: string;
  mountpoint: string;
  labels: { [label: string]: string } | null;
};

/**
 * Lists Docker volumes.
 */
export async function listVolumes(): Promise<ServiceVolume[]> {
  try {
    const docker = getDockerClient();
    const volumeResponse = await docker.listVolumes();
    const volumes = volumeResponse.Volumes || [];

    return volumes.map(
      (vol): ServiceVolume => ({
        name: vol.Name,
        driver: vol.Driver,
        scope: vol.Scope,
        mountpoint: vol.Mountpoint,
        labels: vol.Labels,
      })
    );
  } catch (error: any) {
    console.error("Docker Service: Error listing volumes:", error);
    throw new Error(
      `Failed to list Docker volumes using host "${dockerHost}".`
    );
  }
}

export default getDockerClient;
