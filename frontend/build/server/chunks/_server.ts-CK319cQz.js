import { a as getDockerClient } from './core-C8NMHkc_.js';
import { j as json } from './index-Ddp2AB5f.js';
import { A as ApiErrorCode } from './errors.type-DfKnJ3rD.js';
import { e as extractDockerErrorMessage } from './errors.util-g315AnHn.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
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

const GET = async ({ params, request }) => {
  const { containerId } = params;
  const docker = await getDockerClient();
  const result = await tryCatch(
    (async () => {
      const container = docker.getContainer(containerId);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          let isActive = true;
          const pollInterval = setInterval(async () => {
            if (!isActive) return;
            try {
              const stats = await container.stats({ stream: false });
              if (!isActive) return;
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}

`));
              } catch (err) {
                if (err && typeof err === "object" && "code" in err && err.code === "ERR_INVALID_STATE") {
                  cleanup();
                } else {
                  console.error("Enqueue error:", err);
                }
              }
            } catch (err) {
              if (!isActive) return;
              if (err.statusCode === 404) {
                try {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ removed: true })}

`));
                  cleanup();
                  controller.close();
                } catch {
                  cleanup();
                }
              } else {
                console.error("Container stats error:", err);
              }
            }
          }, 2e3);
          const pingInterval = setInterval(() => {
            if (!isActive) return;
            try {
              controller.enqueue(encoder.encode(":\n\n"));
            } catch (err) {
              if (err && typeof err === "object" && "code" in err && err.code === "ERR_INVALID_STATE") {
                cleanup();
              }
            }
          }, 15e3);
          const cleanup = () => {
            isActive = false;
            clearInterval(pollInterval);
            clearInterval(pingInterval);
          };
          request.signal.addEventListener("abort", cleanup);
          return cleanup;
        },
        cancel() {
        }
      });
      return stream;
    })()
  );
  if (result.error) {
    console.error("Error streaming container stats:", result.error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(result.error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  return new Response(result.data, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
};

export { GET };
//# sourceMappingURL=_server.ts-CK319cQz.js.map
