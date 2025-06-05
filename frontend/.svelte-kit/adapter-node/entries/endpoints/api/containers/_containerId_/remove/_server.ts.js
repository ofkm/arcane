import { j as json } from "../../../../../../chunks/index.js";
import { r as removeContainer } from "../../../../../../chunks/container-service.js";
import { A as ApiErrorCode } from "../../../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../../../chunks/errors.util.js";
import { t as tryCatch } from "../../../../../../chunks/try-catch.js";
const DELETE = async ({ params, url }) => {
  const containerId = params.containerId;
  const force = url.searchParams.has("force") ? url.searchParams.get("force") === "true" : false;
  const result = await tryCatch(removeContainer(containerId, force));
  if (result.error) {
    console.error(`API Error Deleting container ${containerId}:`, result.error);
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
    message: `Container Deleted Successfully`
  });
};
export {
  DELETE
};
