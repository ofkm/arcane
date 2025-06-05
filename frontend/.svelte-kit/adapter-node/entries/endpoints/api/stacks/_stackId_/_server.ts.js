import { j as json } from "../../../../../chunks/index.js";
import { updateStack } from "../../../../../chunks/stack-custom-service.js";
import { A as ApiErrorCode } from "../../../../../chunks/errors.type.js";
import { t as tryCatch } from "../../../../../chunks/try-catch.js";
const PUT = async ({ params, request }) => {
  const { stackId } = params;
  const { name, composeContent, envContent } = await request.json();
  const result = await tryCatch(updateStack(stackId, { name, composeContent, envContent }));
  if (result.error) {
    console.error("Error updating stack:", result.error);
    const response = {
      success: false,
      error: result.error.message || "Failed to update stack",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  return json({
    success: true,
    message: "Stack updated successfully"
  });
};
export {
  PUT
};
