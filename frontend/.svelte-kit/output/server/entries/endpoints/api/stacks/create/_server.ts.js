import { j as json } from "../../../../../chunks/index.js";
import { createStack } from "../../../../../chunks/stack-custom-service.js";
import { A as ApiErrorCode } from "../../../../../chunks/errors.type.js";
import { t as tryCatch } from "../../../../../chunks/try-catch.js";
const POST = async ({ request }) => {
  const bodyResult = await tryCatch(request.json());
  if (bodyResult.error) {
    const response = {
      success: false,
      error: "Invalid JSON payload",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const body = bodyResult.data;
  const name = body.name?.toString();
  const composeContent = body.composeContent?.toString();
  const envContent = body.envContent?.toString();
  if (!name) {
    const response = {
      success: false,
      error: "Stack name is required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  if (!composeContent) {
    const response = {
      success: false,
      error: "Compose file content is required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const result = await tryCatch(createStack(name, composeContent, envContent));
  if (result.error) {
    console.error("API Error creating stack:", result.error);
    const response = {
      success: false,
      error: result.error.message || "Failed to create stack",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  const newStack = result.data;
  return json({
    success: true,
    stack: newStack,
    message: `Stack "${newStack.name}" created successfully.`
  });
};
export {
  POST
};
