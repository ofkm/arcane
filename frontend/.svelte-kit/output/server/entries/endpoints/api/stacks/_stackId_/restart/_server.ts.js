import { j as json } from "../../../../../../chunks/index.js";
import { restartStack } from "../../../../../../chunks/stack-custom-service.js";
import { A as ApiErrorCode } from "../../../../../../chunks/errors.type.js";
import { t as tryCatch } from "../../../../../../chunks/try-catch.js";
const POST = async ({ params }) => {
  const id = params.stackId;
  const result = await tryCatch(restartStack(id));
  if (result.error) {
    console.error(`API Error restarting stack ${id}:`, result.error);
    const response = {
      success: false,
      error: result.error.message || "Failed to restart stack",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  if (result.data) {
    return json({
      success: true,
      message: `Stack restarted successfully`
    });
  } else {
    const response = {
      success: false,
      error: "Failed to restart stack",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR
    };
    return json(response, { status: 500 });
  }
};
export {
  POST
};
