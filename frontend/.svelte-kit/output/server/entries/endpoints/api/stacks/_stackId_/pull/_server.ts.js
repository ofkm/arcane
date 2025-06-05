import { getStack } from "../../../../../../chunks/stack-custom-service.js";
import { A as ApiErrorCode } from "../../../../../../chunks/errors.type.js";
import { t as tryCatch } from "../../../../../../chunks/try-catch.js";
import { g as getDockerClient } from "../../../../../../chunks/core.js";
import { e as extractDockerErrorMessage } from "../../../../../../chunks/errors.util.js";
import { URL } from "url";
import { g as getSettings } from "../../../../../../chunks/settings-service.js";
import { p as parseImageNameForRegistry, a as areRegistriesEquivalent } from "../../../../../../chunks/registry.utils.js";
import { j as json } from "../../../../../../chunks/index.js";
const POST = async ({ params, request }) => {
  const id = params.stackId;
  const docker = await getDockerClient();
  const reqUrl = new URL(request.url);
  const platform = reqUrl.searchParams.get("platform");
  const settings = await getSettings();
  const stackResult = await tryCatch(getStack(id));
  if (stackResult.error || !stackResult.data || !stackResult.data.composeContent) {
    const response = {
      success: false,
      error: "Stack not found or has no compose content",
      code: ApiErrorCode.NOT_FOUND,
      details: stackResult.error
    };
    return json(response, { status: 404 });
  }
  const stack = stackResult.data;
  const composeLines = stack.composeContent.split("\n");
  const imageLines = composeLines.filter((line) => line.trim().startsWith("image:") || line.includes(" image:"));
  if (imageLines.length === 0) {
    const response = {
      success: false,
      error: "No images found in stack compose file",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const imageNames = imageLines.map((line) => {
    const imagePart = line.split("image:")[1].trim();
    const imageName = imagePart.replace(/['"]/g, "").split(" ")[0];
    return imageName.includes(":") ? imageName : `${imageName}:latest`;
  });
  const pullResults = [];
  let overallSuccess = true;
  for (const imageName of imageNames) {
    try {
      let pullAuthConfig = void 0;
      const { registry: imageRegistryHost } = parseImageNameForRegistry(imageName);
      if (settings.registryCredentials && settings.registryCredentials.length > 0) {
        const storedCredential = settings.registryCredentials.find((cred) => areRegistriesEquivalent(cred.url, imageRegistryHost));
        if (storedCredential) {
          let serverAddressForAuth = storedCredential.url;
          if (areRegistriesEquivalent(storedCredential.url, "docker.io")) {
            serverAddressForAuth = "https://index.docker.io/v1/";
          }
          pullAuthConfig = {
            username: storedCredential.username,
            password: storedCredential.password,
            serveraddress: serverAddressForAuth
          };
        }
      }
      const pullOptions = {};
      if (pullAuthConfig) {
        pullOptions.authconfig = pullAuthConfig;
      }
      if (platform) {
        pullOptions.platform = platform;
      }
      const pullStream = await docker.pull(imageName, pullOptions);
      await new Promise((resolve, reject) => {
        docker.modem.followProgress(
          pullStream,
          (err) => {
            if (err) {
              const errMsg = extractDockerErrorMessage(err);
              pullResults.push({
                image: imageName,
                success: false,
                error: errMsg,
                details: err
              });
              overallSuccess = false;
              reject(err);
            } else {
              pullResults.push({
                image: imageName,
                success: true
              });
              resolve();
            }
          },
          () => {
          }
        );
      }).catch(() => {
      });
    } catch (error) {
      const errMsg = error.message || "Unknown error pulling image";
      pullResults.push({
        image: imageName,
        success: false,
        error: errMsg,
        details: error
      });
      overallSuccess = false;
    }
  }
  if (overallSuccess) {
    return json({
      success: true,
      message: `All images for stack ${id} pulled successfully.`,
      images: pullResults
    });
  } else {
    const failedImages = pullResults.filter((r) => !r.success);
    const errorMessages = failedImages.map((img) => `${img.image}: ${img.error}`);
    const response = {
      success: false,
      error: errorMessages.join("; "),
      code: ApiErrorCode.DOCKER_API_ERROR,
      failedCount: failedImages.length,
      details: pullResults
    };
    return json(response, { status: 500 });
  }
};
export {
  POST
};
