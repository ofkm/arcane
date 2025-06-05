import { j as json } from './index-Ddp2AB5f.js';
import { destroyStack } from './stack-custom-service-5Y1e9SF0.js';
import { A as ApiErrorCode } from './errors.type-DfKnJ3rD.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import 'node:fs';
import 'node:path';
import 'dockerode';
import 'js-yaml';
import 'slugify';
import './core-C8NMHkc_.js';
import './settings-service-B1w8bfJq.js';
import 'proper-lockfile';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:fs/promises';
import 'node:util';
import './schema-CDkq0ub_.js';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './settings-db-service-DyTlfQVT.js';
import './index4-SoK3Vczo.js';
import './compose-db-service-CB23kKq4.js';
import './compose.utils-Dy0jCFPf.js';
import './compose-validate.utils-NVGE7GWN.js';

const DELETE = async ({ params, url }) => {
  const id = params.stackId;
  const removeFiles = url.searchParams.get("removeFiles") === "true";
  const removeVolumes = url.searchParams.get("removeVolumes") === "true";
  if (!id) {
    const response = {
      success: false,
      error: "Stack ID is required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const result = await tryCatch(destroyStack(id, removeVolumes, removeFiles));
  if (result.error) {
    console.error(`API Error destroying stack ${id}:`, result.error);
    const response = {
      success: false,
      error: result.error.message || "Failed to destroy stack",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: result.error
    };
    return json(response, { status: 409 });
  }
  if (result.data) {
    return json({
      success: true,
      message: `Stack Destroyed Successfully${removeFiles ? " (including files)" : ""}`
    });
  } else {
    const response = {
      success: false,
      error: "Failed to remove stack",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
};

export { DELETE };
//# sourceMappingURL=_server.ts-BrZR_rkJ.js.map
