import { r as redirect } from "../../../../chunks/index.js";
import { g as getSettings } from "../../../../chunks/settings-service.js";
async function load() {
  const settings = await getSettings();
  if (settings.onboarding?.steps?.password) {
    throw redirect(302, "/onboarding/settings");
  }
  return { settings };
}
export {
  load
};
