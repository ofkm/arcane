import { j as json } from "../../../../chunks/index.js";
import { l as listImages } from "../../../../chunks/image-service.js";
import { A as ApiErrorCode } from "../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../chunks/errors.util.js";
import { t as tryCatch } from "../../../../chunks/try-catch.js";
const GET = async () => {
  const result = await tryCatch(listImages());
  console.log("Result:", result);
  if (result.error) {
    console.error("Error fetching images:", result.error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(result.error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  return json(result.data);
};
export {
  GET
};
