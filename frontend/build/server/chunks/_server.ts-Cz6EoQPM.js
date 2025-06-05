import { j as json } from './index-Ddp2AB5f.js';
import { importExternalStack } from './stack-custom-service-5Y1e9SF0.js';
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

export { POST };
//# sourceMappingURL=_server.ts-Cz6EoQPM.js.map
