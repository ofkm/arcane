import { j as json } from './index-Ddp2AB5f.js';
import { previewStackDeployment } from './stack-custom-service-5Y1e9SF0.js';
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

async function POST({ params, request }) {
  const { stackId } = params;
  try {
    const body = await request.json();
    const { profiles } = body;
    const result = await tryCatch(previewStackDeployment(stackId, profiles || []));
    if (result.error) {
      return json({ error: result.error.message }, { status: 500 });
    }
    return json(result.data);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}

export { POST };
//# sourceMappingURL=_server.ts-Cjt0F4Xm.js.map
