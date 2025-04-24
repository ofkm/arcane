import {
  listContainers,
  listVolumes,
  listNetworks,
  listImages,
} from "$lib/services/docker-service";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  try {
    // Fetch all data in parallel
    const [containers, volumes, networks, images] = await Promise.all([
      listContainers(true),
      listVolumes(),
      listNetworks(),
      listImages(),
    ]);

    return {
      containers,
      volumes,
      networks,
      images,
    };
  } catch (error: any) {
    console.error("Error loading container data:", error);
    return {
      containers: [],
      volumes: [],
      networks: [],
      images: [],
      error: error.message,
    };
  }
};
