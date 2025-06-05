import { e as error } from './index-Ddp2AB5f.js';
import { a as getDockerClient } from './core-C8NMHkc_.js';
import { Writable } from 'stream';
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
  if (!containerId) {
    throw error(400, "Container ID is required");
  }
  try {
    const docker = await getDockerClient();
    const container = docker.getContainer(containerId);
    await container.inspect();
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let isClosed = false;
        let logStream = null;
        const safeEnqueue = (data) => {
          if (!isClosed) {
            try {
              controller.enqueue(encoder.encode(data));
            } catch (err) {
              isClosed = true;
            }
          }
        };
        const stdoutStream = new Writable({
          write(chunk, encoding, callback) {
            if (isClosed) {
              callback();
              return;
            }
            const message = chunk.toString();
            const data = JSON.stringify({
              level: "stdout",
              message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            safeEnqueue(`data: ${data}

`);
            callback();
          }
        });
        const stderrStream = new Writable({
          write(chunk, encoding, callback) {
            if (isClosed) {
              callback();
              return;
            }
            const message = chunk.toString();
            const data = JSON.stringify({
              level: "stderr",
              message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            safeEnqueue(`data: ${data}

`);
            callback();
          }
        });
        const cleanup = () => {
          isClosed = true;
          if (logStream) {
            try {
              if (typeof logStream.destroy === "function") {
                logStream.destroy();
              }
            } catch (err) {
            }
          }
        };
        container.logs(
          {
            follow: true,
            stdout: true,
            stderr: true,
            timestamps: true,
            tail: 50
          },
          (err, stream2) => {
            if (err) {
              if (!isClosed) {
                controller.error(err);
              }
              return;
            }
            logStream = stream2 || null;
            if (stream2 && !isClosed) {
              container.modem.demuxStream(stream2, stdoutStream, stderrStream);
              stream2.on("end", () => {
                cleanup();
                if (!isClosed) {
                  controller.close();
                }
              });
              stream2.on("error", (streamErr) => {
                cleanup();
                if (!isClosed) {
                  controller.error(streamErr);
                }
              });
              stream2.on("close", () => {
                cleanup();
              });
            } else {
              cleanup();
            }
          }
        );
        request.signal.addEventListener("abort", () => {
          cleanup();
        });
        return cleanup;
      }
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control"
      }
    });
  } catch (err) {
    throw error(500, "Failed to stream container logs");
  }
};

export { GET };
//# sourceMappingURL=_server.ts-CmMWJnPC.js.map
