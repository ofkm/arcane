import { g as getSettings } from './settings-service-B1w8bfJq.js';
import { c as checkAndUpdateContainers, a as checkAndUpdateStacks } from './auto-update-service-COdTzVd9.js';
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
import './errors.type-DfKnJ3rD.js';
import './registry.utils-rtYanQFp.js';
import '@swimlane/docker-reference';
import './try-catch-KtE72Cop.js';

let autoUpdateTimer = null;
async function initAutoUpdateScheduler() {
  const settings = await getSettings();
  if (autoUpdateTimer) {
    clearInterval(autoUpdateTimer);
    autoUpdateTimer = null;
  }
  if (!settings.autoUpdate) {
    console.log("Auto-update is disabled in settings");
    return;
  }
  const intervalMinutes = settings.autoUpdateInterval || 60;
  const intervalMs = intervalMinutes * 60 * 1e3;
  console.log(`Starting auto-update scheduler with interval of ${intervalMinutes} minutes`);
  await runAutoUpdateChecks();
  autoUpdateTimer = setInterval(runAutoUpdateChecks, intervalMs);
}
async function runAutoUpdateChecks() {
  console.log("Running scheduled auto-update checks...");
  try {
    const containerResults = await checkAndUpdateContainers();
    console.log(`Auto-update check completed for containers: Checked ${containerResults.checked}, Updated ${containerResults.updated}, Errors ${containerResults.errors.length}`);
    const stackResults = await checkAndUpdateStacks();
    console.log(`Auto-update check completed for stacks: Checked ${stackResults.checked}, Updated ${stackResults.updated}, Errors ${stackResults.errors.length}`);
  } catch (error) {
    console.error("Error during auto-update check:", error);
  }
}
async function stopAutoUpdateScheduler() {
  if (autoUpdateTimer) {
    clearInterval(autoUpdateTimer);
    autoUpdateTimer = null;
    console.log("Auto-update scheduler stopped");
  }
}

export { initAutoUpdateScheduler, stopAutoUpdateScheduler };
//# sourceMappingURL=scheduler-service-BkX7_vyx.js.map
