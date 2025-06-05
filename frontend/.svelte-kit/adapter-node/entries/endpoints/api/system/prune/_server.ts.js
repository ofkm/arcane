import { j as json } from "../../../../../chunks/index.js";
import { g as getDockerClient } from "../../../../../chunks/core.js";
import { g as getSettings } from "../../../../../chunks/settings-service.js";
import { f as formatBytes } from "../../../../../chunks/bytes.util.js";
import { A as ApiErrorCode } from "../../../../../chunks/errors.type.js";
import { t as tryCatch } from "../../../../../chunks/try-catch.js";
const docker = await getDockerClient();
async function pruneSystem(types) {
  const results = [];
  let pruneMode = "dangling";
  try {
    const currentSettings = await getSettings();
    if (currentSettings?.pruneMode) {
      pruneMode = currentSettings.pruneMode;
    }
  } catch (settingsError) {
    const msg = settingsError instanceof Error ? settingsError.message : String(settingsError);
    console.warn(`Could not fetch settings for prune operation, defaulting to 'dangling' image prune mode. Error: ${msg}`);
  }
  console.log(`Using image prune mode: ${pruneMode}`);
  const settings = await getSettings();
  for (const type of types) {
    let result = null;
    let error = void 0;
    try {
      console.log(`Pruning ${type}...`);
      switch (type) {
        case "containers":
          result = await docker.pruneContainers();
          break;
        case "images": {
          const imagePruneOptions = {
            filters: {
              // Ensure 'dangling' is a string 'true' or 'false'
              dangling: [settings.pruneMode === "dangling" ? "true" : "false"]
            }
          };
          const imagePruneResult = await docker.pruneImages(imagePruneOptions);
          if (imagePruneResult.ImagesDeleted && imagePruneResult.ImagesDeleted.length > 0) {
            results.push({
              ...imagePruneResult || { SpaceReclaimed: 0 },
              type,
              error
            });
          }
          break;
        }
        case "networks":
          result = await docker.pruneNetworks();
          break;
        case "volumes":
          result = await docker.pruneVolumes();
          break;
        default:
          console.warn(`Unsupported prune type requested: ${type}`);
          continue;
      }
      console.log(`Pruning ${type} completed.`);
      results.push({ ...result || { SpaceReclaimed: 0 }, type, error });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error pruning ${type}:`, err);
      error = msg || `Failed to prune ${type}`;
      results.push({
        ContainersDeleted: type === "containers" ? [] : void 0,
        ImagesDeleted: type === "images" ? [] : void 0,
        NetworksDeleted: type === "networks" ? [] : void 0,
        VolumesDeleted: type === "volumes" ? [] : void 0,
        SpaceReclaimed: 0,
        type,
        error
      });
    }
  }
  return results;
}
const allowedPruneTypes = ["containers", "images", "networks", "volumes"];
const POST = async ({ url }) => {
  const typesParam = url.searchParams.get("types");
  if (!typesParam) {
    const response = {
      success: false,
      error: "Missing required query parameter: types",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const requestedTypes = typesParam.split(",").map((t) => t.trim().toLowerCase());
  const validTypes = requestedTypes.filter((t) => allowedPruneTypes.includes(t));
  if (validTypes.length === 0) {
    const response = {
      success: false,
      error: `No valid resource types provided for pruning. Allowed types: ${allowedPruneTypes.join(", ")}`,
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  console.log(`API: POST /api/system/prune - Pruning types: ${validTypes.join(", ")}`);
  const result = await tryCatch(pruneSystem(validTypes));
  if (result.error) {
    console.error("API Error (pruneSystem):", result.error);
    const response = {
      success: false,
      error: result.error.message || "Failed to prune system.",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  const results = result.data;
  let totalSpaceReclaimed = 0;
  let hasErrors = false;
  const errorMessages = [];
  if (Array.isArray(results)) {
    results.forEach((res) => {
      if (res) {
        if (typeof res.SpaceReclaimed === "number") {
          totalSpaceReclaimed += res.SpaceReclaimed;
        }
        if (res.error) {
          hasErrors = true;
          errorMessages.push(`${res.type || "Unknown"}: ${res.error}`);
        }
      }
    });
  }
  let message = `System prune completed for: ${validTypes.join(", ")}.`;
  if (totalSpaceReclaimed > 0) {
    message += ` Reclaimed ${formatBytes(totalSpaceReclaimed)}.`;
  }
  if (hasErrors) {
    message += ` Errors occurred: ${errorMessages.join("; ")}`;
    console.warn("Prune completed with errors:", errorMessages);
    return json({ success: false, results, spaceReclaimed: totalSpaceReclaimed, message }, { status: 200 });
  }
  console.log("API: System prune completed successfully.");
  return json({ success: true, results, spaceReclaimed: totalSpaceReclaimed, message });
};
export {
  POST
};
