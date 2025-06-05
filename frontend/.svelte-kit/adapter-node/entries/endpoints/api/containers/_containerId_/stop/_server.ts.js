import { j as json } from "../../../../../../chunks/index.js";
import { a as stopContainer } from "../../../../../../chunks/container-service.js";
import { A as ApiErrorCode } from "../../../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../../../chunks/errors.util.js";
import { t as tryCatch } from "../../../../../../chunks/try-catch.js";
const POST = async ({ params }) => {
  const containerId = params.containerId;
  const result = await tryCatch(stopContainer(containerId));
  if (result.error) {
    console.error(`API Error stopping container ${containerId}:`, result.error);
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
    message: `Container stopped successfully`
  });
};
export {
  POST
};
