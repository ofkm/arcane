import { promises } from "node:fs";
import * as path from "node:path";
import "dockerode";
import { dump } from "js-yaml";
import slugify from "slugify";
import { g as getDockerClient } from "./core.js";
import { g as getSettings, e as ensureStacksDirectory } from "./settings-service.js";
import { listStacksFromDb, saveStackToDb, updateStackContentInDb, updateStackRuntimeInfoInDb, deleteStackFromDb, getStackByIdFromDb } from "./compose-db-service.js";
import { normalizeHealthcheckTest, parseYamlContent, parseEnvContent, generateConfigHash, parseActiveProfiles, createProfileDeploymentPlan, validateAllDependencies, applyProfileFiltering, getAllDefinedProfiles, getProfileUsageStats, generateProfileHelp, substituteVariablesInObject, resolveDependencyOrderWithConditions, resolveDependencyOrder, createVolumeDefinitions, createDependencyWaitConfig, prepareLogConfig, prepareUlimits, prepareExtraHosts, parseMemory, preparePorts, prepareVolumes, prepareRestartPolicy, prepareEnvironmentVariables, prepareHealthcheck, DEFAULT_COMPOSE_VERSION, validateComposeContent, validateComposeStructure } from "./compose.utils.js";
import { v as validateComposeConfiguration, a as validateExternalResource, b as validateContainerName, e as enhanceContainerConfig } from "./compose-validate.utils.js";
async function directoryExists(dir) {
  try {
    const stats = await promises.stat(dir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
let STACKS_DIR = "";
const stackCache = /* @__PURE__ */ new Map();
async function initComposeService() {
  try {
    const settings = await getSettings();
    STACKS_DIR = settings.stacksDirectory;
    console.log(`Stacks directory initialized: ${STACKS_DIR}`);
    await ensureStacksDir();
    try {
      const dbStacks = await listStacksFromDb();
      if (dbStacks.length === 0) {
        console.log("No stacks found in database, checking for file-based stacks to migrate...");
      }
    } catch (error) {
      console.warn("Database not yet ready for stack operations:", error);
    }
  } catch (err) {
    console.error("Error initializing compose service:", err);
    throw new Error("Failed to initialize compose service");
  }
}
async function ensureStacksDir() {
  try {
    if (!STACKS_DIR || !path.isAbsolute(STACKS_DIR)) {
      let dirPath = STACKS_DIR || await ensureStacksDirectory();
      if (!path.isAbsolute(dirPath)) {
        dirPath = path.resolve(dirPath);
      }
      STACKS_DIR = dirPath;
    }
    await promises.mkdir(STACKS_DIR, { recursive: true });
    try {
      await promises.access(STACKS_DIR, promises.constants.W_OK);
    } catch {
      throw new Error(`Stacks directory ${STACKS_DIR} is not writable`);
    }
    return STACKS_DIR;
  } catch (err) {
    console.error("Error creating stacks directory:", err);
    throw new Error("Failed to create stacks storage directory");
  }
}
async function getStackDir(stackId) {
  if (!stackId || typeof stackId !== "string") {
    throw new Error("Stack ID must be a non-empty string");
  }
  const stacksDirAbs = await ensureStacksDir();
  const safeId = path.basename(stackId);
  if (safeId !== stackId) {
    console.warn(`Stack ID "${stackId}" was sanitized to "${safeId}" for security`);
  }
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(safeId)) {
    throw new Error(`Invalid stack ID: "${safeId}". Stack ID must start with a lowercase letter or digit and contain only lowercase letters, digits, hyphens, and underscores.`);
  }
  return path.join(stacksDirAbs, safeId);
}
async function getComposeFilePath(stackId) {
  const stackDirAbs = await getStackDir(stackId);
  const composePaths = [
    path.join(stackDirAbs, "compose.yaml"),
    // Preferred format
    path.join(stackDirAbs, "compose.yml"),
    // Alternative YAML
    path.join(stackDirAbs, "docker-compose.yaml"),
    // Legacy format
    path.join(stackDirAbs, "docker-compose.yml")
    // Legacy format
  ];
  for (const composePath of composePaths) {
    try {
      await promises.access(composePath, promises.constants.R_OK);
      return composePath;
    } catch {
    }
  }
  return null;
}
async function getEnvFilePath(stackId) {
  const stackDir = await getStackDir(stackId);
  return path.join(stackDir, ".env");
}
async function saveEnvFile(stackId, content) {
  const envPath = await getEnvFilePath(stackId);
  const fileContent = content === void 0 || content === null ? "" : content;
  if (fileContent.trim()) {
    try {
      parseEnvContent(fileContent);
    } catch (error) {
      throw new Error(`Invalid .env file format: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  await promises.writeFile(envPath, fileContent, "utf8");
  console.log(`Saved .env file for stack ${stackId}`);
}
async function loadEnvFile(stackId) {
  const envPath = await getEnvFilePath(stackId);
  try {
    const content = await promises.readFile(envPath, "utf8");
    try {
      parseEnvContent(content);
    } catch (parseError) {
      console.warn(`Warning: .env file for stack ${stackId} has parsing issues:`, parseError);
    }
    return content;
  } catch (err) {
    const nodeErr = err;
    if (nodeErr.code === "ENOENT") {
      console.log(`No .env file found for stack ${stackId}`);
      return "";
    }
    console.error(`Error reading .env file for stack ${stackId}:`, err);
    throw new Error(`Failed to read .env file: ${nodeErr.message}`, { cause: err });
  }
}
async function loadComposeStacks() {
  const cacheKey = "compose-stacks";
  const cachedData = stackCache.get(cacheKey);
  const EXTENDED_CACHE_TTL = 5 * 60 * 1e3;
  if (cachedData && Date.now() - cachedData.timestamp < EXTENDED_CACHE_TTL) {
    console.log(`Returning ${cachedData.data.length} stacks from cache`);
    return cachedData.data;
  }
  try {
    const dbStacks = await listStacksFromDb();
    console.log(`Loaded ${dbStacks.length} stacks from database (fast mode)`);
    const fastStacks = dbStacks.map((stack) => {
      if (!stack.id || typeof stack.id !== "string") {
        console.warn("Stack missing valid ID, skipping");
        return null;
      }
      return {
        ...stack,
        services: [],
        // Empty services array for fast loading
        status: stack.status || "unknown"
      };
    }).filter(Boolean);
    stackCache.set(cacheKey, {
      data: fastStacks,
      timestamp: Date.now()
    });
    console.log(`Fast load completed: ${fastStacks.length} stacks`);
    return fastStacks;
  } catch (error) {
    console.error("Error loading stacks from database, falling back to file-based approach:", error);
    return loadComposeStacksFromFiles();
  }
}
async function loadComposeStacksFromFiles() {
  const stacksDir = await ensureStacksDir();
  try {
    const stackDirEntries = await promises.readdir(stacksDir, { withFileTypes: true });
    const stacks = [];
    for (const entry of stackDirEntries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const dirName = entry.name;
      const stackDir = path.join(stacksDir, dirName);
      let composeFilePath = null;
      let composeContent = null;
      const potentialComposePaths = [path.join(stackDir, "compose.yaml"), path.join(stackDir, "docker-compose.yml")];
      for (const p of potentialComposePaths) {
        try {
          await promises.access(p);
          composeContent = await promises.readFile(p, "utf8");
          composeFilePath = p;
          break;
        } catch {
        }
      }
      if (!composeContent || !composeFilePath) {
        console.warn(`No compose file found in directory ${dirName}, skipping.`);
        continue;
      }
      const services = await getStackServices(dirName, composeContent);
      let dirStat;
      try {
        dirStat = await promises.stat(stackDir);
      } catch (statErr) {
        console.error(`Could not stat directory ${stackDir}:`, statErr);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        dirStat = { birthtime: new Date(now), mtime: new Date(now) };
      }
      const serviceCount = services.length;
      const runningCount = services.filter((s) => s.state?.Running).length;
      let status = "stopped";
      if (serviceCount === 0) {
        status = "unknown";
      } else if (runningCount === serviceCount) {
        status = "running";
      } else if (runningCount > 0) {
        status = "partially running";
      }
      stacks.push({
        id: dirName,
        name: dirName,
        services,
        serviceCount,
        runningCount,
        status,
        createdAt: dirStat.birthtime.toISOString(),
        updatedAt: dirStat.mtime.toISOString(),
        isExternal: false
      });
    }
    return stacks;
  } catch (err) {
    console.error("Error loading stacks from STACKS_DIR:", err);
    throw new Error("Failed to load compose stacks");
  }
}
async function getStackServices(stackId, composeContent) {
  const docker = await getDockerClient();
  const composeProjectLabel = "com.docker.compose.project";
  const composeServiceLabel = "com.docker.compose.service";
  console.log(`Getting services for stack ${stackId} (compose content length: ${composeContent.length})`);
  try {
    let envContent = "";
    let envVars = {};
    try {
      envContent = await loadEnvFile(stackId);
      envVars = parseEnvContent(envContent);
    } catch (envError) {
      console.log(`No .env file found for stack ${stackId}, continuing without env vars`);
    }
    const getEnvVar = (key) => {
      return envVars[key] || process.env[key];
    };
    let composeData = null;
    let serviceNames = [];
    if (composeContent.trim()) {
      const validation = validateComposeContent(composeContent);
      if (!validation.valid) {
        console.warn(`Compose validation errors for stack ${stackId}:`, validation.errors);
      }
      composeData = parseYamlContent(composeContent, getEnvVar);
      if (composeData) {
        const structureValidation = validateComposeStructure(composeData);
        if (!structureValidation.valid) {
          console.warn(`Compose structure validation errors for stack ${stackId}:`, structureValidation.errors);
        }
        if (composeData.services) {
          serviceNames = Object.keys(composeData.services);
          console.log(`Found ${serviceNames.length} services defined in compose: [${serviceNames.join(", ")}]`);
        } else {
          console.warn(`No services found in compose content for stack ${stackId}`);
        }
      }
    } else {
      console.warn(`Empty compose content for stack ${stackId}`);
    }
    const containers = await docker.listContainers({ all: true });
    console.log(`Total containers found: ${containers.length}`);
    const stackContainers = containers.filter((container) => {
      const labels = container.Labels || {};
      const names = container.Names || [];
      const hasCorrectLabel = labels[composeProjectLabel] === stackId;
      const nameStartsWithPrefix = names.some((name) => name.startsWith(`/${stackId}_`));
      const belongs = hasCorrectLabel || nameStartsWithPrefix;
      if (belongs) {
        console.log(`Container ${container.Id} (${names[0]}) belongs to stack ${stackId}`);
        console.log(`  - Labels: ${JSON.stringify(labels)}`);
        console.log(`  - State: ${container.State}`);
      }
      return belongs;
    });
    console.log(`Found ${stackContainers.length} containers for stack ${stackId}`);
    const services = [];
    for (const containerData of stackContainers) {
      const containerName = containerData.Names?.[0]?.substring(1) || "";
      const labels = containerData.Labels || {};
      let serviceName = labels[composeServiceLabel];
      console.log(`Processing container ${containerData.Id} (${containerName})`);
      if (!serviceName && serviceNames.length > 0) {
        console.log(`Container ${containerData.Id} missing service label, trying to parse from name`);
        for (const name of serviceNames) {
          const servicePrefixWithUnderscore = `${stackId}_${name}_`;
          const servicePrefixExact = `${stackId}_${name}`;
          if (containerName.startsWith(servicePrefixWithUnderscore) || containerName === servicePrefixExact) {
            serviceName = name;
            console.log(`Matched service name: ${serviceName}`);
            break;
          }
        }
      }
      if (!serviceName) {
        const namePattern = new RegExp(`^${stackId}_([^_]+)(?:_\\d+)?$`);
        const match = containerName.match(namePattern);
        if (match) {
          serviceName = match[1];
          console.log(`Extracted service name from container name: ${serviceName}`);
        } else {
          serviceName = containerName.replace(`${stackId}_`, "").replace(/_\d+$/, "") || containerName;
          console.log(`Using fallback service name: ${serviceName}`);
        }
      }
      const service = {
        id: containerData.Id,
        name: serviceName,
        state: {
          Running: containerData.State === "running",
          Status: containerData.State,
          ExitCode: containerData.State === "exited" ? -1 : 0
        }
      };
      console.log(`Created service: ${JSON.stringify(service)}`);
      const existingServiceIndex = services.findIndex((s) => s.name === serviceName);
      if (existingServiceIndex !== -1) {
        if (!services[existingServiceIndex].id) {
          services[existingServiceIndex] = service;
          console.log(`Updated existing service ${serviceName} with container data`);
        } else {
          console.log(`Multiple containers found for service ${serviceName} in stack ${stackId}. Keeping first found.`);
        }
      } else {
        services.push(service);
        console.log(`Added new service ${serviceName}`);
      }
    }
    if (serviceNames.length > 0) {
      for (const name of serviceNames) {
        if (!services.some((s) => s.name === name)) {
          const placeholderService = {
            id: "",
            name,
            state: {
              Running: false,
              Status: "not created",
              ExitCode: 0
            }
          };
          services.push(placeholderService);
          console.log(`Added placeholder service for ${name}`);
        }
      }
    }
    let sortedServices = services;
    if (composeData && composeData.services) {
      try {
        const dependencyOrder = resolveDependencyOrder(composeData.services);
        sortedServices = services.sort((a, b) => {
          const aIndex = dependencyOrder.indexOf(a.name);
          const bIndex = dependencyOrder.indexOf(b.name);
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          return a.name.localeCompare(b.name);
        });
      } catch (depError) {
        console.warn(`Could not resolve dependency order for stack ${stackId}, using alphabetical sort:`, depError);
        sortedServices = services.sort((a, b) => a.name.localeCompare(b.name));
      }
    } else {
      sortedServices = services.sort((a, b) => a.name.localeCompare(b.name));
    }
    console.log(`Final services for stack ${stackId}: ${sortedServices.length} services`);
    sortedServices.forEach((s) => console.log(`  - ${s.name}: ${s.state?.Status} (id: ${s.id || "none"})`));
    return sortedServices;
  } catch (err) {
    console.error(`Error getting services for stack ${stackId}:`, err);
    return [];
  }
}
async function getStack(stackId) {
  try {
    const dbStack = await getStackByIdFromDb(stackId);
    if (dbStack) {
      console.log(`Found stack ${stackId} in database`);
      let composeContent = dbStack.composeContent;
      if (!composeContent) {
        const composePath = await getComposeFilePath(stackId);
        if (composePath) {
          composeContent = await promises.readFile(composePath, "utf8");
          updateStackContentInDb(stackId, { composeContent }).catch(console.error);
        }
      }
      const services = await getStackServices(stackId, composeContent || "");
      const serviceCount = services.length;
      const runningCount = services.filter((s) => s.state?.Running).length;
      let status = "stopped";
      if (serviceCount === 0) {
        status = "unknown";
      } else if (runningCount === serviceCount) {
        status = "running";
      } else if (runningCount > 0) {
        status = "partially running";
      }
      updateStackRuntimeInfoInDb(stackId, {
        status,
        serviceCount,
        runningCount,
        lastPolled: /* @__PURE__ */ new Date()
      }).catch(console.error);
      return {
        ...dbStack,
        composeContent,
        services,
        serviceCount,
        runningCount,
        status
      };
    }
  } catch (error) {
    console.error(`Error loading stack ${stackId} from database:`, error);
  }
  return getStackFromFiles(stackId);
}
async function getStackFromFiles(stackId) {
  const stackDir = await getStackDir(stackId);
  try {
    await promises.access(stackDir);
  } catch {
    throw new Error(`Stack with ID "${stackId}" not found.`);
  }
  const composePath = await getComposeFilePath(stackId);
  if (!composePath) {
    throw new Error(`Compose file not found for stack ${stackId}`);
  }
  const composeContent = await promises.readFile(composePath, "utf8");
  const envContent = await loadEnvFile(stackId);
  const services = await getStackServices(stackId, composeContent);
  const dirStat = await promises.stat(stackDir);
  const serviceCount = services.length;
  const runningCount = services.filter((s) => s.state?.Running).length;
  let status = "stopped";
  if (serviceCount === 0) {
    status = "unknown";
  } else if (runningCount === serviceCount) {
    status = "running";
  } else if (runningCount > 0) {
    status = "partially running";
  }
  return {
    id: stackId,
    name: stackId,
    services,
    serviceCount,
    runningCount,
    status,
    createdAt: dirStat.birthtime.toISOString(),
    updatedAt: dirStat.mtime.toISOString(),
    composeContent,
    envContent: envContent || "",
    isExternal: false
  };
}
async function createStack(name, composeContent, envContent) {
  console.log(`Validating compose content for new stack: ${name}`);
  const validation = await validateComposeConfiguration(composeContent, envContent || "");
  if (!validation.valid) {
    throw new Error(`Invalid compose configuration: ${validation.errors.join(", ")}`);
  }
  if (validation.warnings.length > 0) {
    console.warn(`Compose warnings for new stack ${name}:`, validation.warnings);
  }
  const dirName = slugify(name, {
    lower: true,
    strict: true,
    replacement: "-",
    trim: true
  });
  const stacksDir = await ensureStacksDirectory();
  let counter = 1;
  let uniqueDirName = dirName;
  while (await directoryExists(path.join(stacksDir, uniqueDirName))) {
    uniqueDirName = `${dirName}-${counter}`;
    counter++;
  }
  const stackDir = path.join(stacksDir, uniqueDirName);
  await promises.mkdir(stackDir, { recursive: true });
  const normalizedComposeContent = normalizeHealthcheckTest(composeContent);
  await promises.writeFile(path.join(stackDir, "compose.yaml"), normalizedComposeContent);
  if (envContent) {
    await promises.writeFile(path.join(stackDir, ".env"), envContent);
  }
  let serviceCount = 0;
  try {
    const composeData = parseYamlContent(composeContent);
    if (composeData?.services) {
      serviceCount = Object.keys(composeData.services).length;
    }
  } catch (parseErr) {
    console.warn(`Could not parse compose file during creation for stack ${uniqueDirName}:`, parseErr);
  }
  const dirStat = await promises.stat(stackDir);
  const newStack = {
    id: uniqueDirName,
    name: uniqueDirName,
    serviceCount,
    runningCount: 0,
    status: "stopped",
    createdAt: dirStat.birthtime.toISOString(),
    updatedAt: dirStat.mtime.toISOString(),
    composeContent,
    envContent: envContent || "",
    isExternal: false,
    path: stackDir,
    dirName: uniqueDirName
  };
  try {
    await saveStackToDb(newStack);
    console.log(`Stack ${uniqueDirName} saved to database`);
  } catch (error) {
    console.error(`Error saving stack ${uniqueDirName} to database:`, error);
  }
  stackCache.delete("compose-stacks");
  return newStack;
}
async function updateStack(currentStackId, updates) {
  if (updates.composeContent !== void 0) {
    console.log(`Validating updated compose content for stack: ${currentStackId}`);
    const validation = await validateComposeConfiguration(updates.composeContent, updates.envContent || "");
    if (!validation.valid) {
      throw new Error(`Invalid compose configuration: ${validation.errors.join(", ")}`);
    }
    if (validation.warnings.length > 0) {
      console.warn(`Compose warnings for updated stack ${currentStackId}:`, validation.warnings);
    }
  }
  let effectiveStackId = currentStackId;
  let stackAfterRename = null;
  if (updates.name) {
    const newSlugifiedName = slugify(updates.name, {
      lower: true,
      strict: true,
      replacement: "-",
      trim: true
    });
    if (newSlugifiedName !== currentStackId) {
      console.log(`Rename requested for stack '${currentStackId}' to '${updates.name}' (slug: '${newSlugifiedName}').`);
      stackAfterRename = await renameStack(currentStackId, updates.name);
      effectiveStackId = stackAfterRename.id;
      console.log(`Stack '${currentStackId}' successfully renamed to '${effectiveStackId}'.`);
    }
  }
  let contentUpdated = false;
  const stackDirForContent = await getStackDir(effectiveStackId);
  const promises$1 = [];
  if (updates.composeContent !== void 0) {
    const normalizedComposeContent = normalizeHealthcheckTest(updates.composeContent);
    const currentComposePath = await getComposeFilePath(effectiveStackId);
    const targetComposePath = currentComposePath || path.join(stackDirForContent, "compose.yaml");
    promises$1.push(promises.writeFile(targetComposePath, normalizedComposeContent, "utf8"));
    contentUpdated = true;
    console.log(`Updating composeContent for stack '${effectiveStackId}'.`);
  }
  if (updates.envContent !== void 0) {
    promises$1.push(saveEnvFile(effectiveStackId, updates.envContent));
    contentUpdated = true;
    console.log(`Updating envContent for stack '${effectiveStackId}'.`);
  }
  if (promises$1.length > 0) {
    await Promise.all(promises$1);
  }
  if (contentUpdated) {
    try {
      await updateStackContentInDb(effectiveStackId, {
        composeContent: updates.composeContent,
        envContent: updates.envContent
      });
      console.log(`Stack ${effectiveStackId} content updated in database`);
    } catch (error) {
      console.error(`Error updating stack ${effectiveStackId} in database:`, error);
    }
  }
  stackCache.delete("compose-stacks");
  if (stackAfterRename && !contentUpdated) {
    return stackAfterRename;
  } else {
    return getStack(effectiveStackId);
  }
}
async function deployStack(stackId, options = {}) {
  const stackDir = await getStackDir(stackId);
  const originalCwd = process.cwd();
  let deploymentStarted = false;
  try {
    const composePath = await getComposeFilePath(stackId);
    if (!composePath) {
      throw new Error(`Compose file not found for stack ${stackId}`);
    }
    const composeContent = await promises.readFile(composePath, "utf8");
    const envContent = await loadEnvFile(stackId);
    console.log(`Validating stack configuration before deployment: ${stackId}`);
    const validation = await validateComposeConfiguration(composeContent, envContent, options.validationMode || "default");
    if (!validation.valid) {
      throw new Error(`Deployment aborted - validation failed: ${validation.errors.join(", ")}`);
    }
    if (validation.warnings.length > 0) {
      console.warn(`Deployment warnings for stack ${stackId}:`, validation.warnings);
    }
    const envVars = { ...parseEnvContent(envContent), ...options.envOverrides };
    const getEnvVar = (key) => envVars[key] || process.env[key];
    const normalizedContent = normalizeHealthcheckTest(composeContent, getEnvVar);
    if (composeContent !== normalizedContent) {
      console.log(`Normalized compose content for stack ${stackId}. Writing to disk.`);
      await promises.writeFile(composePath, normalizedContent, "utf8");
    }
    process.chdir(stackDir);
    console.log(`Changed CWD to: ${stackDir} for stack ${stackId} operations.`);
    const composeData = parseYamlContent(normalizedContent, getEnvVar);
    if (!composeData) {
      throw new Error(`Failed to parse compose file for stack ${stackId}`);
    }
    if (composeData.services) {
      console.log(`Validating dependencies for stack ${stackId}...`);
      const dependencyValidation = validateAllDependencies(composeData.services);
      if (!dependencyValidation.valid) {
        console.error(`Dependency validation failed for stack ${stackId}:`, dependencyValidation.errors);
        throw new Error(`Invalid dependencies: ${dependencyValidation.errors.join(", ")}`);
      }
      if (dependencyValidation.warnings.length > 0) {
        console.warn(`Dependency warnings for stack ${stackId}:`, dependencyValidation.warnings);
      }
    }
    const activeProfiles = options.profiles?.length ? options.profiles : parseActiveProfiles([], envVars);
    console.log(`Active profiles for stack ${stackId}: [${activeProfiles.join(", ")}]`);
    const { filteredComposeData, deploymentPlan } = applyProfileFiltering(composeData, activeProfiles);
    console.log(`Deployment plan for stack ${stackId}:`);
    console.log(`  Services to deploy (${deploymentPlan.plan.servicesToDeploy.length}): [${deploymentPlan.plan.servicesToDeploy.join(", ")}]`);
    if (deploymentPlan.plan.servicesToSkip.length > 0) {
      console.log(`  Services to skip (${deploymentPlan.plan.servicesToSkip.length}):`);
      for (const skipped of deploymentPlan.plan.servicesToSkip) {
        console.log(`    - ${skipped.name}: ${skipped.reason}`);
      }
    }
    if (deploymentPlan.warnings.length > 0) {
      console.warn(`Profile warnings for stack ${stackId}:`, deploymentPlan.warnings);
    }
    if (deploymentPlan.errors.length > 0) {
      throw new Error(`Profile errors for stack ${stackId}: ${deploymentPlan.errors.join(", ")}`);
    }
    console.log(`Checking for existing containers for stack ${stackId}...`);
    const docker = await getDockerClient();
    try {
      const existingContainers = await docker.listContainers({
        all: true,
        filters: JSON.stringify({
          label: [`com.docker.compose.project=${stackId}`]
        })
      });
      if (existingContainers.length > 0) {
        console.log(`Found ${existingContainers.length} existing containers for stack ${stackId}. Stopping and removing...`);
        for (const containerInfo of existingContainers) {
          const container = docker.getContainer(containerInfo.Id);
          try {
            if (containerInfo.State === "running") {
              await container.stop({ t: 10 });
            }
            await container.remove({ force: true });
            console.log(`Removed container ${containerInfo.Names?.[0]} (${containerInfo.Id})`);
          } catch (containerErr) {
            console.warn(`Error removing container ${containerInfo.Id}:`, containerErr);
          }
        }
      }
    } catch (cleanupErr) {
      console.warn(`Error during container cleanup for stack ${stackId}:`, cleanupErr);
    }
    const hasExternalNetworks = filteredComposeData.networks && Object.values(filteredComposeData.networks).some((net) => net.external);
    try {
      deploymentStarted = true;
      if (hasExternalNetworks) {
        console.log(`Stack ${stackId} contains external networks. Using custom deployment approach.`);
        await deployStackWithExternalNetworks(stackId, filteredComposeData, stackDir);
      } else {
        const docker2 = await getDockerClient();
        const imagePullPromises = Object.entries(filteredComposeData.services || {}).filter(([_, serviceConfig]) => serviceConfig.image).map(async ([serviceName, serviceConfig]) => {
          const serviceImage = serviceConfig.image;
          console.log(`Pulling image for service ${serviceName}: ${serviceImage}`);
          try {
            await pullImage(docker2, serviceImage);
          } catch (pullErr) {
            console.warn(`Warning: Failed to pull image ${serviceImage} for service ${serviceName}:`, pullErr);
          }
        });
        await Promise.all(imagePullPromises);
        await createStackNetworks(docker2, stackId, filteredComposeData.networks || {});
        await createAndStartServices(docker2, stackId, filteredComposeData, stackDir);
      }
      try {
        await updateStackRuntimeInfoInDb(stackId, {
          status: "running",
          lastPolled: Math.floor(Date.now() / 1e3)
        });
      } catch (dbError) {
        console.error(`Error updating stack ${stackId} status in database:`, dbError);
      }
      stackCache.delete("compose-stacks");
      return true;
    } catch (deployErr) {
      if (deploymentStarted) {
        console.log(`Deployment of stack ${stackId} failed. Cleaning up any created containers...`);
        try {
          await cleanupFailedDeployment(stackId);
        } catch (cleanupErr) {
          console.error(`Error cleaning up failed deployment for stack ${stackId}:`, cleanupErr);
        }
      }
      throw deployErr;
    }
  } catch (err) {
    console.error(`Error deploying stack ${stackId}:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to deploy stack: ${errorMessage}`);
  } finally {
    process.chdir(originalCwd);
    console.log(`Restored CWD to: ${originalCwd}.`);
  }
}
async function startStack(stackId) {
  return deployStack(stackId);
}
async function stopStack(stackId) {
  console.log(`Attempting to stop stack ${stackId} by manually stopping containers...`);
  const docker = await getDockerClient();
  const composeProjectLabel = "com.docker.compose.project";
  let stoppedCount = 0;
  let removedCount = 0;
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: JSON.stringify({
        label: [`${composeProjectLabel}=${stackId}`]
      })
    });
    const allContainers = await docker.listContainers({ all: true });
    const nameFilteredContainers = allContainers.filter((c) => !containers.some((fc) => fc.Id === c.Id) && (c.Labels?.[composeProjectLabel] === stackId || c.Names?.some((name) => name.startsWith(`/${stackId}_`))));
    const seen = /* @__PURE__ */ new Set();
    const stackContainers = [...containers, ...nameFilteredContainers].filter((c) => {
      if (seen.has(c.Id)) return false;
      seen.add(c.Id);
      return true;
    });
    if (stackContainers.length === 0) {
      return true;
    }
    console.log(`Found ${stackContainers.length} containers for stack ${stackId}. Attempting to stop and remove...`);
    for (const containerInfo of stackContainers) {
      console.log(`Processing container ${containerInfo.Names?.[0]} (ID: ${containerInfo.Id})...`);
      const container = docker.getContainer(containerInfo.Id);
      try {
        if (containerInfo.State === "running") {
          console.log(`Stopping container ${containerInfo.Id}...`);
          await container.stop();
          console.log(`Container ${containerInfo.Id} stopped.`);
          stoppedCount++;
        } else {
          console.log(`Container ${containerInfo.Id} is already stopped (State: ${containerInfo.State}).`);
        }
        console.log(`Removing container ${containerInfo.Id}...`);
        await container.remove({ force: true });
        console.log(`Container ${containerInfo.Id} removed.`);
        removedCount++;
      } catch (containerErr) {
        console.error(`Error processing container ${containerInfo.Id} for stack ${stackId}:`, containerErr);
      }
    }
    try {
      const networks = await docker.listNetworks({
        filters: JSON.stringify({
          label: [`${composeProjectLabel}=${stackId}`]
        })
      });
      if (networks.length > 0) {
        console.log(`Found ${networks.length} networks for stack ${stackId}. Attempting to remove...`);
        for (const networkInfo of networks) {
          console.log(`Removing network ${networkInfo.Name} (ID: ${networkInfo.Id})...`);
          const network = docker.getNetwork(networkInfo.Id);
          try {
            await network.remove();
            console.log(`Network ${networkInfo.Name} removed.`);
          } catch (networkErr) {
            console.error(`Error removing network ${networkInfo.Name} (ID: ${networkInfo.Id}):`, networkErr);
          }
        }
      } else {
        console.log(`No networks found specifically for stack ${stackId}.`);
      }
    } catch (networkListErr) {
      console.error(`Error listing networks for stack ${stackId}:`, networkListErr);
    }
    console.log(`Stack ${stackId} processing complete. Stopped: ${stoppedCount}, Removed: ${removedCount}.`);
    try {
      await updateStackRuntimeInfoInDb(stackId, {
        status: "stopped",
        runningCount: 0,
        lastPolled: Math.floor(Date.now() / 1e3)
        // ← Solution: Unix timestamp
      });
    } catch (dbError) {
      console.error(`Error updating stack ${stackId} status in database:`, dbError);
    }
    stackCache.delete("compose-stacks");
    return true;
  } catch (err) {
    console.error(`Error during manual stop/remove for stack ${stackId}:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to stop stack ${stackId}: ${errorMessage}`);
  }
}
async function restartStack(stackId) {
  await stopStack(stackId);
  return deployStack(stackId);
}
async function redeployStack(stackId) {
  return deployStack(stackId);
}
async function renameStack(currentStackId, newName) {
  if (!currentStackId || !newName) {
    throw new Error("Current stack ID and new name must be provided.");
  }
  const currentStackDir = await getStackDir(currentStackId);
  try {
    await promises.access(currentStackDir);
  } catch (e) {
    throw new Error(`Stack with ID '${currentStackId}' not found at ${currentStackDir}.`);
  }
  const newDirBaseName = slugify(newName, {
    lower: true,
    strict: true,
    replacement: "-",
    trim: true
  });
  if (newDirBaseName === currentStackId) {
    throw new Error(`The new name '${newName}' (resolves to '${newDirBaseName}') is effectively the same as the current stack ID '${currentStackId}'. No changes made.`);
  }
  const running = await isStackRunning(currentStackId);
  if (running) {
    throw new Error(`Stack '${currentStackId}' is currently running. Please stop it before renaming.`);
  }
  const stacksDir = await ensureStacksDir();
  let newUniqueDirName = newDirBaseName;
  let counter = 1;
  const MAX_ATTEMPTS = 100;
  while (counter <= MAX_ATTEMPTS) {
    const pathToCheck = path.join(stacksDir, newUniqueDirName);
    const exists = await directoryExists(pathToCheck);
    if (!exists && newUniqueDirName !== currentStackId) {
      break;
    }
    newUniqueDirName = `${newDirBaseName}-${counter}`;
    counter++;
  }
  if (counter > MAX_ATTEMPTS || newUniqueDirName === currentStackId || await directoryExists(path.join(stacksDir, newUniqueDirName))) {
    throw new Error(`Could not generate a unique directory name for '${newName}' that is different from '${currentStackId}' and does not already exist. Please try a different name.`);
  }
  const newStackDir = path.join(stacksDir, newUniqueDirName);
  try {
    console.log(`Renaming stack directory from '${currentStackDir}' to '${newStackDir}'...`);
    await promises.rename(currentStackDir, newStackDir);
    console.log(`Stack directory for '${currentStackId}' successfully renamed to '${newUniqueDirName}'.`);
    try {
      await deleteStackFromDb(currentStackId);
      const updatedStack = await getStack(newUniqueDirName);
      await saveStackToDb(updatedStack);
    } catch (dbError) {
      console.error(`Error updating database after renaming stack:`, dbError);
    }
    stackCache.delete("compose-stacks");
    return await getStack(newUniqueDirName);
  } catch (err) {
    console.error(`Error renaming stack directory for '${currentStackId}' to '${newUniqueDirName}':`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to rename stack: ${errorMessage}`);
  }
}
async function discoverExternalStacks() {
  try {
    const docker = await getDockerClient();
    const containers = await docker.listContainers({ all: true });
    const composeProjectLabel = "com.docker.compose.project";
    const composeServiceLabel = "com.docker.compose.service";
    const projectMap = {};
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
            ExitCode: 0
          }
        });
      }
    });
    const externalStacks = [];
    for (const [projectName, services] of Object.entries(projectMap)) {
      const stackDir = await getStackDir(projectName);
      try {
        await promises.access(stackDir);
        continue;
      } catch {
      }
      const serviceCount = services.length;
      const runningCount = services.filter((s) => s.state.Running).length;
      let status = "stopped";
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
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    return externalStacks;
  } catch (err) {
    console.error("Error discovering external stacks:", err);
    return [];
  }
}
async function importExternalStack(stackId) {
  const docker = await getDockerClient();
  const containers = await docker.listContainers({ all: true });
  const stackContainers = containers.filter((container2) => {
    const labels2 = container2.Labels || {};
    return labels2["com.docker.compose.project"] === stackId;
  });
  if (stackContainers.length === 0) {
    throw new Error(`No containers found for stack '${stackId}'`);
  }
  const container = stackContainers[0];
  const labels = container.Labels || {};
  let composeContent = "";
  let envContent = void 0;
  let actualComposeFilePathUsed = "";
  const configFilesLabel = labels["com.docker.compose.project.config_files"];
  if (configFilesLabel) {
    const potentialComposePaths = configFilesLabel.split(",").map((p) => p.trim()).filter((p) => p);
    let pathToTry = "";
    if (potentialComposePaths.length > 0) {
      const primaryNames = ["compose.yaml", "docker-compose.yml", "compose.yml", "docker-compose.yaml"];
      for (const name of primaryNames) {
        const foundPath = potentialComposePaths.find((p) => path.basename(p) === name);
        if (foundPath) {
          pathToTry = foundPath;
          break;
        }
      }
      if (!pathToTry) {
        pathToTry = potentialComposePaths[0];
      }
    }
    if (pathToTry) {
      actualComposeFilePathUsed = pathToTry;
      try {
        console.log(`Attempting to read compose file for import from: ${actualComposeFilePathUsed}`);
        composeContent = await promises.readFile(actualComposeFilePathUsed, "utf8");
        console.log(`Successfully read compose file: ${actualComposeFilePathUsed}. Content length: ${composeContent.length}`);
        const composeFileDir = path.dirname(actualComposeFilePathUsed);
        const envFilePath = path.join(composeFileDir, ".env");
        try {
          envContent = await promises.readFile(envFilePath, "utf8");
          console.log(`Successfully read .env file from: ${envFilePath}`);
        } catch (envErr) {
          const nodeEnvErr = envErr;
          if (nodeEnvErr.code === "ENOENT") {
            console.log(`.env file not found at ${envFilePath}, proceeding without it.`);
          } else {
            console.warn(`Could not read .env file at ${envFilePath} during import:`, envErr);
          }
        }
      } catch (err) {
        console.warn(`Could not read compose file at ${actualComposeFilePathUsed} during import:`, err);
      }
    } else {
      console.warn(`No suitable compose file path found in 'com.docker.compose.project.config_files' label: "${configFilesLabel}"`);
    }
  } else {
    console.warn(`Label 'com.docker.compose.project.config_files' not found for stack '${stackId}'. Will attempt to generate compose file.`);
  }
  if (!composeContent) {
    console.log(`Generating compose file for stack '${stackId}' as no existing file could be read or found.`);
    const services = {};
    for (const cont of stackContainers) {
      const containerLabels = cont.Labels || {};
      const serviceName = containerLabels["com.docker.compose.service"] || cont.Names[0]?.replace(`/${stackId}_`, "").replace(/_\d+$/, "") || `service_${cont.Id.substring(0, 8)}`;
      services[serviceName] = {
        image: cont.Image
      };
    }
    composeContent = `# Generated compose file for imported stack: ${stackId}
# This was automatically generated by Arcane from an external stack.
# The original compose file could not be read from: ${actualComposeFilePathUsed || "path not specified in labels"}.
# You may need to adjust this manually for correct operation.

services:
${dump({ services }, { indent: 2 }).substring("services:".length).trimStart()}`;
  }
  stackCache.delete("compose-stacks");
  return await createStack(stackId, normalizeHealthcheckTest(composeContent), envContent);
}
async function listStacks(includeExternal = false) {
  const managedStacks = await loadComposeStacks();
  let allStacks = [...managedStacks];
  if (includeExternal) {
    const externalStacksList = await discoverExternalStacks();
    const processedExternalStacks = externalStacksList.map((stack) => ({
      ...stack,
      hasArcaneMeta: false
    }));
    allStacks = [...allStacks, ...processedExternalStacks];
  }
  return allStacks;
}
async function isStackRunning(stackId) {
  const docker = await getDockerClient();
  const composeProjectLabel = "com.docker.compose.project";
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: JSON.stringify({
        label: [`${composeProjectLabel}=${stackId}`]
      })
    });
    const allContainers = await docker.listContainers({ all: true });
    const nameFilteredContainers = allContainers.filter((c) => !containers.some((fc) => fc.Id === c.Id) && (c.Labels?.[composeProjectLabel] === stackId || c.Names?.some((name) => name.startsWith(`/${stackId}_`))));
    const stackContainers = [...containers, ...nameFilteredContainers];
    return stackContainers.some((c) => c.State === "running");
  } catch (err) {
    console.error(`Error checking if stack ${stackId} is running:`, err);
    return false;
  }
}
async function createStackNetworks(docker, stackId, networks) {
  if (!networks || Object.keys(networks).length === 0) {
    const defaultNetworkName = `${stackId}_default`;
    try {
      await docker.createNetwork({
        Name: defaultNetworkName,
        Driver: "bridge",
        Labels: {
          "com.docker.compose.project": stackId,
          "com.docker.compose.network": "default"
        }
      });
    } catch (err) {
      if (err.statusCode === 409) {
        console.log(`Default network ${defaultNetworkName} already exists, reusing it.`);
      } else {
        throw err;
      }
    }
    return;
  }
  for (const [networkName, networkConfig] of Object.entries(networks)) {
    if (!networkConfig) {
      continue;
    }
    try {
      validateExternalResource(networkName, networkConfig, "network");
    } catch (error) {
      throw new Error(`Network validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (networkConfig.external) {
      const externalName = typeof networkConfig.external === "object" && networkConfig.external.name ? networkConfig.external.name : typeof networkConfig.external === "string" ? networkConfig.external : networkConfig.name || networkName;
      console.log(`Using external network: ${externalName}`);
      continue;
    }
    const networkToCreate = {
      Name: networkConfig.name || `${stackId}_${networkName}`,
      Driver: networkConfig.driver || "bridge",
      Labels: {
        "com.docker.compose.project": stackId,
        "com.docker.compose.network": networkName,
        // Handle labels that can be object or array
        ...Array.isArray(networkConfig.labels) ? Object.fromEntries(
          networkConfig.labels.map((label) => {
            const [key, value] = label.split("=", 2);
            return [key, value || ""];
          })
        ) : networkConfig.labels || {}
      },
      Options: networkConfig.driver_opts || {}
    };
    if (networkConfig.ipam) {
      networkToCreate.IPAM = {
        Driver: networkConfig.ipam.driver || "default",
        Config: networkConfig.ipam.config || [],
        Options: networkConfig.ipam.options || {}
      };
    }
    try {
      console.log(`Creating network: ${networkToCreate.Name}`);
      await docker.createNetwork(networkToCreate);
      console.log(`Successfully created network: ${networkToCreate.Name}`);
    } catch (err) {
      if (err.statusCode === 409) {
        console.log(`Network ${networkToCreate.Name} already exists, reusing it.`);
      } else {
        console.error(`Error creating network ${networkToCreate.Name}:`, err);
        throw err;
      }
    }
  }
}
async function pullImage(docker, imageTag) {
  return new Promise((resolve, reject) => {
    docker.pull(imageTag, {}, (pullError, stream) => {
      if (pullError) {
        reject(pullError);
        return;
      }
      if (!stream) {
        reject(new Error(`Docker pull for ${imageTag} did not return a stream.`));
        return;
      }
      docker.modem.followProgress(
        stream,
        (progressError, output) => {
          if (progressError) {
            reject(progressError);
          } else {
            console.log(`Successfully pulled image: ${imageTag}`);
            resolve();
          }
        },
        (event) => {
          if (event.progress) {
            console.log(`${imageTag}: ${event.status} ${event.progress}`);
          } else if (event.status) {
            console.log(`${imageTag}: ${event.status}`);
          }
        }
      );
    });
  });
}
async function createAndStartServices(docker, stackId, composeData, stackDir) {
  if (!composeData || !composeData.services) {
    throw new Error(`No services defined in compose file for stack ${stackId}`);
  }
  console.log(`Creating and starting ${Object.keys(composeData.services).length} services for stack ${stackId}`);
  let envVars = {};
  try {
    const envContent = await loadEnvFile(stackId);
    envVars = parseEnvContent(envContent);
  } catch (envError) {
    console.log(`No .env file found for stack ${stackId}, proceeding without env vars`);
  }
  const getEnvVar = (key) => {
    return envVars[key] || process.env[key];
  };
  const processedComposeData = substituteVariablesInObject(composeData, getEnvVar);
  let serviceOrder;
  try {
    const dependencyResolution = resolveDependencyOrderWithConditions(processedComposeData.services);
    serviceOrder = dependencyResolution.order;
    console.log(`Enhanced service startup order for stack ${stackId}: [${serviceOrder.join(", ")}]`);
    console.log(`Service deployment batches:`, dependencyResolution.batches);
    if (dependencyResolution.warnings.length > 0) {
      console.warn(`Dependency order warnings for stack ${stackId}:`, dependencyResolution.warnings);
    }
  } catch (depError) {
    console.warn(`Could not resolve enhanced dependencies for stack ${stackId}, falling back to basic resolution:`, depError);
    try {
      serviceOrder = resolveDependencyOrder(processedComposeData.services);
    } catch (basicDepError) {
      console.warn(`Basic dependency resolution also failed, using alphabetical order:`, basicDepError);
      serviceOrder = Object.keys(processedComposeData.services).sort();
    }
  }
  const volumeDefinitions = createVolumeDefinitions(processedComposeData, stackId);
  for (const volumeDef of volumeDefinitions) {
    try {
      console.log(`Creating volume: ${volumeDef.name}`);
      await docker.createVolume({
        Name: volumeDef.name,
        ...volumeDef.config
      });
      console.log(`Successfully created volume: ${volumeDef.name}`);
    } catch (createErr) {
      if (createErr.statusCode === 409) {
        console.log(`Volume ${volumeDef.name} already exists, reusing it.`);
      } else {
        console.error(`Error creating volume ${volumeDef.name}:`, createErr);
        throw createErr;
      }
    }
  }
  for (const serviceName of serviceOrder) {
    const serviceConfig = composeData.services[serviceName];
    if (!serviceConfig) {
      console.warn(`Service ${serviceName} not found in processed compose data, skipping`);
      continue;
    }
    console.log(`Creating service: ${serviceName}`);
    if (!serviceConfig.image && !serviceConfig.build) {
      throw new Error(`Service ${serviceName} must specify either 'image' or 'build'`);
    }
    if (serviceConfig.depends_on) {
      const dependencyConfig = createDependencyWaitConfig(serviceName, serviceConfig);
      if (dependencyConfig.warnings.length > 0) {
        console.warn(`Dependency warnings for service ${serviceName}:`, dependencyConfig.warnings);
      }
      for (const dep of dependencyConfig.dependencies) {
        console.log(`Waiting for dependency: ${dep.service} (condition: ${dep.condition}, timeout: ${dep.timeout}ms)`);
        try {
          await waitForDependency(stackId, dep.service, dep.condition, dep.timeout, dep.restart);
        } catch (depError) {
          const errorMsg = `Failed to satisfy dependency '${dep.service}' for service '${serviceName}': ${depError instanceof Error ? depError.message : String(depError)}`;
          console.error(errorMsg);
          if (dep.condition === "service_healthy" || dep.condition === "service_completed_successfully") {
            throw new Error(errorMsg);
          } else {
            console.warn(`Continuing deployment despite dependency failure: ${errorMsg}`);
          }
        }
      }
    }
    let containerName = validateContainerName(serviceName, serviceConfig, stackId);
    if (containerName.includes("${")) {
      console.warn(`CRITICAL: Unresolved variable in container_name for service '${serviceName}': ${containerName}. Using default name: ${stackId}_${serviceName}_1`);
      containerName = `${stackId}_${serviceName}_1`;
    }
    let containerConfig = {
      name: containerName,
      Image: serviceConfig.image,
      Labels: {
        "com.docker.compose.project": stackId,
        "com.docker.compose.service": serviceName,
        "com.docker.compose.config-hash": generateConfigHash(serviceConfig),
        "com.docker.compose.version": DEFAULT_COMPOSE_VERSION,
        ...serviceConfig.labels || {}
      },
      Env: await prepareEnvironmentVariables(serviceConfig.environment, stackDir),
      HostConfig: {
        RestartPolicy: prepareRestartPolicy(serviceConfig.restart),
        Binds: prepareVolumes(serviceConfig.volumes ?? [], processedComposeData, stackId),
        PortBindings: preparePorts(serviceConfig.ports ?? []),
        Memory: serviceConfig.mem_limit ? parseMemory(serviceConfig.mem_limit) : void 0,
        NanoCpus: serviceConfig.cpus ? Math.floor(parseFloat(String(serviceConfig.cpus)) * 1e9) : void 0,
        ExtraHosts: prepareExtraHosts(Array.isArray(serviceConfig.extra_hosts) ? serviceConfig.extra_hosts : []),
        Ulimits: prepareUlimits(serviceConfig.ulimits),
        LogConfig: prepareLogConfig(serviceConfig.logging || {}),
        Dns: serviceConfig.dns || [],
        DnsOptions: serviceConfig.dns_opt || [],
        DnsSearch: serviceConfig.dns_search || [],
        CapAdd: serviceConfig.cap_add || [],
        CapDrop: serviceConfig.cap_drop || [],
        Privileged: serviceConfig.privileged || false,
        ReadonlyRootfs: serviceConfig.read_only || false
      }
    };
    containerConfig = enhanceContainerConfig(containerConfig, serviceConfig);
    if (serviceConfig.command) {
      containerConfig.Cmd = Array.isArray(serviceConfig.command) ? serviceConfig.command : [serviceConfig.command];
    }
    if (serviceConfig.entrypoint) {
      containerConfig.Entrypoint = Array.isArray(serviceConfig.entrypoint) ? serviceConfig.entrypoint : [serviceConfig.entrypoint];
    }
    if (serviceConfig.working_dir) containerConfig.WorkingDir = serviceConfig.working_dir;
    if (serviceConfig.user) containerConfig.User = serviceConfig.user;
    if (serviceConfig.network_mode) {
      containerConfig.HostConfig.NetworkMode = serviceConfig.network_mode;
    } else if (serviceConfig.networks) {
      const networks = Array.isArray(serviceConfig.networks) ? serviceConfig.networks : Object.keys(serviceConfig.networks);
      if (networks.length > 0) {
        const primaryNetwork = networks[0];
        const networkDefinition = processedComposeData.networks?.[primaryNetwork];
        let fullNetworkName;
        if (networkDefinition?.external) {
          if (typeof networkDefinition.external === "object" && networkDefinition.external.name) {
            fullNetworkName = networkDefinition.external.name;
          } else if (typeof networkDefinition.external === "string") {
            fullNetworkName = networkDefinition.external;
          } else if (networkDefinition.name) {
            fullNetworkName = networkDefinition.name;
          } else {
            fullNetworkName = primaryNetwork;
          }
        } else {
          fullNetworkName = networkDefinition?.name || `${stackId}_${primaryNetwork}`;
        }
        containerConfig.HostConfig.NetworkMode = fullNetworkName;
        if (!Array.isArray(serviceConfig.networks)) {
          const networkConfig = serviceConfig.networks[primaryNetwork];
          if (networkConfig && typeof networkConfig === "object") {
            if (!containerConfig.NetworkingConfig) {
              containerConfig.NetworkingConfig = { EndpointsConfig: {} };
            }
            const endpointConfig = {};
            if (networkConfig.ipv4_address) {
              endpointConfig.IPAMConfig = {
                IPv4Address: networkConfig.ipv4_address
              };
              console.log(`SETTING STATIC IP: ${networkConfig.ipv4_address} for service ${serviceName} on network ${fullNetworkName}`);
            }
            if (networkConfig.aliases && Array.isArray(networkConfig.aliases)) {
              endpointConfig.Aliases = networkConfig.aliases;
            }
            containerConfig.NetworkingConfig.EndpointsConfig[fullNetworkName] = endpointConfig;
          }
        }
      }
    }
    if (serviceConfig.healthcheck) {
      containerConfig.Healthcheck = prepareHealthcheck(serviceConfig.healthcheck);
    }
    try {
      console.log(`Creating container: ${containerName}`);
      const container = await docker.createContainer(containerConfig);
      console.log(`Successfully created container: ${containerName} (ID: ${container.id})`);
      if (serviceConfig.networks && !serviceConfig.network_mode) {
        const networks = Array.isArray(serviceConfig.networks) ? serviceConfig.networks : Object.keys(serviceConfig.networks);
        const additionalNetworks = networks.slice(1);
        for (const netName of additionalNetworks) {
          try {
            const networkDefinition = processedComposeData.networks?.[netName];
            let fullNetworkName;
            if (networkDefinition?.external) {
              if (typeof networkDefinition.external === "object" && networkDefinition.external.name) {
                fullNetworkName = networkDefinition.external.name;
              } else if (typeof networkDefinition.external === "string") {
                fullNetworkName = networkDefinition.external;
              } else if (networkDefinition.name) {
                fullNetworkName = networkDefinition.name;
              } else {
                fullNetworkName = netName;
              }
            } else {
              fullNetworkName = networkDefinition?.name || `${stackId}_${netName}`;
            }
            const endpointConfig = {};
            if (!Array.isArray(serviceConfig.networks)) {
              const serviceNetConfig = serviceConfig.networks[netName];
              if (serviceNetConfig && typeof serviceNetConfig === "object") {
                const ipamConfig = {};
                if (serviceNetConfig.ipv4_address) {
                  ipamConfig.IPv4Address = serviceNetConfig.ipv4_address;
                  console.log(`Connecting container ${container.id} to network: ${fullNetworkName} with static IP: ${serviceNetConfig.ipv4_address}`);
                }
                if (serviceNetConfig.ipv6_address) {
                  ipamConfig.IPv6Address = serviceNetConfig.ipv6_address;
                }
                if (Object.keys(ipamConfig).length > 0) {
                  endpointConfig.IPAMConfig = ipamConfig;
                }
                if (serviceNetConfig.aliases && Array.isArray(serviceNetConfig.aliases)) {
                  endpointConfig.Aliases = serviceNetConfig.aliases;
                }
              }
            }
            const network = docker.getNetwork(fullNetworkName);
            await network.connect({
              Container: container.id,
              EndpointConfig: endpointConfig
            });
            console.log(`Connected container ${container.id} to network: ${fullNetworkName} with config:`, endpointConfig);
          } catch (netErr) {
            console.error(`Error connecting container to network ${netName}:`, netErr);
          }
        }
      }
      console.log(`Starting container: ${containerName} (ID: ${container.id})`);
      await container.start();
      console.log(`Successfully started container: ${containerName}`);
    } catch (createErr) {
      console.error(`Error creating/starting container for service ${serviceName}:`, createErr);
      throw createErr;
    }
  }
  console.log(`Successfully created and started all services for stack ${stackId}`);
}
async function deployStackWithExternalNetworks(stackId, composeData, stackDir) {
  const docker = await getDockerClient();
  console.log(`Pulling images for stack ${stackId} with external networks...`);
  for (const [serviceName, serviceConfig] of Object.entries(composeData.services || {})) {
    const serviceImage = serviceConfig.image;
    if (serviceImage) {
      console.log(`Pulling image for service ${serviceName}: ${serviceImage}`);
      try {
        await pullImage(docker, serviceImage);
      } catch (pullErr) {
        console.warn(`Warning: Failed to pull image ${serviceImage} for service ${serviceName}:`, pullErr);
      }
    }
  }
  await createStackNetworks(docker, stackId, composeData.networks || {});
  await createAndStartServices(docker, stackId, composeData, stackDir);
  console.log(`Successfully deployed stack ${stackId} with external networks`);
}
async function cleanupFailedDeployment(stackId) {
  console.log(`Cleaning up containers for failed deployment of stack ${stackId}...`);
  const docker = await getDockerClient();
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: JSON.stringify({
        label: [`com.docker.compose.project=${stackId}`]
      })
    });
    const allContainers = await docker.listContainers({ all: true });
    const nameFilteredContainers = allContainers.filter((c) => !containers.some((fc) => fc.Id === c.Id) && c.Names?.some((name) => name.startsWith(`/${stackId}_`)));
    const stackContainers = [...containers, ...nameFilteredContainers];
    if (stackContainers.length === 0) {
      console.log(`No containers found for stack ${stackId}.`);
      return;
    }
    for (const containerInfo of stackContainers) {
      const container = docker.getContainer(containerInfo.Id);
      try {
        const containerDetails = await container.inspect();
        if (containerDetails.State.Running) {
          console.log(`Stopping container ${containerInfo.Id}...`);
          await container.stop();
        }
        console.log(`Removing container ${containerInfo.Id}...`);
        await container.remove();
      } catch (err) {
        console.error(`Error cleaning up container ${containerInfo.Id}:`, err);
      }
    }
  } catch (err) {
    console.error(`Error cleaning up failed deployment for stack ${stackId}:`, err);
  }
}
async function destroyStack(stackId, removeVolumes = false, removeFiles = false) {
  try {
    console.log(`Destroying stack ${stackId} (removeVolumes: ${removeVolumes}, removeFiles: ${removeFiles})`);
    await stopStack(stackId);
    if (removeVolumes) {
      try {
        const docker = await getDockerClient();
        const volumes = await docker.listVolumes({
          filters: JSON.stringify({
            label: [`com.docker.compose.project=${stackId}`]
          })
        });
        if (volumes.Volumes && volumes.Volumes.length > 0) {
          console.log(`Found ${volumes.Volumes.length} volumes for stack ${stackId}. Removing...`);
          for (const volumeInfo of volumes.Volumes) {
            try {
              const volume = docker.getVolume(volumeInfo.Name);
              await volume.remove();
              console.log(`Removed volume: ${volumeInfo.Name}`);
            } catch (volumeError) {
              console.error(`Error removing volume ${volumeInfo.Name}:`, volumeError);
            }
          }
        } else {
          console.log(`No volumes found for stack ${stackId}`);
        }
      } catch (volumeListError) {
        console.error(`Error listing volumes for stack ${stackId}:`, volumeListError);
      }
    }
    try {
      await deleteStackFromDb(stackId);
      console.log(`Stack ${stackId} removed from database`);
    } catch (dbError) {
      console.error(`Error removing stack ${stackId} from database:`, dbError);
    }
    if (removeFiles) {
      const stackDir = await getStackDir(stackId);
      try {
        await promises.rm(stackDir, { recursive: true, force: true });
        console.log(`Stack ${stackId} files removed from ${stackDir}`);
      } catch (fileError) {
        console.error(`Error removing stack ${stackId} files:`, fileError);
        throw new Error(`Failed to remove stack files: ${fileError}`);
      }
    }
    stackCache.delete("compose-stacks");
    console.log(`Successfully destroyed stack ${stackId}`);
    return true;
  } catch (error) {
    console.error(`Error destroying stack ${stackId}:`, error);
    throw error;
  }
}
class StackRuntimeUpdater {
  updateInterval = null;
  isUpdating = false;
  start(intervalMinutes = 2) {
    if (this.updateInterval) return;
    this.updateInterval = setInterval(
      async () => {
        if (this.isUpdating) return;
        this.isUpdating = true;
        try {
          await this.updateAllStacksRuntimeInfo();
        } catch (error) {
          console.error("Background stack runtime update failed:", error);
        } finally {
          this.isUpdating = false;
        }
      },
      intervalMinutes * 60 * 1e3
    );
    console.log(`Stack runtime updater started (${intervalMinutes}m interval)`);
  }
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  async updateAllStacksRuntimeInfo() {
    try {
      const stacks = await listStacksFromDb();
      console.log(`Background updating runtime info for ${stacks.length} stacks`);
      for (const stack of stacks) {
        try {
          await this.updateSingleStackRuntimeInfo(stack.id);
        } catch (error) {
          console.warn(`Failed to update runtime info for stack ${stack.id}:`, error);
        }
      }
      stackCache.delete("compose-stacks");
    } catch (error) {
      console.error("Background runtime update failed:", error);
    }
  }
  async updateSingleStackRuntimeInfo(stackId) {
    const stack = await getStackByIdFromDb(stackId);
    if (!stack) return;
    let composeContent = stack.composeContent;
    if (!composeContent) {
      const composePath = await getComposeFilePath(stackId);
      if (composePath) {
        composeContent = await promises.readFile(composePath, "utf8");
        await updateStackContentInDb(stackId, { composeContent });
      }
    }
    const services = await getStackServices(stackId, composeContent || "");
    const serviceCount = services.length;
    const runningCount = services.filter((s) => s.state?.Running).length;
    let status = "stopped";
    if (serviceCount === 0) {
      status = "unknown";
    } else if (runningCount === serviceCount) {
      status = "running";
    } else if (runningCount > 0) {
      status = "partially running";
    }
    await updateStackRuntimeInfoInDb(stackId, {
      status,
      serviceCount,
      runningCount,
      lastPolled: /* @__PURE__ */ new Date()
    });
  }
}
async function waitForDependency(stackId, depServiceName, condition = "service_started", timeout = 3e4, restart = false) {
  const docker = await getDockerClient();
  const pollInterval = 1e3;
  const startTime = Date.now();
  console.log(`Waiting for dependency '${depServiceName}' with condition '${condition}' for stack ${stackId} (timeout: ${timeout}ms)`);
  while (Date.now() - startTime < timeout) {
    try {
      const containers = await docker.listContainers({
        all: true,
        filters: JSON.stringify({
          label: [`com.docker.compose.project=${stackId}`, `com.docker.compose.service=${depServiceName}`]
        })
      });
      if (containers.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        continue;
      }
      const depContainer = containers[0];
      const conditionMet = await checkDependencyCondition(docker, depContainer, condition);
      if (conditionMet.satisfied) {
        console.log(`Dependency '${depServiceName}' satisfied condition '${condition}': ${conditionMet.reason}`);
        return;
      }
      if (restart && conditionMet.shouldRestart) {
        console.log(`Restarting dependency '${depServiceName}' due to: ${conditionMet.reason}`);
        try {
          const container = docker.getContainer(depContainer.Id);
          await container.restart();
          console.log(`Restarted dependency container '${depServiceName}'`);
        } catch (restartError) {
          console.warn(`Failed to restart dependency '${depServiceName}':`, restartError);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.warn(`Error checking dependency ${depServiceName}:`, error);
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
  const message = `Timeout waiting for dependency '${depServiceName}' with condition '${condition}' for stack ${stackId} (${timeout}ms)`;
  console.warn(message);
  if (condition === "service_healthy" || condition === "service_completed_successfully") {
    throw new Error(message);
  }
}
async function checkDependencyCondition(docker, containerInfo, condition) {
  switch (condition) {
    case "service_started":
      return {
        satisfied: containerInfo.State === "running",
        reason: containerInfo.State === "running" ? "Container is running" : `Container state: ${containerInfo.State}`,
        shouldRestart: false
      };
    case "service_healthy":
      if (containerInfo.State !== "running") {
        return {
          satisfied: false,
          reason: `Container not running (state: ${containerInfo.State})`,
          shouldRestart: containerInfo.State === "exited"
        };
      }
      try {
        const container = docker.getContainer(containerInfo.Id);
        const details = await container.inspect();
        if (!details.State.Health) {
          return {
            satisfied: true,
            reason: "No healthcheck defined, considering running container as healthy",
            shouldRestart: false
          };
        }
        const healthStatus = details.State.Health.Status;
        const isHealthy = healthStatus === "healthy";
        return {
          satisfied: isHealthy,
          reason: `Health status: ${healthStatus}${details.State.Health.Log ? ` (last check: ${details.State.Health.Log[details.State.Health.Log.length - 1]?.Output?.trim() || "no output"})` : ""}`,
          shouldRestart: healthStatus === "unhealthy"
        };
      } catch (inspectError) {
        return {
          satisfied: false,
          reason: `Failed to inspect container: ${inspectError instanceof Error ? inspectError.message : String(inspectError)}`,
          shouldRestart: false
        };
      }
    case "service_completed_successfully":
      if (containerInfo.State === "exited") {
        try {
          const container = docker.getContainer(containerInfo.Id);
          const details = await container.inspect();
          const exitCode = details.State.ExitCode;
          return {
            satisfied: exitCode === 0,
            reason: `Container exited with code ${exitCode}`,
            shouldRestart: exitCode !== 0
          };
        } catch (inspectError) {
          return {
            satisfied: false,
            reason: `Failed to inspect exited container: ${inspectError instanceof Error ? inspectError.message : String(inspectError)}`,
            shouldRestart: false
          };
        }
      } else if (containerInfo.State === "running") {
        return {
          satisfied: false,
          reason: "Container is still running, waiting for completion",
          shouldRestart: false
        };
      } else {
        return {
          satisfied: false,
          reason: `Container in unexpected state for completion check: ${containerInfo.State}`,
          shouldRestart: true
        };
      }
    default:
      return {
        satisfied: false,
        reason: `Unknown dependency condition: ${condition}`,
        shouldRestart: false
      };
  }
}
const stackRuntimeUpdater = new StackRuntimeUpdater();
async function getStackProfiles(stackId) {
  try {
    const composePath = await getComposeFilePath(stackId);
    if (!composePath) {
      throw new Error(`Compose file not found for stack ${stackId}`);
    }
    const composeContent = await promises.readFile(composePath, "utf8");
    const envContent = await loadEnvFile(stackId);
    const envVars = parseEnvContent(envContent);
    const getEnvVar = (key) => envVars[key] || process.env[key];
    const composeData = parseYamlContent(composeContent, getEnvVar);
    if (!composeData) {
      throw new Error(`Failed to parse compose file for stack ${stackId}`);
    }
    const allProfiles = getAllDefinedProfiles(composeData);
    const stats = getProfileUsageStats(composeData);
    const help = generateProfileHelp(composeData);
    return {
      allProfiles,
      stats,
      help
    };
  } catch (error) {
    console.error(`Error getting profiles for stack ${stackId}:`, error);
    throw error;
  }
}
async function previewStackDeployment(stackId, profiles = []) {
  try {
    const composePath = await getComposeFilePath(stackId);
    if (!composePath) {
      throw new Error(`Compose file not found for stack ${stackId}`);
    }
    const composeContent = await promises.readFile(composePath, "utf8");
    const envContent = await loadEnvFile(stackId);
    const envVars = parseEnvContent(envContent);
    const getEnvVar = (key) => envVars[key] || process.env[key];
    const composeData = parseYamlContent(composeContent, getEnvVar);
    if (!composeData) {
      throw new Error(`Failed to parse compose file for stack ${stackId}`);
    }
    const activeProfiles = profiles.length ? profiles : parseActiveProfiles([], envVars);
    const deploymentPlan = createProfileDeploymentPlan(composeData, activeProfiles);
    const profileInfo = await getStackProfiles(stackId);
    return {
      deploymentPlan,
      profileInfo
    };
  } catch (error) {
    console.error(`Error previewing deployment for stack ${stackId}:`, error);
    throw error;
  }
}
async function detectStackChanges(stackId) {
  try {
    const composePath = await getComposeFilePath(stackId);
    if (!composePath) {
      throw new Error(`Compose file not found for stack ${stackId}`);
    }
    const composeContent = await promises.readFile(composePath, "utf8");
    const envContent = await loadEnvFile(stackId);
    const envVars = parseEnvContent(envContent);
    const getEnvVar = (key) => envVars[key] || process.env[key];
    const composeData = parseYamlContent(composeContent, getEnvVar);
    if (!composeData || !composeData.services) {
      return { hasChanges: false, changedServices: [], newServices: [], removedServices: [] };
    }
    const docker = await getDockerClient();
    const containers = await docker.listContainers({
      all: true,
      filters: JSON.stringify({
        label: [`com.docker.compose.project=${stackId}`]
      })
    });
    const runningServices = /* @__PURE__ */ new Map();
    for (const container of containers) {
      const serviceName = container.Labels?.["com.docker.compose.service"];
      const configHash = container.Labels?.["com.docker.compose.config-hash"];
      if (serviceName && configHash) {
        runningServices.set(serviceName, configHash);
      }
    }
    const changedServices = [];
    const newServices = [];
    const currentServices = /* @__PURE__ */ new Set();
    for (const [serviceName, serviceConfig] of Object.entries(composeData.services)) {
      currentServices.add(serviceName);
      const currentHash = generateConfigHash(serviceConfig);
      if (runningServices.has(serviceName)) {
        const runningHash = runningServices.get(serviceName);
        if (runningHash !== currentHash) {
          changedServices.push(serviceName);
        }
      } else {
        newServices.push(serviceName);
      }
    }
    const removedServices = Array.from(runningServices.keys()).filter((service) => !currentServices.has(service));
    const hasChanges = changedServices.length > 0 || newServices.length > 0 || removedServices.length > 0;
    return {
      hasChanges,
      changedServices,
      newServices,
      removedServices
    };
  } catch (error) {
    console.error(`Error detecting changes for stack ${stackId}:`, error);
    throw error;
  }
}
async function validateStackConfiguration(stackId, mode = "default") {
  try {
    const composePath = await getComposeFilePath(stackId);
    if (!composePath) {
      return {
        valid: false,
        errors: ["Compose file not found"],
        warnings: []
      };
    }
    const composeContent = await promises.readFile(composePath, "utf8");
    const envContent = await loadEnvFile(stackId);
    const validation = await validateComposeConfiguration(composeContent, envContent, mode);
    return validation;
  } catch (error) {
    return {
      valid: false,
      errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
      warnings: []
    };
  }
}
export {
  StackRuntimeUpdater,
  createStack,
  deployStack,
  destroyStack,
  detectStackChanges,
  discoverExternalStacks,
  ensureStacksDir,
  getComposeFilePath,
  getStack,
  getStackDir,
  getStackProfiles,
  importExternalStack,
  initComposeService,
  isStackRunning,
  listStacks,
  loadComposeStacks,
  loadEnvFile,
  previewStackDeployment,
  redeployStack,
  renameStack,
  restartStack,
  stackRuntimeUpdater,
  startStack,
  stopStack,
  updateStack,
  validateStackConfiguration
};
