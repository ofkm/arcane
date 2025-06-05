import { j as json } from "../../../../../chunks/index.js";
import { r as removeNetwork } from "../../../../../chunks/network-service.js";
import { A as ApiErrorCode } from "../../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../../chunks/errors.util.js";
import { t as tryCatch } from "../../../../../chunks/try-catch.js";
const DELETE = async ({ params }) => {
  const networkId = params.id;
  if (!networkId) {
    const response = {
      success: false,
      error: "Network ID is required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const result = await tryCatch(removeNetwork(networkId));
  if (result.error) {
    console.error(`API Error removing network ${networkId}:`, result.error);
    if (result.error.message?.includes("not found")) {
      const response2 = {
        success: false,
        error: result.error.message,
        code: ApiErrorCode.NOT_FOUND,
        details: result.error
      };
      return json(response2, { status: 404 });
    }
    if (result.error.message?.includes("cannot be removed")) {
      const response2 = {
        success: false,
        error: result.error.message,
        code: ApiErrorCode.CONFLICT,
        details: result.error
      };
      return json(response2, { status: 409 });
    }
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
    message: `Network ${networkId} deleted.`
  });
};
export {
  DELETE
};
