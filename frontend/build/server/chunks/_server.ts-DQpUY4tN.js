import { j as json } from './index-Ddp2AB5f.js';
import { l as listContainers, d as stopContainer } from './container-service-m5_StWPI.js';
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
      const running = containers.filter((c) => c.State === "running");
      if (running.length === 0) {
        return { count: 0, message: "No running containers to stop." };
      }
      await Promise.all(running.map((c) => stopContainer(c.Id)));
      console.log(`API: Stopped ${running.length} containers.`);
      return { count: running.length, message: `Successfully stopped ${running.length} container(s).` };
    })()
  );
  if (result.error) {
    console.error("API Error (stopAllRunning):", result.error);
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
//# sourceMappingURL=_server.ts-DQpUY4tN.js.map
