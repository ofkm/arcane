import { j as json } from './index-Ddp2AB5f.js';
import { createStack } from './stack-custom-service-5Y1e9SF0.js';
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

export { POST };
//# sourceMappingURL=_server.ts-DA8Eu-Jz.js.map
