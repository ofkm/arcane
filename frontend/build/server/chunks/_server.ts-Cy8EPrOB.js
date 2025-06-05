import { j as json } from './index-Ddp2AB5f.js';
import { r as removeContainer } from './container-service-m5_StWPI.js';
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

const DELETE = async ({ params, url }) => {
  const containerId = params.containerId;
  const force = url.searchParams.has("force") ? url.searchParams.get("force") === "true" : false;
  const result = await tryCatch(removeContainer(containerId, force));
  if (result.error) {
    console.error(`API Error Deleting container ${containerId}:`, result.error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(result.error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  return json({
    success: true,
    message: `Container Deleted Successfully`
  });
};

export { DELETE };
//# sourceMappingURL=_server.ts-Cy8EPrOB.js.map
