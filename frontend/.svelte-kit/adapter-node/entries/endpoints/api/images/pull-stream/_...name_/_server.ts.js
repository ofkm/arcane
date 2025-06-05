import { g as getDockerClient } from "../../../../../../chunks/core.js";
import { URL } from "url";
import { A as ApiErrorCode } from "../../../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../../../chunks/errors.util.js";
import { j as json } from "../../../../../../chunks/index.js";
import { g as getSettings } from "../../../../../../chunks/settings-service.js";
import { a as areRegistriesEquivalent } from "../../../../../../chunks/registry.utils.js";
const GET = async ({ params, request }) => {
  const imageName = params.name;
  if (!imageName) {
    const response = {
      success: false,
      error: "Image name is required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const reqUrl = new URL(request.url);
  const tag = reqUrl.searchParams.get("tag") || "latest";
  const platform = reqUrl.searchParams.get("platform");
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let send = function(data) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}

`));
        };
        const docker = await getDockerClient();
        const settings = await getSettings();
        const fullImageRef = `${imageName}:${tag}`;
        const pullOptions = {};
        if (platform) {
          pullOptions.platform = platform;
        }
        const imageRegistryHost = imageName.includes("/") ? imageName.split("/")[0].includes(".") || imageName.split("/")[0].includes(":") ? imageName.split("/")[0] : "docker.io" : "docker.io";
        if (settings.registryCredentials && settings.registryCredentials.length > 0) {
          const storedCredential = settings.registryCredentials.find((cred) => areRegistriesEquivalent(cred.url, imageRegistryHost));
          if (storedCredential) {
            const serverAddress = imageRegistryHost === "docker.io" ? "https://index.docker.io/v1/" : imageRegistryHost;
            pullOptions.authconfig = {
              username: storedCredential.username,
              password: storedCredential.password,
              serveraddress: serverAddress
            };
            send({
              type: "info",
              message: `Using stored credentials for ${imageRegistryHost} as ${storedCredential.username}`
            });
          } else if (imageRegistryHost !== "docker.io") {
            send({
              type: "warning",
              message: `No stored credentials found for ${imageRegistryHost}. Attempting unauthenticated pull.`
            });
          }
        }
        const pullStream = await docker.pull(fullImageRef, pullOptions);
        const layers = {};
        docker.modem.followProgress(
          pullStream,
          (err) => {
            if (err) {
              const errorResponse = {
                success: false,
                error: extractDockerErrorMessage(err),
                code: ApiErrorCode.DOCKER_API_ERROR,
                details: err
              };
              send(errorResponse);
            } else {
              send({
                success: true,
                complete: true,
                progress: 100,
                status: "Download complete"
              });
            }
            controller.close();
          },
          (event) => {
            if (event.id && event.status) {
              if (!layers[event.id]) {
                layers[event.id] = { current: 0, total: 0 };
              }
              if (event.progressDetail && event.progressDetail.current && event.progressDetail.total) {
                layers[event.id].current = event.progressDetail.current;
                layers[event.id].total = event.progressDetail.total;
              }
              let totalSize = 0;
              let currentProgressSum = 0;
              let calculatedProgress = 0;
              Object.values(layers).forEach((layer) => {
                if (layer.total > 0) {
                  totalSize += layer.total;
                  currentProgressSum += layer.current;
                }
              });
              if (totalSize > 0) {
                calculatedProgress = Math.min(99, Math.floor(currentProgressSum / totalSize * 100));
                send({
                  success: true,
                  progress: calculatedProgress,
                  status: event.status,
                  id: event.id
                });
              } else if (event.status) {
                send({
                  success: true,
                  progress: 0,
                  status: event.status,
                  id: event.id
                });
              }
            } else if (event.status) {
              const lastLayerKey = Object.keys(layers).pop();
              const lastKnownProgress = lastLayerKey && layers[lastLayerKey]?.total > 0 ? Math.min(99, Math.floor(layers[lastLayerKey].current / layers[lastLayerKey].total * 100)) : 0;
              send({
                success: true,
                status: event.status,
                progress: lastKnownProgress
              });
            }
          }
        );
      } catch (error) {
        const errorResponse = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error pulling image",
          code: ApiErrorCode.DOCKER_API_ERROR,
          details: error
        };
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorResponse)}

`));
        controller.close();
      }
    }
  });
  return new Response(stream, { headers });
};
export {
  GET
};
