import { j as json } from "../../../../chunks/index.js";
import { c as createContainer } from "../../../../chunks/container-service.js";
import { A as ApiErrorCode } from "../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../chunks/errors.util.js";
import { t as tryCatch } from "../../../../chunks/try-catch.js";
const POST = async ({ request }) => {
  const config = await request.json();
  if (!config.name || !config.Image) {
    const response = {
      success: false,
      error: "Container name and image are required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const result = await tryCatch(createContainer(config));
  if (result.error) {
    console.error("Error creating container:", result.error);
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
    container: result.data
  });
};
export {
  POST
};
