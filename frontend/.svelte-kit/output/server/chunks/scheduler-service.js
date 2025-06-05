import { g as getSettings } from "./settings-service.js";
import { c as checkAndUpdateContainers, a as checkAndUpdateStacks } from "./auto-update-service.js";
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
export {
  initAutoUpdateScheduler,
  stopAutoUpdateScheduler
};
