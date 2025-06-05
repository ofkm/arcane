import { j as json } from './index-Ddp2AB5f.js';
import { g as getSettings } from './settings-service-B1w8bfJq.js';
import { c as checkAndUpdateContainers, a as checkAndUpdateStacks } from './auto-update-service-COdTzVd9.js';
import { A as ApiErrorCode } from './errors.type-DfKnJ3rD.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
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
import './container-service-m5_StWPI.js';
import './core-C8NMHkc_.js';
import 'dockerode';
import './errors-BtZyvX-k.js';
import './stack-custom-service-5Y1e9SF0.js';
import 'node:fs';
import 'js-yaml';
import 'slugify';
import './compose-db-service-CB23kKq4.js';
import './compose.utils-Dy0jCFPf.js';
import './compose-validate.utils-NVGE7GWN.js';
import './image-service-CL2WzxPP.js';
import './registry.utils-rtYanQFp.js';
import '@swimlane/docker-reference';

const GET = async () => {
  const settingsResult = await tryCatch(getSettings());
  if (settingsResult.error) {
    console.error("Error getting auto-update status:", settingsResult.error);
    const response = {
      success: false,
      error: settingsResult.error.message || "Failed to get auto-update status",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: settingsResult.error
    };
    return json(response, { status: 500 });
  }
  const settings = settingsResult.data;
  return json({
    success: true,
    enabled: settings.autoUpdate,
    interval: settings.autoUpdateInterval || 60,
    message: settings.autoUpdate ? `Auto-update is enabled and checks every ${settings.autoUpdateInterval || 60} minutes` : "Auto-update is disabled"
  });
};
const POST = async () => {
  const containerResult = await tryCatch(checkAndUpdateContainers());
  const stackResult = await tryCatch(checkAndUpdateStacks());
  if (containerResult.error || stackResult.error) {
    console.error("Error running manual update check:", containerResult.error || stackResult.error);
    const response = {
      success: false,
      error: containerResult.error?.message || stackResult.error?.message || "Failed to run update check",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: containerResult.error || stackResult.error
    };
    return json(response, { status: 500 });
  }
  return json({
    success: true,
    containers: containerResult.data,
    stacks: stackResult.data
  });
};

export { GET, POST };
//# sourceMappingURL=_server.ts-ecwYyO2z.js.map
