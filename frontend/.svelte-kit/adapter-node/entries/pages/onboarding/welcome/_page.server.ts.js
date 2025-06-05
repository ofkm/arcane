import { r as redirect } from "../../../../chunks/index.js";
import { g as getSettings } from "../../../../chunks/settings-service.js";
async function load() {
  const settings = await getSettings();
  if (settings.onboarding && settings.onboarding.completed) {
    throw redirect(302, "/");
  }
  return { settings };
}
export {
  load
};
