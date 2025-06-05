import { j as json } from "../../../../../chunks/index.js";
import { r as removeImage } from "../../../../../chunks/image-service.js";
import { A as ApiErrorCode } from "../../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../../chunks/errors.util.js";
import { t as tryCatch } from "../../../../../chunks/try-catch.js";
const DELETE = async ({ params, url }) => {
  const { id } = params;
  const force = url.searchParams.get("force") === "true";
  if (!id) {
    const response = {
      success: false,
      error: "Image ID is required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const result = await tryCatch(removeImage(id, force));
  if (result.error) {
    console.error("Error removing image:", result.error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(result.error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  return json({
    success: true
  });
};
export {
  DELETE
};
