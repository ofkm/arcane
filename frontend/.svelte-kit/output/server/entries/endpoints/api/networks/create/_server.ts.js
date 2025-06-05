import { j as json } from "../../../../../chunks/index.js";
import { c as createNetwork } from "../../../../../chunks/network-service.js";
import { A as ApiErrorCode } from "../../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../../chunks/errors.util.js";
import { t as tryCatch } from "../../../../../chunks/try-catch.js";
const POST = async ({ request }) => {
  let options;
  const requestBodyResult = await tryCatch(request.json());
  if (requestBodyResult.error) {
    const response = {
      success: false,
      error: "Invalid JSON payload",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  options = requestBodyResult.data;
  if (!options.Name) {
    const response = {
      success: false,
      error: "Network name (Name) is required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  if (options.CheckDuplicate === void 0) {
    options.CheckDuplicate = true;
  }
  const result = await tryCatch(createNetwork(options));
  if (result.error) {
    console.error("API Error creating network:", result.error);
    if (result.error.message?.includes("already exists")) {
      const response2 = {
        success: false,
        error: `Network with name "${options.Name}" already exists`,
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
  const networkInfo = result.data;
  return json({
    success: true,
    network: {
      id: networkInfo.Id,
      name: networkInfo.Name,
      driver: networkInfo.Driver,
      scope: networkInfo.Scope,
      subnet: networkInfo.IPAM?.Config?.[0]?.Subnet ?? null,
      gateway: networkInfo.IPAM?.Config?.[0]?.Gateway ?? null,
      created: networkInfo.Created
    },
    message: `Network "${networkInfo.Name}" created successfully.`
  });
};
export {
  POST
};
