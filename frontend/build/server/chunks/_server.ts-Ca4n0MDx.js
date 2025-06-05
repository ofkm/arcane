import { j as json } from './index-Ddp2AB5f.js';
import { g as getSettings, s as saveSettings } from './settings-service-B1w8bfJq.js';
import { initComposeService } from './stack-custom-service-5Y1e9SF0.js';
import { stopAutoUpdateScheduler, initAutoUpdateScheduler } from './scheduler-service-BkX7_vyx.js';
import { A as ApiErrorCode } from './errors.type-DfKnJ3rD.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import { u as updateSettingsStore } from './settings-store-Cucc9Cev.js';
import { d as dockerHost, u as updateDockerConnection } from './core-C8NMHkc_.js';
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
import 'node:fs';
import 'dockerode';
import 'js-yaml';
import 'slugify';
import './compose-db-service-CB23kKq4.js';
import './compose.utils-Dy0jCFPf.js';
import './compose-validate.utils-NVGE7GWN.js';
import './auto-update-service-COdTzVd9.js';
import './container-service-m5_StWPI.js';
import './errors-BtZyvX-k.js';
import './image-service-CL2WzxPP.js';
import './registry.utils-rtYanQFp.js';
import '@swimlane/docker-reference';
import './index2-Da1jJcEh.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';

const GET = async () => {
  const result = await tryCatch(getSettings());
  if (result.error) {
    console.error("API Error fetching settings:", result.error);
    const response = {
      success: false,
      error: result.error.message || "Failed to fetch settings",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  return json({ success: true, settings: result.data });
};
const PUT = async ({ request }) => {
  const bodyResult = await tryCatch(request.json());
  if (bodyResult.error) {
    const response = {
      success: false,
      error: "Invalid JSON payload",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const newSettingsData = bodyResult.data;
  if (!newSettingsData.dockerHost) {
    const response = {
      success: false,
      error: "Docker host cannot be empty.",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  if (!newSettingsData.stacksDirectory) {
    const response = {
      success: false,
      error: "Stacks directory cannot be empty.",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const booleanFields = ["autoUpdate", "pollingEnabled"];
  booleanFields.forEach((field) => {
    const currentValue = newSettingsData[field];
    if (typeof currentValue === "string") {
      newSettingsData[field] = currentValue.toLowerCase() === "true";
    }
  });
  if (newSettingsData.auth) {
    const nestedAuthBooleanFields = ["localAuthEnabled", "rbacEnabled"];
    nestedAuthBooleanFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(newSettingsData.auth, field)) {
        const currentValue = newSettingsData.auth[field];
        if (typeof currentValue === "string") {
          newSettingsData.auth[field] = currentValue.toLowerCase() === "true";
        }
      }
    });
  }
  if (newSettingsData.pollingEnabled) {
    const pollingInterval = parseInt(String(newSettingsData.pollingInterval), 10);
    if (isNaN(pollingInterval) || pollingInterval < 5 || pollingInterval > 60) {
      const response = {
        success: false,
        error: "Polling interval must be between 5 and 60 minutes.",
        code: ApiErrorCode.BAD_REQUEST
      };
      return json(response, { status: 400 });
    }
    newSettingsData.pollingInterval = pollingInterval;
  }
  if (newSettingsData.autoUpdate) {
    const autoUpdateInterval = parseInt(String(newSettingsData.autoUpdateInterval), 10);
    if (isNaN(autoUpdateInterval) || autoUpdateInterval < 5) {
      const response = {
        success: false,
        error: "Auto-update interval must be at least 5 minutes.",
        code: ApiErrorCode.BAD_REQUEST
      };
      return json(response, { status: 400 });
    }
    newSettingsData.autoUpdateInterval = autoUpdateInterval;
  }
  const maturityThresholdDays = parseInt(String(newSettingsData.maturityThresholdDays), 10);
  if (isNaN(maturityThresholdDays) || maturityThresholdDays < 1 || maturityThresholdDays > 365) {
    const response = {
      success: false,
      error: "Maturity threshold must be between 1 and 365 days.",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  newSettingsData.maturityThresholdDays = maturityThresholdDays;
  const saveResult = await tryCatch(saveSettings(newSettingsData));
  if (saveResult.error) {
    console.error("API Error saving settings:", saveResult.error);
    const response = {
      success: false,
      error: saveResult.error.message || "Failed to save settings",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: saveResult.error
    };
    return json(response, { status: 500 });
  }
  console.log("API: Settings saved to disk successfully.");
  updateSettingsStore(newSettingsData);
  console.log("API: Server-side settingsStore updated.");
  const newDockerHost = newSettingsData.dockerHost;
  if (newDockerHost && newDockerHost !== dockerHost) {
    console.log(`API: Docker host changed from "${dockerHost}" to "${newDockerHost}". Updating Docker connection.`);
    updateDockerConnection(newDockerHost);
  } else if (newDockerHost) {
    console.log(`API: Docker host "${newDockerHost}" is the same as current "${dockerHost}". No Docker connection update forced from API.`);
  }
  await tryCatch(initComposeService());
  await tryCatch(stopAutoUpdateScheduler());
  if (newSettingsData.autoUpdate) {
    await tryCatch(initAutoUpdateScheduler());
  }
  return json({ success: true, message: "Settings updated successfully" });
};

export { GET, PUT };
//# sourceMappingURL=_server.ts-Ca4n0MDx.js.map
