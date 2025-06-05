import { j as json } from './index-Ddp2AB5f.js';
import { l as listContainers, s as startContainer } from './container-service-m5_StWPI.js';
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

const POST = async () => {
  const result = await tryCatch(
    (async () => {
      const containers = await listContainers(true);
      const stopped = containers.filter((c) => c.State === "exited");
      if (stopped.length === 0) {
        return { count: 0, message: "No stopped containers to start." };
      }
      await Promise.all(stopped.map((c) => startContainer(c.Id)));
      return { count: stopped.length, message: `Successfully started ${stopped.length} container(s).` };
    })()
  );
  if (result.error) {
    console.error("API Error (startAllStopped):", result.error);
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
    count: result.data.count,
    message: result.data.message
  });
};

export { POST };
//# sourceMappingURL=_server.ts-DAf6hnPj.js.map
