import { j as json } from "../../../../chunks/index.js";
import { g as getSettings, s as saveSettings } from "../../../../chunks/settings-service.js";
import { initComposeService } from "../../../../chunks/stack-custom-service.js";
import { stopAutoUpdateScheduler, initAutoUpdateScheduler } from "../../../../chunks/scheduler-service.js";
import { A as ApiErrorCode } from "../../../../chunks/errors.type.js";
import { t as tryCatch } from "../../../../chunks/try-catch.js";
import { u as updateSettingsStore } from "../../../../chunks/settings-store.js";
import { d as dockerHost, u as updateDockerConnection } from "../../../../chunks/core.js";
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
export {
  GET,
  PUT
};
