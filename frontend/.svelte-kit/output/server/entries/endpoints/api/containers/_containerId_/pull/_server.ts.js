import { j as json } from "../../../../../../chunks/index.js";
import { g as getContainer } from "../../../../../../chunks/container-service.js";
import { p as pullImage } from "../../../../../../chunks/image-service.js";
import { A as ApiErrorCode } from "../../../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../../../chunks/errors.util.js";
import { t as tryCatch } from "../../../../../../chunks/try-catch.js";
const POST = async ({ params }) => {
  const containerId = params.containerId;
  const getResult = await tryCatch(getContainer(containerId));
  if (getResult.error) {
    console.error(`API Error pulling image for container ${containerId}:`, getResult.error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(getResult.error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: getResult.error
    };
    return json(response, { status: 500 });
  }
  if (!getResult.data) {
    const response = {
      success: false,
      error: "Container not found",
      code: ApiErrorCode.NOT_FOUND
    };
    return json(response, { status: 404 });
  }
  const imageName = getResult.data.Image;
  const pullResult = await tryCatch(pullImage(imageName));
  if (pullResult.error) {
    console.error(`API Error pulling image ${imageName} for container ${containerId}:`, pullResult.error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(pullResult.error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: pullResult.error
    };
    return json(response, { status: 500 });
  }
  return json({
    success: true,
    message: `Container image ${imageName} pulled successfully`
  });
};
export {
  POST
};
