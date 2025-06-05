import { j as json } from "../../../../../chunks/index.js";
import { g as getContainer } from "../../../../../chunks/container-service.js";
import { t as tryCatch } from "../../../../../chunks/try-catch.js";
import { A as ApiErrorCode } from "../../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../../chunks/errors.util.js";
const GET = async ({ params }) => {
  const containerId = params.containerId;
  const result = await tryCatch(getContainer(containerId));
  if (result.error) {
    console.error(`API Error getting container ${containerId}:`, result.error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(result.error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  if (!result.data) {
    const response = {
      success: false,
      error: "Container not found",
      code: ApiErrorCode.NOT_FOUND
    };
    return json(response, { status: 404 });
  }
  return json(result.data);
};
export {
  GET
};
