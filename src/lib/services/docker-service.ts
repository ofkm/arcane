import Docker from "dockerode";
import type { VolumeInspectInfo, VolumeCreateOptions } from "dockerode";
import type { NetworkInspectInfo, NetworkCreateOptions } from "dockerode"; // Add NetworkCreateOptions
import { getSettings } from "$lib/services/settings-service";
import type {
  DockerConnectionOptions,
  ContainerConfig,
  ContainerDetails,
  ContainerCreate,
} from "$lib/types/docker";

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
 * Retrieves logs from a specific Docker container.
 *
 * @param containerId - The ID of the container to fetch logs from.
 * @param options - Optional log retrieval settings, including tail count, time range, streaming, and output selection.
 * @returns The container logs as a string, with Docker stream headers removed.
 *
 * @throws {Error} If log retrieval fails for the specified container.
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

/**
 * Creates and starts a new Docker container using the specified configuration.
 *
 * @param config - The container configuration, including image, environment variables, ports, volumes, restart policy, and network.
 * @returns An object containing the created container's ID, name, state, status, and creation timestamp.
 *
 * @throws {Error} If the container cannot be created or started.
 */
export async function createContainer(config: ContainerConfig) {
  try {
    const docker = getDockerClient();

    const containerOptions: ContainerCreate = {
      name: config.name,
      Image: config.image,
      Env: config.envVars?.map((env) => `${env.key}=${env.value}`) || [],
      Labels: config.labels || {},
      Cmd: config.command,
      User: config.user,
      Healthcheck: config.healthcheck
        ? {
            Test: config.healthcheck.Test,
            Interval: config.healthcheck.Interval,
            Timeout: config.healthcheck.Timeout,
            Retries: config.healthcheck.Retries,
            StartPeriod: config.healthcheck.StartPeriod,
          }
        : undefined,
      HostConfig: {
        RestartPolicy: {
          Name: config.restart || "no",
        },
        Memory: config.memoryLimit,
        NanoCpus: config.cpuLimit
          ? Math.round(config.cpuLimit * 1_000_000_000)
          : undefined,
      },
    };

    // Set up port bindings if provided
    if (config.ports && config.ports.length > 0) {
      containerOptions.ExposedPorts = {};
      containerOptions.HostConfig = containerOptions.HostConfig || {};
      containerOptions.HostConfig.PortBindings = {};

      config.ports.forEach((port) => {
        const containerPort = `${port.containerPort}/tcp`;
        containerOptions.ExposedPorts![containerPort] = {};
        containerOptions.HostConfig!.PortBindings![containerPort] = [
          { HostPort: port.hostPort },
        ];
      });
    }

    // Set up volume mounts if provided
    if (config.volumes && config.volumes.length > 0) {
      containerOptions.HostConfig = containerOptions.HostConfig || {};
      containerOptions.HostConfig.Binds = config.volumes.map(
        (vol) => `${vol.source}:${vol.target}${vol.readOnly ? ":ro" : ""}`
      );
    }

    // Set up network if provided
    if (config.network) {
      containerOptions.HostConfig = containerOptions.HostConfig || {};
      if (!containerOptions.NetworkingConfig) {
        containerOptions.HostConfig.NetworkMode = config.network;
      }

      if (
        config.networkConfig &&
        config.network !== "host" &&
        config.network !== "none" &&
        config.network !== "bridge"
      ) {
        containerOptions.NetworkingConfig = {
          EndpointsConfig: {
            [config.network]: {
              IPAMConfig: {
                IPv4Address: config.networkConfig.ipv4Address || undefined,
                IPv6Address: config.networkConfig.ipv6Address || undefined,
              },
            },
          },
        };
        delete containerOptions.HostConfig.NetworkMode;
      }
    }

    // Create and start the container
    const container = await docker.createContainer(containerOptions);
    await container.start();

    // Get the container details
    const containerInfo = await container.inspect();

    return {
      id: containerInfo.Id,
      name: containerInfo.Name.substring(1),
      state: containerInfo.State.Status,
      status: containerInfo.State.Running ? "running" : "stopped",
      created: containerInfo.Created,
    };
  } catch (error: any) {
    console.error("Error creating container:", error);
    if (error.message && error.message.includes("IPAMConfig")) {
      throw new Error(
        `Failed to create container: Invalid IP address configuration for network "${config.network}". ${error.message}`
      );
    }
    // Add more specific error handling for resource limits if needed
    if (error.message && error.message.includes("NanoCpus")) {
      throw new Error(`Invalid CPU limit specified: ${error.message}`);
    }
    if (error.message && error.message.includes("Memory")) {
      throw new Error(`Invalid Memory limit specified: ${error.message}`);
    }
    throw new Error(
      `Failed to create container with image "${config.image}": ${error.message}`
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

/**
 * Removes a Docker image.
 * @param imageId - The ID or name of the image to remove.
 * @param force - Whether to force removal (default: false).
 */
export async function removeImage(
  imageId: string,
  force: boolean = false
): Promise<void> {
  try {
    const docker = getDockerClient();
    const image = docker.getImage(imageId);
    await image.remove({ force });
    console.log(`Docker Service: Image "${imageId}" removed successfully.`);
  } catch (error: any) {
    console.error(`Docker Service: Error removing image "${imageId}":`, error);
    if (error.statusCode === 409) {
      throw new Error(
        `Image "${imageId}" is being used by a container. Use force option to remove.`
      );
    }
    throw new Error(
      `Failed to remove image "${imageId}" using host "${dockerHost}". ${
        error.message || error.reason || ""
      }`
    );
  }
}

/**
 * Check if an image is used by any container
 * @param imageId The image ID or reference to check
 * @returns Boolean indicating if the image is in use
 */
export async function isImageInUse(imageId: string): Promise<boolean> {
  try {
    const docker = getDockerClient();
    const containers = await docker.listContainers({ all: true });

    // Look for containers using this image
    return containers.some(
      (container) =>
        container.ImageID === imageId || container.Image === imageId
    );
  } catch (error) {
    console.error(`Error checking if image ${imageId} is in use:`, error);
    // Default to assuming it's in use for safety
    return true;
  }
}

/**
 * Prunes unused Docker images.
 * @param mode - Mode of pruning ('all' or 'dangling').
 * @returns Information about reclaimed space.
 */
export async function pruneImages(mode: "all" | "dangling" = "all"): Promise<{
  ImagesDeleted: Docker.ImageRemoveInfo[] | null;
  SpaceReclaimed: number;
}> {
  try {
    const docker = getDockerClient();
    const filterValue = mode === "all" ? "false" : "true";
    const logMessage =
      mode === "all"
        ? "Pruning all unused images (docker image prune -a)..."
        : "Pruning dangling images (docker image prune)...";

    console.log(`Docker Service: ${logMessage}`);

    const pruneOptions = {
      filters: { dangling: [filterValue] },
    };

    const result = await docker.pruneImages(pruneOptions); // Use the options object

    console.log(
      `Docker Service: Image prune complete. Space reclaimed: ${result.SpaceReclaimed}`
    );
    return result;
  } catch (error: any) {
    console.error("Docker Service: Error pruning images:", error);
    throw new Error(
      `Failed to prune images using host "${dockerHost}". ${
        error.message || error.reason || ""
      }`
    );
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

/**
 * Removes a Docker network.
 * @param networkId - The ID or name of the network to remove.
 */
export async function removeNetwork(networkId: string): Promise<void> {
  try {
+    const DEFAULT_NETWORKS = new Set(["host", "bridge", "none", "ingress"]);
+    if (DEFAULT_NETWORKS.has(networkId)) {
+      throw new Error(`Network "${networkId}" is managed by Docker and cannot be removed.`);
+    }
    const docker = getDockerClient();
    const network = docker.getNetwork(networkId);
    await network.remove();
    console.log(`Docker Service: Network "${networkId}" removed successfully.`);
  } catch (error: any) {
    console.error(
      `Docker Service: Error removing network "${networkId}":`,
      error
    );
    if (error.statusCode === 404) {
      throw new Error(`Network "${networkId}" not found.`);
    }
    if (error.statusCode === 409) {
      // 409 Conflict usually means it's in use or predefined
      throw new Error(
        `Network "${networkId}" cannot be removed (possibly in use or predefined).`
      );
    }
    throw new Error(
      `Failed to remove network "${networkId}" using host "${dockerHost}". ${
        error.message || error.reason || ""
      }`
    );
  }
}

/**
 * Creates a Docker network.
 * @param options - Options for creating the network (e.g., Name, Driver, Labels, CheckDuplicate, Internal, IPAM).
 */
export async function createNetwork(
  options: NetworkCreateOptions
): Promise<NetworkInspectInfo> {
  try {
    const docker = getDockerClient();
    console.log(
      `Docker Service: Creating network "${options.Name}"...`,
      options
    );

    // Dockerode's createNetwork returns the Network object, we need to inspect it after creation
    const network = await docker.createNetwork(options);

    // Inspect the newly created network to get full details
    const inspectInfo = await network.inspect();

    console.log(
      `Docker Service: Network "${options.Name}" (ID: ${inspectInfo.Id}) created successfully.`
    );
    return inspectInfo; // Return the detailed inspect info
  } catch (error: any) {
    console.error(
      `Docker Service: Error creating network "${options.Name}":`,
      error
    );
    // Check for specific Docker errors
    if (error.statusCode === 409) {
      // Could be duplicate name if CheckDuplicate was true, or other conflicts
      throw new Error(
        `Network "${options.Name}" may already exist or conflict with an existing configuration.`
      );
    }
    throw new Error(
      `Failed to create network "${options.Name}" using host "${dockerHost}". ${
        error.message || error.reason || ""
      }`
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

/**
 * Check if a volume is in use by any container
 * @param volumeName The name of the volume to check
 * @returns Boolean indicating if the volume is in use
 */
export async function isVolumeInUse(volumeName: string): Promise<boolean> {
  try {
    const docker = getDockerClient();
    const containers = await docker.listContainers({ all: true });

    // Inspect each container to check its mounts
    for (const containerInfo of containers) {
      const container = docker.getContainer(containerInfo.Id);
      const details = await container.inspect();

      // Check if any mount points to our volume
      const volumeMounts = details.Mounts.filter(
        (mount) => mount.Type === "volume" && mount.Name === volumeName
      );

      if (volumeMounts.length > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`Error checking if volume ${volumeName} is in use:`, error);
    // Default to assuming it's in use for safety
    return true;
  }
}

/**
 * Creates a Docker volume.
 * @param options - Options for creating the volume (e.g., Name, Driver, Labels).
 */
export async function createVolume(options: VolumeCreateOptions): Promise<any> {
  try {
    const docker = getDockerClient();
    // createVolume returns the volume data directly - no need to inspect
    const volume = await docker.createVolume(options);

    console.log(
      `Docker Service: Volume "${options.Name}" created successfully.`
    );

    // Return the creation response which contains basic info
    return {
      Name: volume.Name,
      Driver: volume.Driver,
      Mountpoint: volume.Mountpoint,
      Labels: volume.Labels || {},
      Scope: volume.Scope || "local",
      CreatedAt: new Date().toISOString(), // Since inspect would give us this
    };
  } catch (error: any) {
    console.error(
      `Docker Service: Error creating volume "${options.Name}":`,
      error
    );
    // Check for specific Docker errors, like volume already exists (often 409)
    if (error.statusCode === 409) {
      throw new Error(`Volume "${options.Name}" already exists.`);
    }
    throw new Error(
      `Failed to create volume "${options.Name}" using host "${dockerHost}". ${
        error.message || error.reason || "" // Include reason if available
      }`
    );
  }
}

/**
 * Removes a Docker volume.
 * @param name - The name of the volume to remove.
 * @param force - Whether to force removal if the volume is in use.
 */
export async function removeVolume(
  name: string,
  force: boolean = false
): Promise<void> {
  try {
    const docker = getDockerClient();
    const volume = docker.getVolume(name);
    await volume.remove({ force });
    console.log(`Docker Service: Volume "${name}" removed successfully.`);
  } catch (error: any) {
    console.error(`Docker Service: Error removing volume "${name}":`, error);
    if (error.statusCode === 409) {
      throw new Error(
        `Volume "${name}" is in use by a container. Use force option to remove.`
      );
    }
    throw new Error(
      `Failed to remove volume "${name}" using host "${dockerHost}". ${
        error.message || error.reason || ""
      }`
    );
  }
}

/**
 * Pulls a Docker image from a registry.
 * @param imageRef - The image reference to pull (e.g., 'nginx:latest')
 * @param platform - Optional platform specification (e.g., 'linux/amd64')
 */
export async function pullImage(
  imageRef: string,
  platform?: string
): Promise<void> {
  try {
    const docker = getDockerClient();

    const pullOptions: any = {};
    if (platform) {
      pullOptions.platform = platform;
    }

    console.log(`Docker Service: Pulling image "${imageRef}"...`);

    // Pull the image - this returns a stream
    const stream = await docker.pull(imageRef, pullOptions);

    // Wait for the pull to complete by consuming the stream
    await new Promise((resolve, reject) => {
      docker.modem.followProgress(stream, (err: any, output: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(output);
        }
      });
    });

    console.log(`Docker Service: Image "${imageRef}" pulled successfully.`);
  } catch (error: any) {
    console.error(`Docker Service: Error pulling image "${imageRef}":`, error);

    // Handle specific error cases
    if (error.statusCode === 404) {
      throw new Error(`Image "${imageRef}" not found in registry.`);
    }

    throw new Error(
      `Failed to pull image "${imageRef}". ${
        error.message || error.reason || ""
      }`
    );
  }
}

export default getDockerClient;
