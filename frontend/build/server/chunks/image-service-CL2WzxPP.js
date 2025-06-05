import { a as getDockerClient, d as dockerHost } from './core-C8NMHkc_.js';
import { D as DockerApiError, N as NotFoundError, R as RegistryRateLimitError, P as PublicRegistryError, a as PrivateRegistryError } from './errors.type-DfKnJ3rD.js';
import { p as parseImageNameForRegistry, a as areRegistriesEquivalent } from './registry.utils-rtYanQFp.js';
import { g as getSettings } from './settings-service-B1w8bfJq.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import { d as db } from './index4-SoK3Vczo.js';
import { i as imageMaturityTable } from './schema-CDkq0ub_.js';
import { eq, inArray, sql, lt, asc, desc, notInArray } from 'drizzle-orm';
import 'dockerode';
import '@swimlane/docker-reference';
import 'proper-lockfile';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:fs/promises';
import 'node:path';
import 'node:util';
import './settings-db-service-DyTlfQVT.js';
import 'drizzle-orm/sqlite-core';

class ImageMaturityDbService {
  /**
   * Get maturity data for a single image
   */
  async getImageMaturity(imageId) {
    const result = await db.select().from(imageMaturityTable).where(eq(imageMaturityTable.id, imageId)).limit(1);
    return result[0] || null;
  }
  /**
   * Get maturity data for multiple images
   */
  async getImageMaturityBatch(imageIds) {
    const results = /* @__PURE__ */ new Map();
    if (imageIds.length === 0) return results;
    const records = await db.select().from(imageMaturityTable).where(inArray(imageMaturityTable.id, imageIds));
    for (const record of records) {
      results.set(record.id, record);
    }
    return results;
  }
  /**
   * Store or update maturity data for an image
   */
  async setImageMaturity(imageId, repository, tag, maturity, metadata = {}) {
    const now = /* @__PURE__ */ new Date();
    let currentImageDate = null;
    let daysSince = null;
    if (maturity.date && maturity.date !== "Unknown date" && maturity.date !== "Invalid date") {
      try {
        currentImageDate = new Date(maturity.date);
        if (!isNaN(currentImageDate.getTime())) {
          daysSince = Math.floor((now.getTime() - currentImageDate.getTime()) / (1e3 * 60 * 60 * 24));
        } else {
          currentImageDate = null;
        }
      } catch {
        currentImageDate = null;
      }
    }
    const baseData = {
      id: imageId,
      repository,
      tag,
      currentVersion: maturity.version,
      latestVersion: maturity.updatesAvailable ? metadata.latestVersion || null : null,
      // Fix: use actual latest version
      status: maturity.status,
      updatesAvailable: maturity.updatesAvailable,
      currentImageDate,
      latestImageDate: null,
      // Simplified: don't handle latest image date
      daysSinceCreation: daysSince,
      registryDomain: metadata.registryDomain || null,
      isPrivateRegistry: metadata.isPrivateRegistry || false,
      lastChecked: now,
      lastError: metadata.error || null,
      responseTimeMs: metadata.responseTimeMs || null,
      updatedAt: now
    };
    await db.insert(imageMaturityTable).values({
      ...baseData,
      checkCount: 1,
      createdAt: now
    }).onConflictDoUpdate({
      target: imageMaturityTable.id,
      set: {
        ...baseData,
        checkCount: sql`${imageMaturityTable.checkCount} + 1`,
        // Don't update createdAt on conflict - keep original value
        createdAt: sql`${imageMaturityTable.createdAt}`
      }
    });
  }
  /**
   * Batch update multiple image maturity records
   */
  async setImageMaturityBatch(updates) {
    if (updates.length === 0) return;
    const batchSize = 100;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      await Promise.all(batch.map(({ imageId, repository, tag, maturity, metadata }) => this.setImageMaturity(imageId, repository, tag, maturity, metadata || {})));
    }
  }
  /**
   * Get images that need maturity checking based on last check time
   */
  async getImagesNeedingCheck(maxAgeMinutes = 120, limit = 100) {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1e3);
    return await db.select().from(imageMaturityTable).where(lt(imageMaturityTable.lastChecked, cutoffTime)).orderBy(asc(imageMaturityTable.lastChecked)).limit(limit);
  }
  /**
   * Get images with available updates
   */
  async getImagesWithUpdates() {
    return await db.select().from(imageMaturityTable).where(eq(imageMaturityTable.updatesAvailable, true)).orderBy(desc(imageMaturityTable.lastChecked));
  }
  /**
   * Get images by repository
   */
  async getImagesByRepository(repository) {
    return await db.select().from(imageMaturityTable).where(eq(imageMaturityTable.repository, repository)).orderBy(desc(imageMaturityTable.lastChecked));
  }
  /**
   * Delete maturity records for images that no longer exist
   */
  async cleanupOrphanedRecords(existingImageIds) {
    if (existingImageIds.length === 0) {
      const result2 = await db.delete(imageMaturityTable);
      return result2.rowsAffected || 0;
    }
    const result = await db.delete(imageMaturityTable).where(notInArray(imageMaturityTable.id, existingImageIds));
    return result.rowsAffected || 0;
  }
  /**
   * Clean up old records (older than specified days)
   */
  async cleanupOldRecords(daysOld = 30) {
    const cutoffTime = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1e3);
    const result = await db.delete(imageMaturityTable).where(lt(imageMaturityTable.lastChecked, cutoffTime));
    return result.rowsAffected || 0;
  }
  /**
   * Invalidate maturity records by setting lastChecked to an old date
   */
  async invalidateRecords(imageIds) {
    if (imageIds.length === 0) return 0;
    const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
    const result = await db.update(imageMaturityTable).set({
      lastChecked: oldDate,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(inArray(imageMaturityTable.id, imageIds));
    return result.rowsAffected || 0;
  }
  /**
   * Invalidate maturity records for a specific repository
   */
  async invalidateRepository(repository) {
    const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
    const result = await db.update(imageMaturityTable).set({
      lastChecked: oldDate,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(imageMaturityTable.repository, repository));
    return result.rowsAffected || 0;
  }
  /**
   * Get maturity statistics
   */
  async getMaturityStats() {
    const now = /* @__PURE__ */ new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1e3);
    const oneHourAgoUnix = Math.floor(oneHourAgo.getTime() / 1e3);
    const stats = await db.select({
      total: sql`COUNT(*)`,
      withUpdates: sql`SUM(CASE WHEN ${imageMaturityTable.updatesAvailable} = 1 THEN 1 ELSE 0 END)`,
      matured: sql`SUM(CASE WHEN ${imageMaturityTable.status} = 'Matured' THEN 1 ELSE 0 END)`,
      notMatured: sql`SUM(CASE WHEN ${imageMaturityTable.status} = 'Not Matured' THEN 1 ELSE 0 END)`,
      unknown: sql`SUM(CASE WHEN ${imageMaturityTable.status} = 'Unknown' THEN 1 ELSE 0 END)`,
      avgDays: sql`AVG(${imageMaturityTable.daysSinceCreation})`,
      recentlyChecked: sql`SUM(CASE WHEN ${imageMaturityTable.lastChecked} > ${oneHourAgoUnix} THEN 1 ELSE 0 END)`
    }).from(imageMaturityTable);
    const result = stats[0];
    return {
      total: result.total || 0,
      withUpdates: result.withUpdates || 0,
      matured: result.matured || 0,
      notMatured: result.notMatured || 0,
      unknown: result.unknown || 0,
      averageAge: result.avgDays || 0,
      recentlyChecked: result.recentlyChecked || 0
    };
  }
  /**
   * Convert database record to ImageMaturity format for backward compatibility
   */
  recordToImageMaturity(record) {
    return {
      version: record.currentVersion,
      date: record.currentImageDate?.toLocaleDateString() || "Unknown date",
      status: record.status,
      updatesAvailable: record.updatesAvailable
    };
  }
}
const imageMaturityDb = new ImageMaturityDbService();
let maturityPollingInterval = null;
async function initMaturityPollingScheduler() {
  const settings = await getSettings();
  if (maturityPollingInterval) {
    clearInterval(maturityPollingInterval);
    maturityPollingInterval = null;
  }
  if (!settings.pollingEnabled) {
    console.log("Image maturity polling is disabled in settings");
    return;
  }
  const intervalMinutes = settings.pollingInterval || 10;
  const intervalMs = intervalMinutes * 60 * 1e3;
  console.log(`Starting image maturity polling with interval of ${intervalMinutes} minutes`);
  maturityPollingInterval = setInterval(runMaturityChecks, intervalMs);
  runMaturityChecks();
}
async function runMaturityChecks() {
  console.log("Running scheduled image maturity checks...");
  const imagesResult = await tryCatch(listImages());
  if (imagesResult.error) {
    console.error("Error during scheduled maturity check:", imagesResult.error);
    return;
  }
  const images = imagesResult.data;
  const validImages = images.filter((image) => image.repo !== "<none>" && image.tag !== "<none>");
  console.log(`Found ${validImages.length} valid images to check maturity for`);
  if (validImages.length === 0) {
    console.log("No valid images found for maturity checking");
    return;
  }
  const existingImageIds = validImages.map((img) => img.Id);
  const cleanedUp = await imageMaturityDb.cleanupOrphanedRecords(existingImageIds);
  if (cleanedUp > 0) {
    console.log(`Cleaned up ${cleanedUp} orphaned maturity records`);
  }
  const settings = await getSettings();
  const checkIntervalMinutes = settings.pollingInterval || 120;
  const imagesToCheck = await imageMaturityDb.getImagesNeedingCheck(checkIntervalMinutes, 50);
  const imageIdsNeedingCheck = new Set(imagesToCheck.map((record) => record.id));
  for (const image of validImages) {
    const existing = await imageMaturityDb.getImageMaturity(image.Id);
    if (!existing) {
      imageIdsNeedingCheck.add(image.Id);
    }
  }
  const imagesToProcess = validImages.filter((img) => imageIdsNeedingCheck.has(img.Id));
  console.log(`${imagesToProcess.length} images need fresh maturity checks`);
  if (imagesToProcess.length === 0) {
    console.log("All images have recent maturity data");
    return;
  }
  const batchSize = 10;
  let checkedCount = 0;
  let updatesFound = 0;
  const updates = [];
  for (let i = 0; i < imagesToProcess.length; i += batchSize) {
    const batch = imagesToProcess.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(imagesToProcess.length / batchSize)}: ${batch.length} images`);
    for (const image of batch) {
      const startTime = Date.now();
      const maturityResult = await tryCatch(checkImageMaturityInternal(image.Id));
      const responseTime = Date.now() - startTime;
      if (!maturityResult.error && maturityResult.data) {
        updates.push({
          imageId: image.Id,
          repository: image.repo,
          tag: image.tag,
          maturity: maturityResult.data,
          metadata: {
            registryDomain: parseImageNameForRegistry(image.repo).registry,
            responseTimeMs: responseTime
          }
        });
        checkedCount++;
        if (maturityResult.data.updatesAvailable) {
          updatesFound++;
        }
      } else {
        updates.push({
          imageId: image.Id,
          repository: image.repo,
          tag: image.tag,
          maturity: {
            version: image.tag,
            date: "Unknown date",
            status: "Unknown",
            updatesAvailable: false
          },
          metadata: {
            registryDomain: parseImageNameForRegistry(image.repo).registry,
            responseTimeMs: responseTime,
            error: maturityResult.error?.message || "Unknown error"
          }
        });
        checkedCount++;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (updates.length > 0) {
      await imageMaturityDb.setImageMaturityBatch(updates);
      updates.length = 0;
    }
    if (i + batchSize < imagesToProcess.length) {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    }
  }
  console.log(`Maturity check completed: Checked ${checkedCount} images, found ${updatesFound} with updates`);
  const stats = await imageMaturityDb.getMaturityStats();
  console.log(`Maturity stats: ${stats.total} total, ${stats.withUpdates} with updates, ${stats.recentlyChecked} recently checked`);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("maturity-check-complete", {
        detail: {
          checkedCount,
          updatesFound,
          stats
        }
      })
    );
  }
}
async function listImages() {
  const dockerClientResult = await tryCatch(getDockerClient());
  if (dockerClientResult.error) {
    throw new DockerApiError(`Failed to get Docker client: ${dockerClientResult.error.message}`, 500);
  }
  const docker = dockerClientResult.data;
  const imagesResult = await tryCatch(docker.listImages({ all: false }));
  if (imagesResult.error) {
    throw new DockerApiError(`Failed to list Docker images: ${imagesResult.error.message}`, 500);
  }
  const dockerImages = imagesResult.data || [];
  const parseRepoTag = (tagString) => {
    if (!tagString || tagString === "<none>:<none>") {
      return { repo: "<none>", tag: "<none>" };
    }
    const withoutDigest = tagString.split("@")[0];
    const lastColon = withoutDigest.lastIndexOf(":");
    const lastSlash = withoutDigest.lastIndexOf("/");
    if (lastColon === -1 || lastSlash !== -1 && lastColon < lastSlash) {
      return { repo: withoutDigest, tag: "latest" };
    }
    return {
      repo: withoutDigest.substring(0, lastColon),
      tag: withoutDigest.substring(lastColon + 1)
    };
  };
  return dockerImages.map((img) => {
    const { repo, tag } = parseRepoTag(img.RepoTags?.[0]);
    return {
      ...img,
      // Spread all properties from Docker.ImageInfo (e.g., Id, Created, Size, Labels)
      repo,
      tag
    };
  });
}
async function getImage(imageId) {
  const dockerResult = await tryCatch(getDockerClient());
  if (dockerResult.error) {
    throw new DockerApiError(`Failed to get Docker client: ${dockerResult.error.message}`, 500);
  }
  const docker = dockerResult.data;
  const image = docker.getImage(imageId);
  const inspectResult = await tryCatch(image.inspect());
  if (inspectResult.error) {
    const error = inspectResult.error;
    if (error.statusCode === 404) {
      throw new NotFoundError(`Image "${imageId}" not found.`);
    }
    const errorMessage = error.json?.message || error.message || "Unknown Docker error";
    throw new DockerApiError(`Failed to inspect image "${imageId}": ${errorMessage}`, error.statusCode ?? 500);
  }
  return inspectResult.data;
}
async function removeImage(imageId, force = false) {
  try {
    const docker = await getDockerClient();
    const image = docker.getImage(imageId);
    await image.remove({ force });
  } catch (error) {
    if (error.statusCode === 409) {
      throw new Error(`Image "${imageId}" is being used by a container. Use force option to remove.`);
    }
    throw new Error(`Failed to remove image "${imageId}" using host "${dockerHost}". ${error.message || error.reason || ""}`);
  }
}
async function isImageInUse(imageId) {
  try {
    const docker = await getDockerClient();
    const containers = await docker.listContainers({ all: true });
    return containers.some((container) => container.ImageID === imageId || container.Image === imageId);
  } catch (error) {
    return true;
  }
}
async function pruneImages(mode = "all") {
  try {
    const docker = await getDockerClient();
    const filterValue = mode === "all" ? "false" : "true";
    const pruneOptions = {
      filters: { dangling: [filterValue] }
    };
    const result = await docker.pruneImages(pruneOptions);
    return result;
  } catch (error) {
    throw new Error(`Failed to prune images using host "${dockerHost}". ${error.message || error.reason || ""}`);
  }
}
async function pullImage(imageRef, platform, authConfig) {
  const docker = await getDockerClient();
  const pullOptions = {};
  if (platform) {
    pullOptions.platform = platform;
  }
  if (authConfig && Object.keys(authConfig).length > 0) {
    pullOptions.authconfig = authConfig;
  }
  await docker.pull(imageRef, pullOptions);
}
async function checkImageMaturity(imageId) {
  const record = await imageMaturityDb.getImageMaturity(imageId);
  if (record) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1e3);
    if (record.lastChecked > twoHoursAgo) {
      return imageMaturityDb.recordToImageMaturity(record);
    }
  }
  const imageDetails = await getImage(imageId);
  if (!imageDetails || !imageDetails.RepoTags?.[0]) {
    return void 0;
  }
  const repoTag = imageDetails.RepoTags[0];
  const lastColon = repoTag.lastIndexOf(":");
  if (lastColon === -1) return void 0;
  const repository = repoTag.substring(0, lastColon);
  const tag = repoTag.substring(lastColon + 1);
  const startTime = Date.now();
  const maturity = await checkImageMaturityInternal(imageId);
  const responseTime = Date.now() - startTime;
  if (maturity) {
    await imageMaturityDb.setImageMaturity(imageId, repository, tag, maturity, {
      registryDomain: parseImageNameForRegistry(repository).registry,
      responseTimeMs: responseTime
    });
  }
  return maturity;
}
async function checkImageMaturityBatch(imageIds) {
  const results = /* @__PURE__ */ new Map();
  const records = await imageMaturityDb.getImageMaturityBatch(imageIds);
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1e3);
  const imageIdsNeedingCheck = [];
  for (const imageId of imageIds) {
    const record = records.get(imageId);
    if (record && record.lastChecked > twoHoursAgo) {
      results.set(imageId, imageMaturityDb.recordToImageMaturity(record));
    } else {
      imageIdsNeedingCheck.push(imageId);
    }
  }
  if (imageIdsNeedingCheck.length > 0) {
    const updates = [];
    for (const imageId of imageIdsNeedingCheck) {
      try {
        const imageDetails = await getImage(imageId);
        if (!imageDetails || !imageDetails.RepoTags?.[0]) {
          continue;
        }
        const repoTag = imageDetails.RepoTags[0];
        const lastColon = repoTag.lastIndexOf(":");
        if (lastColon === -1) continue;
        const repository = repoTag.substring(0, lastColon);
        const tag = repoTag.substring(lastColon + 1);
        const startTime = Date.now();
        const maturity = await checkImageMaturityInternal(imageId);
        const responseTime = Date.now() - startTime;
        if (maturity) {
          results.set(imageId, maturity);
          updates.push({
            imageId,
            repository,
            tag,
            maturity,
            metadata: {
              registryDomain: parseImageNameForRegistry(repository).registry,
              responseTimeMs: responseTime
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to check maturity for image ${imageId}:`, error);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (updates.length > 0) {
      await imageMaturityDb.setImageMaturityBatch(updates);
    }
  }
  return results;
}
async function checkImageMaturityInternal(imageId) {
  const imageResult = await tryCatch(getImage(imageId));
  if (imageResult.error) {
    console.warn(`checkImageMaturityInternal: Failed to get image details for ${imageId}:`, imageResult.error);
    return void 0;
  }
  const imageDetails = imageResult.data;
  const repoTag = imageDetails.RepoTags?.[0];
  if (!repoTag || repoTag.includes("<none>")) {
    return void 0;
  }
  const lastColon = repoTag.lastIndexOf(":");
  if (lastColon === -1) {
    return void 0;
  }
  const repository = repoTag.substring(0, lastColon);
  const currentTag = repoTag.substring(lastColon + 1);
  let localCreatedDate = void 0;
  if (imageDetails.Created) {
    const parsedDate = new Date(imageDetails.Created);
    if (!isNaN(parsedDate.getTime())) {
      localCreatedDate = parsedDate;
    } else {
      console.warn(`checkImageMaturityInternal: Invalid Created date string for image ${imageId}: ${imageDetails.Created}`);
    }
  }
  const registryInfoResult = await tryCatch(getRegistryInfo(repository, currentTag, localCreatedDate));
  if (registryInfoResult.error) {
    if (registryInfoResult.error instanceof RegistryRateLimitError) {
      console.warn(`Registry rate limit hit for ${repository}:${currentTag}: ${registryInfoResult.error.message}`);
    } else if (registryInfoResult.error instanceof PublicRegistryError || registryInfoResult.error instanceof PrivateRegistryError) {
      console.warn(`Registry access error for ${repository}:${currentTag}: ${registryInfoResult.error.message}`);
    } else {
      console.error(`Error getting registry info for ${repository}:${currentTag}:`, registryInfoResult.error);
    }
    return void 0;
  }
  return registryInfoResult.data;
}
async function getRegistryInfo(repository, currentTag, localCreatedDate) {
  try {
    const { registry: registryDomain } = parseImageNameForRegistry(repository);
    try {
      const publicMaturityInfo = await checkPublicRegistry(repository, registryDomain, currentTag, localCreatedDate);
      if (publicMaturityInfo) {
        return publicMaturityInfo;
      }
    } catch (error) {
      if (error instanceof RegistryRateLimitError) {
        throw error;
      }
      console.warn(`Public registry check failed for ${repository}:${currentTag} (will try private if configured): ${error.message}`);
    }
    const settings = await getSettings();
    if (settings.registryCredentials && settings.registryCredentials.length > 0) {
      const matchingCredentials = settings.registryCredentials.filter((cred) => areRegistriesEquivalent(cred.url, registryDomain));
      if (matchingCredentials.length > 0) {
        console.log(`Found ${matchingCredentials.length} potential private credential(s) for domain ${registryDomain} for image ${repository}:${currentTag}.`);
      }
      for (const credential of matchingCredentials) {
        try {
          console.log(`Attempting private registry check for ${repository}:${currentTag} using credential for URL: ${credential.url}`);
          const privateMaturityInfo = await checkPrivateRegistry(repository, registryDomain, currentTag, credential, localCreatedDate);
          if (privateMaturityInfo) {
            return privateMaturityInfo;
          }
        } catch (error) {
          if (error instanceof RegistryRateLimitError) {
            console.warn(`Private registry check for ${repository}:${currentTag} hit rate limit with credential for ${credential.url}.`);
            throw error;
          } else if (error instanceof PrivateRegistryError) {
            console.warn(`Private registry check failed for ${repository}:${currentTag} with credential for ${credential.url}: ${error.message}. Trying next if available.`);
          } else {
            console.error(`Unexpected error during private registry check for ${repository}:${currentTag} with credential for ${credential.url}:`, error);
          }
        }
      }
    }
    return void 0;
  } catch (error) {
    if (error instanceof RegistryRateLimitError || error instanceof PublicRegistryError || error instanceof PrivateRegistryError) {
      throw error;
    }
    console.error(`Unexpected error in getRegistryInfo for ${repository}:${currentTag}:`, error);
    return void 0;
  }
}
async function checkPublicRegistry(repository, registryDomain, currentTag, localCreatedDate) {
  return checkRegistryV2(repository, registryDomain, currentTag, void 0, localCreatedDate);
}
async function checkPrivateRegistry(repository, registryDomain, currentTag, credentials, localCreatedDate) {
  const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64");
  return checkRegistryV2(repository, registryDomain, currentTag, auth, localCreatedDate);
}
function mapGitHubRegistry(domain) {
  return domain === "ghcr.io" ? "ghcr.io" : domain;
}
async function checkRegistryV2(repository, registryDomain, currentTag, auth, localCreatedDate) {
  try {
    const mappedDomain = mapGitHubRegistry(registryDomain);
    const repoPath = repository.replace(`${registryDomain}/`, "");
    const adjustedRepoPath = mappedDomain === "docker.io" && !repoPath.includes("/") ? `library/${repoPath}` : repoPath;
    const baseUrl = mappedDomain === "docker.io" ? "https://registry-1.docker.io" : `https://${mappedDomain}`;
    const tagsUrl = `${baseUrl}/v2/${adjustedRepoPath}/tags/list`;
    const headers = {
      Accept: "application/json"
    };
    if (auth) {
      headers["Authorization"] = `Basic ${auth}`;
    }
    const tagsResponse = await fetch(tagsUrl, { headers });
    if (tagsResponse.status === 401) {
      const authHeader = tagsResponse.headers.get("WWW-Authenticate");
      if (authHeader && authHeader.includes("Bearer")) {
        const realm = authHeader.match(/realm="([^"]+)"/)?.[1];
        const service = authHeader.match(/service="([^"]+)"/)?.[1];
        const scope = authHeader.match(/scope="([^"]+)"/)?.[1];
        if (realm) {
          const tokenUrl = `${realm}?service=${service || ""}&scope=${scope || ""}`;
          const tokenHeaders = {};
          if (auth) {
            tokenHeaders["Authorization"] = `Basic ${auth}`;
          }
          const tokenResponse = await fetch(tokenUrl, { headers: tokenHeaders });
          if (!tokenResponse.ok) {
            throw new PublicRegistryError(`Failed to authenticate with registry: ${tokenResponse.status}`, registryDomain, repository, tokenResponse.status);
          }
          const tokenData = await tokenResponse.json();
          const token = tokenData.token || tokenData.access_token;
          if (!token) {
            throw new PublicRegistryError("Registry authentication failed - no token", registryDomain, repository);
          }
          headers["Authorization"] = `Bearer ${token}`;
          const authenticatedResponse = await fetch(tagsUrl, { headers });
          if (!authenticatedResponse.ok) {
            throw new PublicRegistryError(`Registry API returned ${authenticatedResponse.status}`, registryDomain, repository, authenticatedResponse.status);
          }
          const tagsData2 = await authenticatedResponse.json();
          return processTagsData(tagsData2, repository, registryDomain, currentTag, headers, localCreatedDate);
        }
      }
      throw new PublicRegistryError("Registry requires authentication", registryDomain, repository, 401);
    }
    if (!tagsResponse.ok) {
      throw new PublicRegistryError(`Registry API returned ${tagsResponse.status}`, registryDomain, repository, tagsResponse.status);
    }
    const tagsData = await tagsResponse.json();
    return processTagsData(tagsData, repository, registryDomain, currentTag, headers, localCreatedDate);
  } catch (error) {
    if (error instanceof PublicRegistryError || error instanceof PrivateRegistryError || error instanceof RegistryRateLimitError) {
      throw error;
    }
    throw new PublicRegistryError(`Registry API error for ${repository}: ${error.message}`, registryDomain, repository);
  }
}
async function processTagsData(tagsData, repository, registryDomain, currentTag, headers, localCreatedDate) {
  const tags = tagsData.tags || [];
  if (!Array.isArray(tags)) {
    console.warn(`processTagsData: tagsData.tags is not an array for ${repository}. Received:`, tagsData);
    return void 0;
  }
  const { newerTags } = findNewerVersionsOfSameTag(tags, currentTag);
  const settings = await getSettings();
  const maturityThreshold = settings.maturityThresholdDays || 30;
  const createMaturityObject = (version, dateSource, updatesAvailable) => {
    let dateString;
    let daysSince;
    const dateFormatOptions = { year: "numeric", month: "short", day: "numeric" };
    if (dateSource instanceof Date) {
      if (isNaN(dateSource.getTime())) {
        dateString = "Invalid date";
        daysSince = -1;
      } else {
        dateString = dateSource.toLocaleDateString(void 0, dateFormatOptions);
        daysSince = getDaysSinceDate(dateSource);
      }
    } else {
      dateString = dateSource.date;
      daysSince = dateSource.daysSince;
    }
    const status = daysSince === -1 || dateString === "Invalid date" || dateString === "Unknown date" ? "Unknown" : daysSince > maturityThreshold ? "Matured" : "Not Matured";
    return {
      version,
      date: dateString,
      status,
      updatesAvailable
    };
  };
  if (newerTags.length > 0) {
    const newestTag = newerTags[0];
    try {
      const dateInfoFromRegistry = await getImageCreationDate(repository, registryDomain, newestTag, headers);
      return createMaturityObject(newestTag, dateInfoFromRegistry, true);
    } catch (error) {
      console.error(`Failed to get creation date from registry for newer tag ${repository}:${newestTag}:`, error);
      return createMaturityObject(newestTag, { date: "Unknown date", daysSince: -1 }, true);
    }
  } else {
    if (localCreatedDate) {
      return createMaturityObject(currentTag, localCreatedDate, false);
    } else {
      try {
        const dateInfoFromRegistry = await getImageCreationDate(repository, registryDomain, currentTag, headers);
        return createMaturityObject(currentTag, dateInfoFromRegistry, false);
      } catch (error) {
        console.error(`Failed to get creation date from registry for current tag ${repository}:${currentTag}:`, error);
        return createMaturityObject(currentTag, { date: "Unknown date", daysSince: -1 }, false);
      }
    }
  }
}
async function getImageCreationDate(repository, registryDomain, tag, headers) {
  const mappedDomain = mapGitHubRegistry(registryDomain);
  const baseUrl = mappedDomain === "docker.io" ? "https://registry-1.docker.io" : `https://${mappedDomain}`;
  const repoPath = repository.replace(`${registryDomain}/`, "");
  const adjustedRepoPath = mappedDomain === "docker.io" && !repoPath.includes("/") ? `library/${repoPath}` : repoPath;
  const manifestUrl = `${baseUrl}/v2/${adjustedRepoPath}/manifests/${tag}`;
  const manifestResult = await tryCatch(
    fetch(manifestUrl, {
      headers: {
        ...headers,
        Accept: "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json"
      }
    })
  );
  if (manifestResult.error || !manifestResult.data.ok) {
    if (registryDomain === "docker.io" || registryDomain === "registry-1.docker.io") {
      const dockerHubResult = await tryCatch(getDockerHubCreationDate(repoPath, tag));
      if (!dockerHubResult.error) {
        return dockerHubResult.data;
      }
    }
    return {
      date: "Unknown date",
      daysSince: -1
    };
  }
  const manifestResponse = manifestResult.data;
  const manifestDataResult = await tryCatch(manifestResponse.json());
  if (manifestDataResult.error) {
    return {
      date: "Unknown date",
      daysSince: -1
    };
  }
  const manifest = manifestDataResult.data;
  if (manifest.annotations && manifest.annotations["org.opencontainers.image.created"]) {
    const createdDate = new Date(manifest.annotations["org.opencontainers.image.created"]);
    if (!isNaN(createdDate.getTime())) {
      const daysSince = getDaysSinceDate(createdDate);
      const dateFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric"
      };
      return {
        date: createdDate.toLocaleDateString(void 0, dateFormatOptions),
        daysSince
      };
    }
  }
  if (manifest.manifests && Array.isArray(manifest.manifests)) {
    for (const descriptor of manifest.manifests) {
      if (descriptor.annotations && descriptor.annotations["org.opencontainers.image.created"]) {
        const createdDate = new Date(descriptor.annotations["org.opencontainers.image.created"]);
        if (!isNaN(createdDate.getTime())) {
          const daysSince = getDaysSinceDate(createdDate);
          const dateFormatOptions = {
            year: "numeric",
            month: "short",
            day: "numeric"
          };
          return {
            date: createdDate.toLocaleDateString(void 0, dateFormatOptions),
            daysSince
          };
        }
      }
    }
  }
  const configDigest = manifest.config?.digest;
  if (!configDigest) {
    if (registryDomain === "docker.io" || registryDomain === "registry-1.docker.io") {
      const dockerHubResult = await tryCatch(getDockerHubCreationDate(repoPath, tag));
      if (!dockerHubResult.error) {
        return dockerHubResult.data;
      }
    }
    return {
      date: "Unknown date",
      daysSince: -1
    };
  }
  const configUrl = `${baseUrl}/v2/${adjustedRepoPath}/blobs/${configDigest}`;
  const configResult = await tryCatch(fetch(configUrl, { headers }));
  if (configResult.error || !configResult.data.ok) {
    return {
      date: "Unknown date",
      daysSince: -1
    };
  }
  const configResponse = configResult.data;
  const configDataResult = await tryCatch(configResponse.json());
  if (configDataResult.error) {
    return {
      date: "Unknown date",
      daysSince: -1
    };
  }
  const configData = configDataResult.data;
  if (configData.created) {
    const creationDate = new Date(configData.created);
    if (!isNaN(creationDate.getTime())) {
      const daysSince = getDaysSinceDate(creationDate);
      const dateFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric"
      };
      return {
        date: creationDate.toLocaleDateString(void 0, dateFormatOptions),
        daysSince
      };
    }
  }
  if (configData.config && configData.config.Labels && configData.config.Labels["org.opencontainers.image.created"]) {
    const labelDate = new Date(configData.config.Labels["org.opencontainers.image.created"]);
    if (!isNaN(labelDate.getTime())) {
      const daysSince = getDaysSinceDate(labelDate);
      const dateFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric"
      };
      return {
        date: labelDate.toLocaleDateString(void 0, dateFormatOptions),
        daysSince
      };
    }
  }
  if (registryDomain === "docker.io" || registryDomain === "registry-1.docker.io") {
    const dockerHubResult = await tryCatch(getDockerHubCreationDate(repoPath, tag));
    if (!dockerHubResult.error) {
      return dockerHubResult.data;
    }
  }
  return {
    date: "Unknown date",
    daysSince: -1
  };
}
async function getDockerHubCreationDate(repository, tag) {
  const repoPath = repository.startsWith("library/") ? repository.substring(8) : repository;
  const url = `https://hub.docker.com/v2/repositories/${repoPath}/tags/${tag}`;
  const responseResult = await tryCatch(fetch(url));
  if (responseResult.error || !responseResult.data.ok) {
    return {
      date: "Unknown date",
      daysSince: -1
    };
  }
  const response = responseResult.data;
  const dataResult = await tryCatch(response.json());
  if (dataResult.error || !dataResult.data.last_updated) {
    return {
      date: "Unknown date",
      daysSince: -1
    };
  }
  const data = dataResult.data;
  const creationDate = new Date(data.last_updated);
  const daysSince = getDaysSinceDate(creationDate);
  const dateFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric"
  };
  return {
    date: creationDate.toLocaleDateString(void 0, dateFormatOptions),
    daysSince
  };
}
function getTagPattern(tag) {
  const exactMatchTags = ["latest", "stable", "unstable", "dev", "devel", "development", "test", "testing", "prod", "production", "main", "master", "stage", "staging", "canary", "nightly", "edge", "next", "private-registries", "data-path", "env-fix", "oidc"];
  const versionMatch = tag.match(/(\d+(?:\.\d+)*)/);
  const version = versionMatch ? versionMatch[1] : null;
  const prefixMatch = tag.match(/^([a-z][\w-]*?)[.-]?\d/i);
  const prefix = prefixMatch ? prefixMatch[1] : null;
  if (exactMatchTags.includes(tag)) {
    return { pattern: tag, version: null };
  } else if (prefix && version) {
    return { pattern: prefix, version };
  } else if (version) {
    const majorVersion = version.split(".")[0];
    return { pattern: majorVersion, version };
  } else {
    return { pattern: tag, version: null };
  }
}
function findNewerVersionsOfSameTag(allTags, currentTag) {
  const { pattern, version } = getTagPattern(currentTag);
  if (!version) {
    const exactMatches = allTags.filter((tag) => tag === currentTag);
    if (exactMatches.length > 0) {
      return { newerTags: [], isSpecialTag: true };
    }
    const specialTags = ["latest", "stable", "development", "main", "master"];
    const alternatives = allTags.filter((tag) => specialTags.includes(tag));
    if (alternatives.length > 0) {
      return { newerTags: alternatives, isSpecialTag: true };
    }
    return { newerTags: [], isSpecialTag: true };
  }
  const similarTags = allTags.filter((tag) => {
    const tagInfo = getTagPattern(tag);
    return tagInfo.pattern === pattern && tagInfo.version;
  }).filter((tag) => tag !== currentTag);
  const sortedTags = sortTagsByVersion([currentTag, ...similarTags]);
  const newerTags = sortedTags.filter((tag) => tag !== currentTag);
  return { newerTags, isSpecialTag: false };
}
function sortTagsByVersion(tags) {
  return [...tags].sort((a, b) => {
    const getVersionParts = (tag) => {
      const verMatch = tag.match(/(\d+(?:\.\d+)*)/);
      if (!verMatch) return [0];
      return verMatch[1].split(".").map(Number);
    };
    const aVer = getVersionParts(a);
    const bVer = getVersionParts(b);
    for (let i = 0; i < Math.max(aVer.length, bVer.length); i++) {
      const aNum = aVer[i] || 0;
      const bNum = bVer[i] || 0;
      if (aNum !== bNum) {
        return bNum - aNum;
      }
    }
    return b.localeCompare(a);
  });
}
function getDaysSinceDate(date) {
  const now = /* @__PURE__ */ new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
}
const imageService = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  checkImageMaturity,
  checkImageMaturityBatch,
  getImage,
  initMaturityPollingScheduler,
  isImageInUse,
  listImages,
  pruneImages,
  pullImage,
  removeImage
}, Symbol.toStringTag, { value: "Module" }));

export { pruneImages as a, checkImageMaturity as b, checkImageMaturityBatch as c, isImageInUse as d, imageService as e, getImage as g, imageMaturityDb as i, listImages as l, pullImage as p, removeImage as r };
//# sourceMappingURL=image-service-CL2WzxPP.js.map
