import { j as json } from "../../../../../chunks/index.js";
import { r as removeVolume } from "../../../../../chunks/volume-service.js";
import { A as ApiErrorCode } from "../../../../../chunks/errors.type.js";
import { t as tryCatch } from "../../../../../chunks/try-catch.js";
const DELETE = async ({ params, url }) => {
  const { name } = params;
  const force = url.searchParams.get("force") === "true";
  const result = await tryCatch(removeVolume(name, force));
  if (result.error) {
    console.error("API Error removing volume:", result.error);
    const response = {
      success: false,
      error: result.error.message || "Failed to remove volume",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  return json({ success: true });
};
export {
  DELETE
};
