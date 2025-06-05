import { j as json } from "../../../../../chunks/index.js";
import { a as pruneImages } from "../../../../../chunks/image-service.js";
import { g as getSettings } from "../../../../../chunks/settings-service.js";
import { f as formatBytes } from "../../../../../chunks/bytes.util.js";
import { A as ApiErrorCode } from "../../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../../chunks/errors.util.js";
import { t as tryCatch } from "../../../../../chunks/try-catch.js";
const POST = async () => {
  const settingsResult = await tryCatch(getSettings());
  if (settingsResult.error) {
    console.error("Error getting settings:", settingsResult.error);
    const response = {
      success: false,
      error: "Failed to retrieve settings",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: settingsResult.error
    };
    return json(response, { status: 500 });
  }
  const pruneMode = settingsResult.data.pruneMode;
  const pruneResult = await tryCatch(pruneImages(pruneMode));
  if (pruneResult.error) {
    console.error("Error pruning images:", pruneResult.error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(pruneResult.error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: pruneResult.error
    };
    return json(response, { status: 500 });
  }
  const result = pruneResult.data;
  const spaceReclaimedFormatted = formatBytes(result.SpaceReclaimed || 0);
  const message = result.ImagesDeleted && result.ImagesDeleted.length > 0 ? `Successfully pruned ${result.ImagesDeleted.length} image(s). Space reclaimed: ${spaceReclaimedFormatted}.` : `No unused images found to prune. Space reclaimed: ${spaceReclaimedFormatted}.`;
  return json({
    success: true,
    message,
    spaceReclaimed: result.SpaceReclaimed,
    imagesDeletedCount: result.ImagesDeleted?.length || 0
  });
};
export {
  POST
};
