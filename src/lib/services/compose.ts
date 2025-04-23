import { promises as fs } from "fs";
import { join } from "path";
import DockerodeCompose from "dockerode-compose";
import { getDockerClient } from "./docker-service";
import { nanoid } from "nanoid";
import type {
  Stack,
  StackMeta,
  StackService,
  StackUpdate,
} from "$lib/types/stack";
import yaml from "js-yaml";
import { getSettings, ensureStacksDirectory } from "./settings-service";

// This will be populated on initialization
let STACKS_DIR = "";

/**
 * Initialize the compose service with settings
 * This should be called at app startup
 */
export async function initComposeService(): Promise<void> {
  try {
    // Get settings to initialize the stacks directory
    const settings = await getSettings();
    STACKS_DIR = settings.stacksDirectory;
    console.log(`Stacks directory initialized: ${STACKS_DIR}`);

    // Ensure the directory exists
    await ensureStacksDir();
  } catch (err) {
    console.error("Error initializing compose service:", err);
    // We'll initialize again when needed in other functions
  }
}

/**
 * Update the stacks directory path - used when settings are updated
 * @param {string} directory New stacks directory path
 */
export function updateStacksDirectory(directory: string): void {
  if (directory) {
    STACKS_DIR = directory;
    console.log(`Stacks directory updated to: ${STACKS_DIR}`);
  }
}

/**
 * Ensure stacks directory exists and return the path
 */
async function ensureStacksDir(): Promise<string> {
  try {
    // If STACKS_DIR is empty, initialize from settings
    if (!STACKS_DIR) {
      // Get from settings service
      STACKS_DIR = await ensureStacksDirectory();
    } else {
      // Just ensure the directory exists
      await fs.mkdir(STACKS_DIR, { recursive: true });
    }
    return STACKS_DIR;
  } catch (err) {
    console.error("Error creating stacks directory:", err);
    throw new Error("Failed to create stacks storage directory");
  }
}

/**
 * Get stack directory path
 * @param {string} stackId
 */
async function getStackDir(stackId: string): Promise<string> {
  const stacksDir = await ensureStacksDir();
  return join(stacksDir, stackId);
}

/**
 * Get compose file path
 * @param {string} stackId
 */
async function getComposeFilePath(stackId: string): Promise<string> {
  const stackDir = await getStackDir(stackId);
  return join(stackDir, "docker-compose.yml");
}

/**
 * Get stack metadata file path
 * @param {string} stackId
 */
async function getStackMetaPath(stackId: string): Promise<string> {
  const stackDir = await getStackDir(stackId);
  return join(stackDir, "meta.json");
}

/**
 * Initialize a DockerodeCompose instance for a stack
 * @param {string} stackId
 */
async function getComposeInstance(stackId: string): Promise<DockerodeCompose> {
  const docker = getDockerClient();
  const composePath = await getComposeFilePath(stackId);
  return new DockerodeCompose(docker, composePath, stackId);
}

/**
 * Get the services and their status for a specific stack
 * @param {string} stackId Stack ID
 * @param {string} composeContent Compose file content
 */
async function getStackServices(
  stackId: string,
  composeContent: string
): Promise<StackService[]> {
  const docker = getDockerClient();

  try {
    // Parse the compose file to get service names
    const composeData = yaml.load(composeContent) as any;
    if (!composeData || !composeData.services) {
      return [];
    }

    const serviceNames = Object.keys(composeData.services);

    // First, list all containers
    const containers = await docker.listContainers({ all: true });

    // Filter containers related to this stack based on naming convention
    // DockerodeCompose prepends the project name to container names
    const stackPrefix = `${stackId}_`;
    const stackContainers = containers.filter((container) => {
      const names = container.Names || [];
      return names.some((name) => name.startsWith(`/${stackPrefix}`));
    });

    // Map containerData to our StackService format
    const services: StackService[] = [];

    for (const containerData of stackContainers) {
      // Extract service name by removing stack prefix from container name
      let containerName = containerData.Names?.[0] || "";
      // Remove the leading slash and the stack prefix
      containerName = containerName.substring(1); // Remove the leading slash

      // Find the service name by removing prefix
      let serviceName = "";
      for (const name of serviceNames) {
        if (
          containerName.startsWith(`${stackId}_${name}_`) ||
          containerName === `${stackId}_${name}`
        ) {
          serviceName = name;
          break;
        }
      }

      if (!serviceName) {
        // In case we can't determine the service name, use the container name
        serviceName = containerName;
      }

      const service: StackService = {
        id: containerData.Id,
        name: serviceName,
        state: {
          Running: containerData.State === "running",
          Status: containerData.State,
          ExitCode: 0, // Would need to get container inspect data for this
        },
      };

      services.push(service);
    }

    // Add services from compose file that don't have containers yet
    for (const name of serviceNames) {
      if (!services.some((s) => s.name === name)) {
        services.push({
          id: "",
          name: name,
          state: {
            Running: false,
            Status: "not created",
            ExitCode: 0,
          },
        });
      }
    }

    return services;
  } catch (err) {
    console.error(`Error getting services for stack ${stackId}:`, err);
    return [];
  }
}

/**
 * Load all compose stacks
 * @returns {Promise<Array<Stack>>} List of stacks
 */
export async function loadComposeStacks(): Promise<Stack[]> {
  const stacksDir = await ensureStacksDir();

  try {
    const stackDirs = await fs.readdir(stacksDir);
    const stacks: Stack[] = [];

    for (const dir of stackDirs) {
      try {
        const metaPath = await getStackMetaPath(dir);
        const composePath = await getComposeFilePath(dir);

        const [metaContent, composeContent] = await Promise.all([
          fs.readFile(metaPath, "utf8"),
          fs.readFile(composePath, "utf8"),
        ]);

        const meta = JSON.parse(metaContent) as StackMeta;

        // Get services and their status
        const services = await getStackServices(dir, composeContent);

        const serviceCount = services.length;
        const runningCount = services.filter((s) => s.state?.Running).length;

        let status: Stack["status"] = "stopped";
        if (runningCount === serviceCount && serviceCount > 0) {
          status = "running";
        } else if (runningCount > 0) {
          status = "partially running";
        }

        stacks.push({
          id: dir,
          name: meta.name,
          serviceCount,
          runningCount,
          status,
          createdAt: meta.createdAt,
          updatedAt: meta.updatedAt,
        });
      } catch (err) {
        console.warn(`Error loading stack ${dir}:`, err);
        // Skip this stack if we can't load it
      }
    }

    return stacks;
  } catch (err) {
    console.error("Error loading stacks:", err);
    throw new Error("Failed to load compose stacks");
  }
}

/**
 * Get stack by ID
 * @param {string} stackId
 */
export async function getStack(stackId: string): Promise<Stack> {
  try {
    const metaPath = await getStackMetaPath(stackId);
    const composePath = await getComposeFilePath(stackId);

    const [metaContent, composeContent] = await Promise.all([
      fs.readFile(metaPath, "utf8"),
      fs.readFile(composePath, "utf8"),
    ]);

    const meta = JSON.parse(metaContent) as StackMeta;

    // Get services status
    const services = await getStackServices(stackId, composeContent);
    const compose = await getComposeInstance(stackId);

    const serviceCount = services.length;
    const runningCount = services.filter((s) => s.state?.Running).length;

    let status: Stack["status"] = "stopped";
    if (runningCount === serviceCount && serviceCount > 0) {
      status = "running";
    } else if (runningCount > 0) {
      status = "partially running";
    }

    return {
      id: stackId,
      name: meta.name,
      services,
      serviceCount,
      runningCount,
      status,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      composeContent,
      // We don't include the compose instance directly in the returned object
      // as it may not serialize properly and isn't needed in the UI
    };
  } catch (err) {
    console.error(`Error getting stack ${stackId}:`, err);
    throw new Error(`Stack not found or cannot be accessed`);
  }
}

/**
 * Create a new stack
 * @param {string} name Stack name
 * @param {string} composeContent Compose file content
 */
export async function createStack(
  name: string,
  composeContent: string
): Promise<Stack> {
  const stackDir = await getStackDir(nanoid());
  const composePath = join(stackDir, "docker-compose.yml");
  const metaPath = join(stackDir, "meta.json");

  const meta: StackMeta = {
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await fs.mkdir(stackDir, { recursive: true });
    await Promise.all([
      fs.writeFile(composePath, composeContent, "utf8"),
      fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8"),
    ]);

    return {
      id: nanoid(),
      name: meta.name,
      serviceCount: 0,
      runningCount: 0,
      status: "stopped",
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    };
  } catch (err) {
    console.error("Error creating stack:", err);
    throw new Error("Failed to create stack");
  }
}

/**
 * Update an existing stack
 * @param {string} stackId Stack ID
 * @param {StackUpdate} updates Updates to apply
 */
export async function updateStack(
  stackId: string,
  updates: StackUpdate
): Promise<Stack> {
  const metaPath = await getStackMetaPath(stackId);
  const composePath = await getComposeFilePath(stackId);

  try {
    // Read existing meta
    const metaContent = await fs.readFile(metaPath, "utf8");
    const meta = JSON.parse(metaContent) as StackMeta;

    // Update meta
    const updatedMeta: StackMeta = {
      ...meta,
      name: updates.name || meta.name,
      updatedAt: new Date().toISOString(),
    };

    // Write updated files
    const promises = [
      fs.writeFile(metaPath, JSON.stringify(updatedMeta, null, 2), "utf8"),
    ];

    if (updates.composeContent) {
      promises.push(fs.writeFile(composePath, updates.composeContent, "utf8"));
    }

    await Promise.all(promises);

    // Now get the updated stack status
    const composeContent =
      updates.composeContent || (await fs.readFile(composePath, "utf8"));
    const services = await getStackServices(stackId, composeContent);

    const serviceCount = services.length;
    const runningCount = services.filter((s) => s.state?.Running).length;

    let status: Stack["status"] = "stopped";
    if (runningCount === serviceCount && serviceCount > 0) {
      status = "running";
    } else if (runningCount > 0) {
      status = "partially running";
    }

    return {
      id: stackId,
      name: updatedMeta.name,
      serviceCount,
      runningCount,
      status,
      createdAt: updatedMeta.createdAt,
      updatedAt: updatedMeta.updatedAt,
    };
  } catch (err) {
    console.error(`Error updating stack ${stackId}:`, err);
    throw new Error("Failed to update stack");
  }
}

/**
 * Start a stack
 * @param {string} stackId Stack ID
 */
export async function startStack(stackId: string): Promise<boolean> {
  try {
    const compose = await getComposeInstance(stackId);
    await compose.pull();
    await compose.up();
    return true;
  } catch (err: unknown) {
    console.error(`Error starting stack ${stackId}:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to start stack: ${errorMessage}`);
  }
}

/**
 * Stop a stack
 * @param {string} stackId Stack ID
 */
export async function stopStack(stackId: string): Promise<boolean> {
  try {
    const compose = await getComposeInstance(stackId);
    await compose.down();
    return true;
  } catch (err: unknown) {
    console.error(`Error stopping stack ${stackId}:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to stop stack: ${errorMessage}`);
  }
}

/**
 * Restart a stack
 * @param {string} stackId Stack ID
 */
export async function restartStack(stackId: string): Promise<boolean> {
  try {
    // DockerodeCompose doesn't have a restart method, so we'll implement it
    // by stopping and starting the stack
    const compose = await getComposeInstance(stackId);
    await compose.down();
    await compose.up();
    return true;
  } catch (err: unknown) {
    console.error(`Error restarting stack ${stackId}:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to restart stack: ${errorMessage}`);
  }
}

/**
 * Remove a stack
 * @param {string} stackId Stack ID
 */
export async function removeStack(stackId: string): Promise<boolean> {
  try {
    // First stop all services
    const compose = await getComposeInstance(stackId);
    await compose.down();

    // Then delete the stack files
    const stackDir = await getStackDir(stackId);
    await fs.rm(stackDir, { recursive: true, force: true });

    return true;
  } catch (err: unknown) {
    console.error(`Error removing stack ${stackId}:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to remove stack: ${errorMessage}`);
  }
}

/**
 * Discover existing Docker Compose stacks by analyzing container labels
 * @returns {Promise<Stack[]>} External stacks discovered
 */
export async function discoverExternalStacks(): Promise<Stack[]> {
  try {
    const docker = getDockerClient();
    const containers = await docker.listContainers({ all: true });

    // Docker Compose adds these labels to managed containers
    const composeProjectLabel = "com.docker.compose.project";
    const composeServiceLabel = "com.docker.compose.service";

    // Group containers by project
    const projectMap: Record<string, any[]> = {};

    containers.forEach((container) => {
      const labels = container.Labels || {};
      const projectName = labels[composeProjectLabel];

      if (projectName) {
        if (!projectMap[projectName]) {
          projectMap[projectName] = [];
        }

        projectMap[projectName].push({
          id: container.Id,
          name: labels[composeServiceLabel] || container.Names[0]?.substring(1),
          state: {
            Running: container.State === "running",
            Status: container.State,
            ExitCode: 0,
          },
        });
      }
    });

    // Convert to our Stack format
    const externalStacks: Stack[] = [];

    for (const [projectName, services] of Object.entries(projectMap)) {
      // Check if this stack is already in our managed stacks
      const stackDir = await getStackDir(projectName);
      try {
        await fs.access(stackDir);
        // Stack is managed by Arcane, skip it
        continue;
      } catch {
        // Stack is not managed by Arcane, include it
      }

      const serviceCount = services.length;
      const runningCount = services.filter((s) => s.state.Running).length;

      let status: Stack["status"] = "stopped";
      if (runningCount === serviceCount && serviceCount > 0) {
        status = "running";
      } else if (runningCount > 0) {
        status = "partially running";
      }

      externalStacks.push({
        id: projectName,
        name: projectName,
        services,
        serviceCount,
        runningCount,
        status,
        isExternal: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return externalStacks;
  } catch (err) {
    console.error("Error discovering external stacks:", err);
    return [];
  }
}

/**
 * Import an external stack into Arcane
 *
 * @param stackId The ID of the external stack to import
 * @returns The newly imported stack object
 */
export async function importExternalStack(stackId: string): Promise<Stack> {
  // 1. First, check if we can find the stack by ID
  const docker = getDockerClient();
  const containers = await docker.listContainers({ all: true });

  // Filter containers that belong to this stack
  const stackContainers = containers.filter((container) => {
    const labels = container.Labels || {};
    return labels["com.docker.compose.project"] === stackId;
  });

  if (stackContainers.length === 0) {
    throw new Error(`No containers found for stack '${stackId}'`);
  }

  // 2. Try to locate the compose file (if available)
  let composeFilePath = "";
  const container = stackContainers[0];
  const labels = container.Labels || {};

  if (labels["com.docker.compose.project.config_files"]) {
    composeFilePath = labels["com.docker.compose.project.config_files"];
  }

  // 3. Read the compose file if available, or create a new one
  let composeContent = "";

  if (composeFilePath) {
    try {
      composeContent = await fs.readFile(composeFilePath, "utf8");
    } catch (err) {
      console.warn(`Couldn't read compose file at ${composeFilePath}:`, err);
      // Will generate a new one below
    }
  }

  // 4. If we couldn't read the compose file, generate one based on container inspection
  if (!composeContent) {
    // Create a basic compose file from container inspection
    const services: Record<string, any> = {};

    for (const container of stackContainers) {
      const containerLabels = container.Labels || {};
      const serviceName =
        containerLabels["com.docker.compose.service"] ||
        container.Names[0]?.replace(`/${stackId}_`, "").replace("_1", "") ||
        `service_${container.Id.substring(0, 8)}`;

      // Inspect the container to get more details
      const containerDetails = await docker
        .getContainer(container.Id)
        .inspect();

      services[serviceName] = {
        image: container.Image,
        // Add other properties based on containerDetails
      };
    }

    // Generate the compose file content
    composeContent = `# Generated compose file for imported stack: ${stackId}
# This was automatically generated by Arcane from an external stack
# You may need to adjust it manually for correct operation

version: '3'
services:
${yaml.dump({ services }).substring(10)}`; // Remove the services: line
  }

  // 5. Create a new stack in Arcane's managed stacks
  return await createStack(stackId, composeContent);
}
