import { g as getSettings } from "../../../../chunks/settings-service.js";
const load = async () => {
  try {
    const settings = await getSettings();
    return {
      settings
    };
  } catch (error) {
    console.error("Failed to load settings:", error);
    return {
      settings: {
        stacksDirectory: "data/stacks",
        baseServerUrl: "localhost",
        maturityThresholdDays: 30
      }
    };
  }
};
export {
  load
};
