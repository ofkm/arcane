import { stopStack } from "../../../../../../chunks/stack-custom-service.js";
import { j as json } from "../../../../../../chunks/index.js";
import { A as ApiErrorCode } from "../../../../../../chunks/errors.type.js";
import { t as tryCatch } from "../../../../../../chunks/try-catch.js";
const POST = async ({ params }) => {
  const id = params.stackId;
  const result = await tryCatch(stopStack(id));
  if (result.error) {
    console.error(`API Error starting stack ${id}:`, result.error);
    const response = {
      success: false,
      error: result.error.message || "Failed to start stack",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  return json({
    success: true,
    message: `Stack started successfully`
  });
};
export {
  POST
};
