import type { PageServerLoad } from "./$types";
import { listContainers } from "$lib/services/docker-service"; // Import the service function

export const load: PageServerLoad = async () => {
  try {
    const containers = await listContainers(true);
    return {
      containers,
    };
  } catch (error: any) {
    console.error("Failed to load containers:", error);
    return {
      containers: [],
      error: error.message || "Failed to connect to Docker or list containers.",
    };
  }
};
