import { j as json } from './index-Ddp2AB5f.js';
import { g as getContainer } from './container-service-m5_StWPI.js';
import { p as pullImage } from './image-service-CL2WzxPP.js';
import { A as ApiErrorCode } from './errors.type-DfKnJ3rD.js';
import { e as extractDockerErrorMessage } from './errors.util-g315AnHn.js';
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
import './errors-BtZyvX-k.js';
import './registry.utils-rtYanQFp.js';
import '@swimlane/docker-reference';

const POST = async ({ params }) => {
  const containerId = params.containerId;
  const getResult = await tryCatch(getContainer(containerId));
  if (getResult.error) {
    console.error(`API Error pulling image for container ${containerId}:`, getResult.error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(getResult.error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: getResult.error
    };
    return json(response, { status: 500 });
  }
  if (!getResult.data) {
    const response = {
      success: false,
      error: "Container not found",
      code: ApiErrorCode.NOT_FOUND
    };
    return json(response, { status: 404 });
  }
  const imageName = getResult.data.Image;
  const pullResult = await tryCatch(pullImage(imageName));
  if (pullResult.error) {
    console.error(`API Error pulling image ${imageName} for container ${containerId}:`, pullResult.error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(pullResult.error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: pullResult.error
    };
    return json(response, { status: 500 });
  }
  return json({
    success: true,
    message: `Container image ${imageName} pulled successfully`
  });
};

export { POST };
//# sourceMappingURL=_server.ts-CFcFfW_u.js.map
