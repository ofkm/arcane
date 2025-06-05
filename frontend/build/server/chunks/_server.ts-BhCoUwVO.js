import { j as json } from './index-Ddp2AB5f.js';
import { a as pruneImages } from './image-service-CL2WzxPP.js';
import { g as getSettings } from './settings-service-B1w8bfJq.js';
import { f as formatBytes } from './bytes.util-aLEoH8w0.js';
import { A as ApiErrorCode } from './errors.type-DfKnJ3rD.js';
import { e as extractDockerErrorMessage } from './errors.util-g315AnHn.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import './core-C8NMHkc_.js';
import 'dockerode';
import './registry.utils-rtYanQFp.js';
import '@swimlane/docker-reference';
import './index4-SoK3Vczo.js';
import './schema-CDkq0ub_.js';
import 'node:path';
import 'node:fs/promises';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import 'proper-lockfile';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:util';
import './settings-db-service-DyTlfQVT.js';

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

export { POST };
//# sourceMappingURL=_server.ts-BhCoUwVO.js.map
