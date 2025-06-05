import { j as json } from './index-Ddp2AB5f.js';
import { g as getContainer } from './container-service-m5_StWPI.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
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
import './errors-BtZyvX-k.js';

const GET = async ({ params }) => {
  const containerId = params.containerId;
  const result = await tryCatch(getContainer(containerId));
  if (result.error) {
    console.error(`API Error getting container ${containerId}:`, result.error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(result.error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  if (!result.data) {
    const response = {
      success: false,
      error: "Container not found",
      code: ApiErrorCode.NOT_FOUND
    };
    return json(response, { status: 404 });
  }
  return json(result.data);
};

export { GET };
//# sourceMappingURL=_server.ts-A96A_FWb.js.map
