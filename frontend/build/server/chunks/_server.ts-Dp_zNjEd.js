import { j as json } from './index-Ddp2AB5f.js';
import { r as removeNetwork } from './network-service-FOR9TyaI.js';
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

const DELETE = async ({ params }) => {
  const networkId = params.id;
  if (!networkId) {
    const response = {
      success: false,
      error: "Network ID is required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const result = await tryCatch(removeNetwork(networkId));
  if (result.error) {
    console.error(`API Error removing network ${networkId}:`, result.error);
    if (result.error.message?.includes("not found")) {
      const response2 = {
        success: false,
        error: result.error.message,
        code: ApiErrorCode.NOT_FOUND,
        details: result.error
      };
      return json(response2, { status: 404 });
    }
    if (result.error.message?.includes("cannot be removed")) {
      const response2 = {
        success: false,
        error: result.error.message,
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
  return json({
    success: true,
    message: `Network ${networkId} deleted.`
  });
};

export { DELETE };
//# sourceMappingURL=_server.ts-Dp_zNjEd.js.map
