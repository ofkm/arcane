import { j as json } from "../../../../../../chunks/index.js";
import { p as pullImage } from "../../../../../../chunks/image-service.js";
import { A as ApiErrorCode } from "../../../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../../../chunks/errors.util.js";
import { t as tryCatch } from "../../../../../../chunks/try-catch.js";
import { g as getSettings } from "../../../../../../chunks/settings-service.js";
import { a as areRegistriesEquivalent } from "../../../../../../chunks/registry.utils.js";
const POST = async ({ params, request }) => {
  const fullPath = params.name;
  if (!fullPath) {
    const response = {
      success: false,
      error: "Image reference is required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  let body;
  try {
    body = await request.json();
  } catch (error) {
    const response = {
      success: false,
      error: "Invalid request body",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const platform = body?.platform;
  const tag = body?.tag || "latest";
  const imageRef = fullPath.includes(":") ? fullPath : `${fullPath}:${tag}`;
  const imageName = imageRef.split(":")[0];
  const imageRegistryHost = imageName.includes("/") ? imageName.split("/")[0].includes(".") || imageName.split("/")[0].includes(":") ? imageName.split("/")[0] : "docker.io" : "docker.io";
  const authConfig = body?.auth || {};
  let authOptions = {};
  if (!authConfig.username && !authConfig.password) {
    try {
      const settings = await getSettings();
      if (settings.registryCredentials && settings.registryCredentials.length > 0) {
        const storedCredential = settings.registryCredentials.find((cred) => areRegistriesEquivalent(cred.url, imageRegistryHost));
        if (storedCredential) {
          console.log(`Using stored credentials for ${imageRegistryHost} as ${storedCredential.username}`);
          const serverAddress = imageRegistryHost === "docker.io" ? "https://index.docker.io/v1/" : imageRegistryHost;
          authOptions = {
            username: storedCredential.username,
            password: storedCredential.password,
            serveraddress: serverAddress
          };
        } else if (imageRegistryHost !== "docker.io") {
          console.log(`No stored credentials found for ${imageRegistryHost}. Attempting unauthenticated pull.`);
        }
      }
    } catch (error) {
      console.error("Error loading authentication settings:", error);
    }
  } else {
    authOptions = authConfig;
  }
  console.log(`API: Pulling image "${imageRef}"...`);
  const result = await tryCatch(pullImage(imageRef, platform, authOptions));
  if (result.error) {
    console.error("Error pulling image:", result.error);
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
    message: `Image "${imageRef}" pulled successfully.`
  });
};
export {
  POST
};
