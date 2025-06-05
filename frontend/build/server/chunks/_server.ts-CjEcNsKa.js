import { j as json } from './index-Ddp2AB5f.js';
import { c as createNetwork } from './network-service-FOR9TyaI.js';
import { A as ApiErrorCode } from './errors.type-DfKnJ3rD.js';
import { e as extractDockerErrorMessage } from './errors.util-g315AnHn.js';
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
import './constants-BuoZlPL3.js';

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

export { POST };
//# sourceMappingURL=_server.ts-CjEcNsKa.js.map
