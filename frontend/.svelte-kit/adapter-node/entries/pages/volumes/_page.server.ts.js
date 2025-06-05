import { l as listVolumes, i as isVolumeInUse } from "../../../chunks/volume-service.js";
const load = async () => {
  try {
    const volumesData = await listVolumes();
    const enhancedVolumes = await Promise.all(
      volumesData.map(async (volume) => {
        const inUse = await isVolumeInUse(volume.Name);
        return {
          ...volume,
          inUse
        };
      })
    );
    return {
      volumes: enhancedVolumes
    };
  } catch (err) {
    console.error("Failed to load volumes:", err);
    const message = err instanceof Error ? err.message : "Failed to connect to Docker or list volumes.";
    return {
      volumes: [],
      error: message
    };
  }
};
export {
  load
};
