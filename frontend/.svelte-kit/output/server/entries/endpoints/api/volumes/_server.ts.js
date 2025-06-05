import { j as json } from "../../../../chunks/index.js";
import { l as listVolumes, c as createVolume } from "../../../../chunks/volume-service.js";
import { A as ApiErrorCode } from "../../../../chunks/errors.type.js";
import { t as tryCatch } from "../../../../chunks/try-catch.js";
const GET = async () => {
  const volumesResult = await tryCatch(listVolumes());
  if (volumesResult.error) {
    console.error("API Error fetching volumes:", volumesResult.error);
    const typedError = volumesResult.error;
    const response = {
      success: false,
      error: typedError.message || "Failed to fetch volumes",
      code: typedError.code || ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: typedError.details || typedError
    };
    const status = typeof typedError.statusCode === "number" ? typedError.statusCode : 500;
    return json(response, { status });
  }
  return json(volumesResult.data, { status: 200 });
};
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
  if (!body.Name) {
    const response = {
      success: false,
      error: "Volume name (Name) is required.",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const volumeResult = await tryCatch(createVolume(body));
  if (volumeResult.error) {
    console.error("API Error creating volume:", volumeResult.error);
    const typedError = volumeResult.error;
    const response = {
      success: false,
      error: typedError.message || "Failed to create volume",
      code: typedError.code || ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: typedError.details || typedError
    };
    const status = typeof typedError.statusCode === "number" ? typedError.statusCode : 500;
    return json(response, { status });
  }
  const volumeInfo = volumeResult.data;
  return json(
    {
      success: true,
      volume: volumeInfo
    },
    { status: 201 }
  );
};
export {
  GET,
  POST
};
