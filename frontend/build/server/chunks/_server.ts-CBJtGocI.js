import { j as json } from './index-Ddp2AB5f.js';
import { validateStackConfiguration } from './stack-custom-service-5Y1e9SF0.js';
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

async function GET({ params, url }) {
  try {
    const stackId = params.stackId;
    if (!stackId) {
      return json({ error: "Stack ID is required" }, { status: 400 });
    }
    const mode = url.searchParams.get("mode") || "default";
    if (!["default", "strict", "loose"].includes(mode)) {
      return json({ error: "Invalid validation mode. Use: default, strict, or loose" }, { status: 400 });
    }
    const validation = await validateStackConfiguration(stackId, mode);
    return json({
      stackId,
      mode,
      ...validation
    });
  } catch (error) {
    console.error("Stack validation error:", error);
    return json({ error: "Failed to validate stack configuration" }, { status: 500 });
  }
}

export { GET };
//# sourceMappingURL=_server.ts-CBJtGocI.js.map
