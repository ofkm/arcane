import { j as json } from './index-Ddp2AB5f.js';
import { l as listVolumes, c as createVolume } from './volume-service-CME0Oab3.js';
import { A as ApiErrorCode } from './errors.type-DfKnJ3rD.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import './core-C8NMHkc_.js';
import 'dockerode';
import './settings-service-B1w8bfJq.js';
import 'proper-lockfile';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:fs/promises';
import 'node:path';
import 'node:util';
import './schema-CDkq0ub_.js';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './settings-db-service-DyTlfQVT.js';
import './index4-SoK3Vczo.js';
import './errors-BtZyvX-k.js';

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

export { GET, POST };
//# sourceMappingURL=_server.ts-b6OJIPv2.js.map
