import { j as json } from './index-Ddp2AB5f.js';
import { i as imageMaturityDb, l as listImages, c as checkImageMaturityBatch } from './image-service-CL2WzxPP.js';
import { A as ApiErrorCode } from './errors.type-DfKnJ3rD.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import './core-C8NMHkc_.js';
import 'dockerode';
import './settings-service-B1w8bfJq.js';
import 'proper-lockfile';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:fs/promises';
import 'node:path';
import 'node:util';
import './schema-CDkq0ub_.js';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './settings-db-service-DyTlfQVT.js';
import './index4-SoK3Vczo.js';
import './registry.utils-rtYanQFp.js';
import '@swimlane/docker-reference';

const POST = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { force = false } = body;
    console.log("Manual maturity check triggered", { force });
    const imagesResult = await tryCatch(listImages());
    if (imagesResult.error) {
      const response = {
        success: false,
        error: "Failed to list Docker images",
        code: ApiErrorCode.DOCKER_API_ERROR,
        details: imagesResult.error
      };
      return json(response, { status: 500 });
    }
    const images = imagesResult.data;
    const validImages = images.filter((image) => image.repo !== "<none>" && image.tag !== "<none>");
    if (validImages.length === 0) {
      return json({
        success: true,
        message: "No valid images found to check",
        stats: { total: 0, checked: 0, updated: 0 }
      });
    }
    const imageIds = validImages.map((img) => img.Id);
    let imageIdsToCheck = imageIds;
    if (!force) {
      const imagesToCheck = await imageMaturityDb.getImagesNeedingCheck(120, 1e3);
      const imageIdsNeedingCheck = new Set(imagesToCheck.map((record) => record.id));
      const existingMaturityRecords = await imageMaturityDb.getImageMaturityBatch(imageIds);
      for (const imageId of imageIds) {
        if (!existingMaturityRecords.has(imageId)) {
          imageIdsNeedingCheck.add(imageId);
        }
      }
      imageIdsToCheck = imageIds.filter((id) => imageIdsNeedingCheck.has(id));
    }
    console.log(`Checking maturity for ${imageIdsToCheck.length} of ${imageIds.length} images`);
    const batchSize = 20;
    let totalChecked = 0;
    let totalUpdated = 0;
    for (let i = 0; i < imageIdsToCheck.length; i += batchSize) {
      const batch = imageIdsToCheck.slice(i, i + batchSize);
      const results = await checkImageMaturityBatch(batch);
      totalChecked += batch.length;
      totalUpdated += Array.from(results.values()).filter((maturity) => maturity?.updatesAvailable).length;
      if (i + batchSize < imageIdsToCheck.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    const stats = await imageMaturityDb.getMaturityStats();
    return json({
      success: true,
      message: `Checked ${totalChecked} images, found ${totalUpdated} with updates`,
      stats: {
        ...stats,
        total: imageIds.length,
        checked: totalChecked,
        updated: totalUpdated
      }
    });
  } catch (error) {
    console.error("Error in manual maturity check:", error);
    const response = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: error
    };
    return json(response, { status: 500 });
  }
};
const GET = async () => {
  try {
    const stats = await imageMaturityDb.getMaturityStats();
    return json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Error getting maturity stats:", error);
    return json(
      {
        success: false,
        error: "Failed to get maturity statistics"
      },
      { status: 500 }
    );
  }
};

export { GET, POST };
//# sourceMappingURL=_server.ts-Bhf-LEb_.js.map
