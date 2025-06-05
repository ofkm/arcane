import { j as json } from "../../../../../chunks/index.js";
import { g as getSettings } from "../../../../../chunks/settings-service.js";
import { c as checkAndUpdateContainers, a as checkAndUpdateStacks } from "../../../../../chunks/auto-update-service.js";
import { A as ApiErrorCode } from "../../../../../chunks/errors.type.js";
import { t as tryCatch } from "../../../../../chunks/try-catch.js";
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
export {
  GET,
  POST
};
