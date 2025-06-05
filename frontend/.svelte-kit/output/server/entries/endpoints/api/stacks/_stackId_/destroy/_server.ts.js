import { j as json } from "../../../../../../chunks/index.js";
import { destroyStack } from "../../../../../../chunks/stack-custom-service.js";
import { A as ApiErrorCode } from "../../../../../../chunks/errors.type.js";
import { t as tryCatch } from "../../../../../../chunks/try-catch.js";
const DELETE = async ({ params, url }) => {
  const id = params.stackId;
  const removeFiles = url.searchParams.get("removeFiles") === "true";
  const removeVolumes = url.searchParams.get("removeVolumes") === "true";
  if (!id) {
    const response = {
      success: false,
      error: "Stack ID is required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const result = await tryCatch(destroyStack(id, removeVolumes, removeFiles));
  if (result.error) {
    console.error(`API Error destroying stack ${id}:`, result.error);
    const response = {
      success: false,
      error: result.error.message || "Failed to destroy stack",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: result.error
    };
    return json(response, { status: 409 });
  }
  if (result.data) {
    return json({
      success: true,
      message: `Stack Destroyed Successfully${removeFiles ? " (including files)" : ""}`
    });
  } else {
    const response = {
      success: false,
      error: "Failed to remove stack",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
};
export {
  DELETE
};
