import { l as listContainers } from "../../chunks/container-service.js";
import { a as getDockerInfo } from "../../chunks/core.js";
import { l as listImages, d as isImageInUse, i as imageMaturityDb, b as checkImageMaturity } from "../../chunks/image-service.js";
import { g as getSettings } from "../../chunks/settings-service.js";
const load = async () => {
  try {
    const [dockerInfo, containersData, imagesData, settings] = await Promise.all([
      getDockerInfo().catch((e) => {
        console.error("Dashboard: Failed to get Docker info:", e.message);
        return null;
      }),
      listContainers(true).catch((e) => {
        console.error("Dashboard: Failed to list containers:", e.message);
        return [];
      }),
      listImages().catch((e) => {
        console.error("Dashboard: Failed to list images:", e.message);
        return [];
      }),
      getSettings().catch((e) => {
        console.error("Dashboard: Failed to get settings:", e.message);
        return null;
      })
    ]);
    const enhancedImages = await Promise.all(
      imagesData.map(async (image) => {
        const inUse = await isImageInUse(image.Id);
        const record = await imageMaturityDb.getImageMaturity(image.Id);
        let maturity = record ? imageMaturityDb.recordToImageMaturity(record) : void 0;
        if (maturity === void 0) {
          try {
            if (image.repo !== "<none>" && image.tag !== "<none>") {
              maturity = await checkImageMaturity(image.Id);
            }
          } catch (maturityError) {
            console.error(`Dashboard: Failed to check maturity for image ${image.Id}:`, maturityError);
            maturity = void 0;
          }
        }
        return {
          ...image,
          inUse,
          maturity
        };
      })
    );
    if (!dockerInfo) {
      return {
        dockerInfo: null,
        containers: [],
        images: enhancedImages,
        settings: settings ? { pruneMode: settings.pruneMode } : null,
        error: "Failed to connect to Docker Engine. Please check settings and ensure Docker is running."
      };
    }
    return {
      dockerInfo,
      containers: containersData,
      images: enhancedImages,
      settings: settings ? { pruneMode: settings.pruneMode } : null
    };
  } catch (err) {
    console.error("Dashboard: Unexpected error loading data:", err);
    return {
      dockerInfo: null,
      containers: [],
      images: [],
      // Return empty EnhancedImageInfo array on error
      settings: null,
      error: err.message || "An unexpected error occurred while loading dashboard data."
    };
  }
};
export {
  load
};
