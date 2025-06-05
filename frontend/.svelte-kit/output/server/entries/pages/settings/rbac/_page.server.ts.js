import { g as getSettings } from "../../../../chunks/settings-service.js";
const load = async () => {
  const settings = await getSettings();
  return {
    settings
  };
};
export {
  load
};
