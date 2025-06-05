import { l as listContainers } from "../../../chunks/container-service.js";
import { l as listImages } from "../../../chunks/image-service.js";
import { l as listNetworks } from "../../../chunks/network-service.js";
import { l as listVolumes } from "../../../chunks/volume-service.js";
const load = async () => {
  try {
    const [containers, volumes, networks, images] = await Promise.all([listContainers(true), listVolumes(), listNetworks(), listImages()]);
    return {
      containers,
      volumes,
      networks,
      images
    };
  } catch (error) {
    console.error("Error loading container data:", error);
    return {
      containers: [],
      volumes: [],
      networks: [],
      images: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
};
export {
  load
};
