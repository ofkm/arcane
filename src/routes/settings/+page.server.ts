import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { getSettings, saveSettings } from "$lib/services/settings-service";
import type { SettingsData } from "$lib/types/settings";

export const load: PageServerLoad = async () => {
  const settings = await getSettings();
  return { settings };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();

    const dockerHost = formData.get("dockerHost") as string;
    const autoRefresh = formData.get("autoRefresh") === "on";
    const refreshIntervalStr = formData.get("refreshInterval") as string;
    const darkMode = formData.get("darkMode") === "on";
    const stacksDirectory = (formData.get("stacksDirectory") as string) || "";

    if (!dockerHost) {
      return fail(400, {
        error: "Docker host cannot be empty.",
        values: Object.fromEntries(formData),
      });
    }

    let refreshInterval = parseInt(refreshIntervalStr, 10);
    if (isNaN(refreshInterval) || refreshInterval < 5 || refreshInterval > 60) {
      return fail(400, {
        error: "Refresh interval must be between 5 and 60 seconds.",
        values: Object.fromEntries(formData),
      });
    }

    if (!stacksDirectory) {
      return fail(400, {
        error: "Stacks directory cannot be empty.",
        values: Object.fromEntries(formData),
      });
    }

    const updatedSettings: SettingsData = {
      dockerHost,
      autoRefresh,
      refreshInterval,
      darkMode,
      stacksDirectory,
    };

    try {
      await saveSettings(updatedSettings);
      return { success: true, settings: updatedSettings };
    } catch (error: any) {
      return fail(500, {
        error: error.message || "Failed to save settings.",
        values: Object.fromEntries(formData),
      });
    }
  },
};
