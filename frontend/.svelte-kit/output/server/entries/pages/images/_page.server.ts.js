import { l as listImages, d as isImageInUse, b as checkImageMaturity } from "../../../chunks/image-service.js";
import { g as getSettings } from "../../../chunks/settings-service.js";
const load = async () => {
  try {
    const images = await listImages();
    const settings = await getSettings();
    const enhancedImages = await Promise.all(
      images.map(async (image) => {
        const inUse = await isImageInUse(image.Id);
        let maturity = void 0;
        try {
          if (image.repo !== "<none>" && image.tag !== "<none>") {
            maturity = await checkImageMaturity(image.Id);
          }
        } catch (maturityError) {
          console.error(`Failed to check maturity for image ${image.Id}:`, maturityError);
        }
        return {
          ...image,
          inUse,
          maturity
        };
      })
    );
    return {
      images: enhancedImages,
      settings
    };
  } catch (err) {
    console.error("Failed to load images:", err);
    const settings = await getSettings().catch(() => ({}));
    return {
      images: [],
      error: err.message || "Failed to connect to Docker or list images.",
      settings
    };
  }
};
export {
  load
};
