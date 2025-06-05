import { j as json } from './index-Ddp2AB5f.js';
import { l as listImages } from './image-service-CL2WzxPP.js';
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
import './registry.utils-rtYanQFp.js';
import '@swimlane/docker-reference';

const GET = async () => {
  const result = await tryCatch(listImages());
  console.log("Result:", result);
  if (result.error) {
    console.error("Error fetching images:", result.error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(result.error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  return json(result.data);
};

export { GET };
//# sourceMappingURL=_server.ts-SoKy01QN.js.map
