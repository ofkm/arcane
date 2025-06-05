import { g as getDockerClient } from "../../../../../../../chunks/core.js";
import { j as json } from "../../../../../../../chunks/index.js";
import { A as ApiErrorCode } from "../../../../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../../../../chunks/errors.util.js";
import { t as tryCatch } from "../../../../../../../chunks/try-catch.js";
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
export {
  GET
};
