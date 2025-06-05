import { j as json } from './index-Ddp2AB5f.js';
import { b as checkImageMaturity, i as imageMaturityDb, c as checkImageMaturityBatch } from './image-service-CL2WzxPP.js';
import { A as ApiErrorCode } from './errors.type-DfKnJ3rD.js';
import { e as extractDockerErrorMessage } from './errors.util-g315AnHn.js';
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
import './try-catch-KtE72Cop.js';

const POST = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const { imageIds } = body;
  if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
    const response = {
      success: false,
      error: "Image IDs array is required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  try {
    console.log(`Server: Starting batch maturity check for ${imageIds.length} images`);
    const results = await checkImageMaturityBatch(imageIds);
    const errors = {};
    const successResults = {};
    let successCount = 0;
    let failCount = 0;
    for (const [imageId, maturity] of results) {
      if (maturity) {
        successResults[imageId] = maturity;
        successCount++;
      } else {
        errors[imageId] = "No maturity data available";
        failCount++;
      }
    }
    console.log(`Server: Batch maturity check completed. ${successCount} successful, ${failCount} failed`);
    return json({
      success: true,
      results: successResults,
      errors,
      stats: {
        total: imageIds.length,
        success: successCount,
        failed: failCount
      }
    });
  } catch (error) {
    console.error("Server: Error in batch maturity check:", error);
    const response = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: error
    };
    return json(response, { status: 500 });
  }
};
const GET = async ({ params }) => {
  const { id } = params;
  if (!id) {
    const response = {
      success: false,
      error: "Image ID is required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  try {
    const result = await checkImageMaturity(id);
    if (!result) {
      const response = {
        success: false,
        error: "No maturity data available for this image",
        code: ApiErrorCode.NOT_FOUND
      };
      return json(response, { status: 404 });
    }
    return json({
      success: true,
      result
    });
  } catch (error) {
    console.error("Error checking image maturity:", error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: error
    };
    return json(response, { status: 500 });
  }
};
const OPTIONS = async () => {
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

export { GET, OPTIONS, POST };
//# sourceMappingURL=_server.ts-0cF3T82d.js.map
