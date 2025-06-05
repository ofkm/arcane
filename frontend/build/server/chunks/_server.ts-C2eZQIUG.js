import { j as json } from './index-Ddp2AB5f.js';
import { r as removeVolume } from './volume-service-CME0Oab3.js';
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

export { DELETE };
//# sourceMappingURL=_server.ts-C2eZQIUG.js.map
