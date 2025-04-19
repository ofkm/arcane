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

let STACKS_DIR =
  process.env.STACKS_DIR || join(process.cwd(), ".arcane", "stacks");

/**
 * Update the stacks directory path
 * @param {string} directory New stacks directory path
 */
export function updateStacksDirectory(directory: string): void {
  if (directory) {
    STACKS_DIR = directory;
    console.log(`Stacks directory updated to: ${STACKS_DIR}`);
    // No need to re-initialize anything here since
    // each function call will use the updated STACKS_DIR
  }
}

/**
 * Ensure stacks directory exists
 */
async function ensureStacksDir(): Promise<void> {
  try {
    await fs.mkdir(STACKS_DIR, { recursive: true });
  } catch (err) {
    console.error("Error creating stacks directory:", err);
    throw new Error("Failed to create stacks storage directory");
  }
}

/**
 * Initialize the compose service with settings
 * This should be called at app startup
 */
export async function initComposeService(): Promise<void> {
  try {
    // Try to load settings
    const settingsPath = join(process.cwd(), "app-settings.json");
    const settingsData = await fs
      .readFile(settingsPath, "utf8")
      .catch(() => "{}");
    const settings = JSON.parse(settingsData);

    if (settings.stacksDirectory) {
      STACKS_DIR = settings.stacksDirectory;
      console.log(`Stacks directory initialized from settings: ${STACKS_DIR}`);
    }

    // Ensure the directory exists
    await ensureStacksDir();
  } catch (err) {
    console.error("Error initializing compose service:", err);
    // Fall back to default directory and ensure it exists
    await ensureStacksDir();
  }
}

/**
 * Get stack directory path
 * @param {string} stackId
 */
function getStackDir(stackId: string): string {
  return join(STACKS_DIR, stackId);
}

/**
 * Get compose file path
 * @param {string} stackId
 */
function getComposeFilePath(stackId: string): string {
  return join(getStackDir(stackId), "docker-compose.yml");
}

/**
 * Get stack metadata file path
 * @param {string} stackId
 */
function getStackMetaPath(stackId: string): string {
  return join(getStackDir(stackId), "meta.json");
}

/**
 * Initialize a DockerodeCompose instance for a stack
 * @param {string} stackId
 */
async function getComposeInstance(stackId: string): Promise<DockerodeCompose> {
  const docker = getDockerClient();
  const composePath = getComposeFilePath(stackId);
  // The third parameter is the project name, used as namespace for containers
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
  await ensureStacksDir();

  try {
    const stackDirs = await fs.readdir(STACKS_DIR);
    const stacks: Stack[] = [];

    for (const dir of stackDirs) {
      try {
        const metaPath = getStackMetaPath(dir);
        const composePath = getComposeFilePath(dir);

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
    const metaPath = getStackMetaPath(stackId);
    const composePath = getComposeFilePath(stackId);

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
  await ensureStacksDir();

  const id = nanoid();
  const stackDir = getStackDir(id);
  const composePath = getComposeFilePath(id);
  const metaPath = getStackMetaPath(id);

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
      id,
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
  const metaPath = getStackMetaPath(stackId);
  const composePath = getComposeFilePath(stackId);

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
    const stackDir = getStackDir(stackId);
    await fs.rm(stackDir, { recursive: true, force: true });

    return true;
  } catch (err: unknown) {
    console.error(`Error removing stack ${stackId}:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to remove stack: ${errorMessage}`);
  }
}
