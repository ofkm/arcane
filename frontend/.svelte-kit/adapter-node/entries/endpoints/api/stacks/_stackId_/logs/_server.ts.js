import { e as error } from "../../../../../../chunks/index.js";
import { g as getDockerClient } from "../../../../../../chunks/core.js";
import { Writable } from "stream";
const GET = async ({ params, request, url }) => {
  const { stackId } = params;
  if (!stackId) {
    throw error(400, "Stack ID is required");
  }
  const tail = parseInt(url.searchParams.get("tail") || "50");
  const timestamps = url.searchParams.get("timestamps") !== "false";
  const follow = url.searchParams.get("follow") !== "false";
  console.log(`Starting stack logs for ${stackId}, follow=${follow}, tail=${tail}`);
  try {
    const docker = await getDockerClient();
    const containers = await docker.listContainers({
      all: true,
      filters: {
        label: [`com.docker.compose.project=${stackId}`]
      }
    });
    console.log(`Found ${containers.length} containers for stack ${stackId}`);
    if (containers.length === 0) {
      throw error(404, `No containers found for stack: ${stackId}`);
    }
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let isClosed = false;
        const activeStreams = /* @__PURE__ */ new Map();
        const containerNames = /* @__PURE__ */ new Map();
        containers.forEach((containerInfo) => {
          const serviceName = containerInfo.Labels["com.docker.compose.service"] || containerInfo.Names[0]?.replace(/^\//, "") || containerInfo.Id.substring(0, 12);
          containerNames.set(containerInfo.Id, serviceName);
          console.log(`Container ${containerInfo.Id.substring(0, 12)} -> Service: ${serviceName}`);
        });
        const safeEnqueue = (data) => {
          if (!isClosed) {
            try {
              controller.enqueue(encoder.encode(data));
            } catch (err) {
              console.error("Error enqueuing data:", err);
              isClosed = true;
              cleanup();
            }
          }
        };
        const createLogProcessor = (containerId, serviceName) => {
          const stdoutStream = new Writable({
            write(chunk, encoding, callback) {
              if (isClosed) {
                callback();
                return;
              }
              try {
                const message = chunk.toString().trim();
                if (message) {
                  const data = JSON.stringify({
                    level: "stdout",
                    message,
                    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                    service: serviceName,
                    containerId: containerId.substring(0, 12)
                  });
                  safeEnqueue(`data: ${data}

`);
                }
                callback();
              } catch (err) {
                console.error(`Error processing stdout for ${serviceName}:`, err);
                callback();
              }
            }
          });
          const stderrStream = new Writable({
            write(chunk, encoding, callback) {
              if (isClosed) {
                callback();
                return;
              }
              try {
                const message = chunk.toString().trim();
                if (message) {
                  const data = JSON.stringify({
                    level: "stderr",
                    message,
                    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                    service: serviceName,
                    containerId: containerId.substring(0, 12)
                  });
                  safeEnqueue(`data: ${data}

`);
                }
                callback();
              } catch (err) {
                console.error(`Error processing stderr for ${serviceName}:`, err);
                callback();
              }
            }
          });
          return { stdoutStream, stderrStream };
        };
        const cleanup = () => {
          if (isClosed) return;
          console.log(`Cleaning up stack logs for ${stackId}`);
          isClosed = true;
          activeStreams.forEach((stream2, containerId) => {
            try {
              if (typeof stream2.destroy === "function") {
                stream2.destroy();
              }
            } catch (err) {
              console.error(`Error cleaning up stream for container ${containerId}:`, err);
            }
          });
          activeStreams.clear();
        };
        const initialData = JSON.stringify({
          level: "info",
          message: `Starting logs for stack ${stackId} (${containers.length} containers)`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          service: "system",
          containerId: "N/A"
        });
        safeEnqueue(`data: ${initialData}

`);
        const streamPromises = containers.map(async (containerInfo) => {
          console.log("Container id: ", containerInfo.Id, "Service name:", containerNames.get(containerInfo.Id));
          const container = docker.getContainer(containerInfo.Id);
          const serviceName = containerNames.get(containerInfo.Id);
          try {
            const containerInspect = await container.inspect();
            console.log(`Container ${serviceName} state: ${containerInspect.State.Status}`);
            return new Promise((resolve) => {
              container.logs(
                {
                  follow,
                  stdout: true,
                  stderr: true,
                  timestamps,
                  tail: Math.min(tail, 100)
                },
                (err, logStream) => {
                  if (err) {
                    console.error(`Failed to get logs for ${serviceName}:`, err);
                    const errorData = JSON.stringify({
                      level: "error",
                      message: `Failed to get logs: ${err.message}`,
                      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                      service: serviceName,
                      containerId: containerInfo.Id.substring(0, 12)
                    });
                    safeEnqueue(`data: ${errorData}

`);
                    resolve();
                    return;
                  }
                  if (!logStream || isClosed) {
                    resolve();
                    return;
                  }
                  activeStreams.set(containerInfo.Id, logStream);
                  const { stdoutStream, stderrStream } = createLogProcessor(containerInfo.Id, serviceName);
                  try {
                    container.modem.demuxStream(logStream, stdoutStream, stderrStream);
                    logStream.on("end", () => {
                      console.log(`Log stream ended for ${serviceName}`);
                      activeStreams.delete(containerInfo.Id);
                      resolve();
                    });
                    logStream.on("error", (streamErr) => {
                      console.error(`Log stream error for ${serviceName}:`, streamErr);
                      activeStreams.delete(containerInfo.Id);
                      resolve();
                    });
                    logStream.on("close", () => {
                      console.log(`Log stream closed for ${serviceName}`);
                      activeStreams.delete(containerInfo.Id);
                    });
                    const connectionData = JSON.stringify({
                      level: "info",
                      message: `Connected to ${serviceName} logs`,
                      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                      service: serviceName,
                      containerId: containerInfo.Id.substring(0, 12)
                    });
                    safeEnqueue(`data: ${connectionData}

`);
                  } catch (demuxError) {
                    console.error(`Error setting up demux for ${serviceName}:`, demuxError);
                    resolve();
                  }
                }
              );
            });
          } catch (inspectError) {
            console.error(`Container ${serviceName} not accessible:`, inspectError);
            const errorMessage = inspectError instanceof Error ? inspectError.message : String(inspectError);
            const errorData = JSON.stringify({
              level: "error",
              message: `Container ${serviceName} is not accessible: ${errorMessage}`,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              service: serviceName,
              containerId: containerInfo.Id.substring(0, 12)
            });
            safeEnqueue(`data: ${errorData}

`);
            return Promise.resolve();
          }
        });
        Promise.allSettled(streamPromises).then((results) => {
          console.log(`Stream setup complete for ${stackId}. Active streams: ${activeStreams.size}`);
          results.forEach((result, index) => {
            if (result.status === "rejected") {
              console.error(`Stream setup failed for container ${index}:`, result.reason);
            }
          });
          if (!isClosed && activeStreams.size === 0) {
            const finalData = JSON.stringify({
              level: "warning",
              message: "No active log streams available - containers may be stopped",
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              service: "system",
              containerId: "N/A"
            });
            safeEnqueue(`data: ${finalData}

`);
          }
        }).catch((setupError) => {
          console.error("Error setting up log streams:", setupError);
          if (!isClosed) {
            const errorData = JSON.stringify({
              level: "error",
              message: `Failed to setup log streams: ${setupError.message}`,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              service: "system",
              containerId: "N/A"
            });
            safeEnqueue(`data: ${errorData}

`);
          }
        });
        request.signal.addEventListener("abort", cleanup);
        return cleanup;
      },
      cancel() {
        console.log(`Client disconnected from stack ${stackId} logs`);
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
    console.error(`Error streaming logs for stack ${stackId}:`, err);
    throw error(500, `Failed to stream stack logs: ${err.message}`);
  }
};
export {
  GET
};
