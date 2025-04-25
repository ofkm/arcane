import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { pruneImages } from "$lib/services/docker-service";
import { formatBytes } from "$lib/utils"; // Optional: for formatted message

export const POST: RequestHandler = async () => {
  try {
    const result = await pruneImages();
    const spaceReclaimedFormatted = formatBytes(result.SpaceReclaimed || 0);
    const message =
      result.ImagesDeleted && result.ImagesDeleted.length > 0
        ? `Successfully pruned ${result.ImagesDeleted.length} image(s). Space reclaimed: ${spaceReclaimedFormatted}.`
        : `No unused images found to prune. Space reclaimed: ${spaceReclaimedFormatted}.`;

    return json({
      success: true,
      message: message,
      spaceReclaimed: result.SpaceReclaimed,
      imagesDeletedCount: result.ImagesDeleted?.length || 0,
    });
  } catch (err: any) {
    console.error("API Error pruning images:", err);
    throw error(500, err.message || "Failed to prune images");
  }
};
