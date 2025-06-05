import { j as json } from "../../../../../chunks/index.js";
import { importExternalStack } from "../../../../../chunks/stack-custom-service.js";
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
  const { stackId, stackName } = bodyResult.data;
  if (!stackId) {
    const response = {
      success: false,
      error: "Stack ID is required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const result = await tryCatch(importExternalStack(stackId));
  if (result.error) {
    console.error(`Error importing stack ${stackId}:`, result.error);
    const response = {
      success: false,
      error: result.error.message || "Failed to import stack",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  const importedStack = result.data;
  console.log(`Successfully imported stack: ${stackId} (${stackName || importedStack.name})`);
  return json({
    success: true,
    stack: importedStack,
    message: `Successfully imported stack ${importedStack.name}`
  });
};
export {
  POST
};
