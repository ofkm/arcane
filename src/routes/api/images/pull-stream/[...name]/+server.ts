import type { RequestHandler } from "./$types";
import { getDockerClient } from "$lib/services/docker-service";

export const GET: RequestHandler = async ({ params, request }) => {
  const imageRef = params.name;

  // Set up SSE headers
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const docker = getDockerClient();

        // Helper to send SSE messages
        function send(data: any) {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        }

        // Start the pull operation
        const pullStream = await docker.pull(imageRef);

        // Process to calculate progress
        let layers: Record<string, any> = {};
        let totalProgress = 0;

        // Stream processing
        docker.modem.followProgress(
          pullStream,
          (err: Error | null, output: any[]) => {
            // Pull complete
            if (err) {
              send({ error: err.message });
            } else {
              send({ complete: true, progress: 100 });
            }
            controller.close();
          },
          (event: any) => {
            // Progress update for a layer
            if (event.id && event.status) {
              if (!layers[event.id]) {
                layers[event.id] = { current: 0, total: 0 };
              }

              if (
                event.progressDetail &&
                event.progressDetail.current &&
                event.progressDetail.total
              ) {
                layers[event.id].current = event.progressDetail.current;
                layers[event.id].total = event.progressDetail.total;
              }

              // Calculate overall progress
              let totalSize = 0;
              let currentProgress = 0;

              Object.values(layers).forEach((layer: any) => {
                if (layer.total > 0) {
                  totalSize += layer.total;
                  currentProgress += layer.current;
                }
              });

              if (totalSize > 0) {
                // Update more frequently - calculate on every change
                totalProgress = Math.min(
                  99,
                  Math.floor((currentProgress / totalSize) * 100)
                );
                // Always send progress updates, even small changes
                send({ progress: totalProgress, status: event.status });
              } else {
                // If we can't calculate percentage yet, send a small progress indicator
                send({ progress: 5, status: event.status });
              }
            }
          }
        );
      } catch (error: any) {
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              error: error.message || "Unknown error pulling image",
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, { headers });
};
