import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { getSettings, saveSettings } from "$lib/services/settings-service";
import type { SettingsData } from "$lib/types/settings";

export const load: PageServerLoad = async ({ locals }) => {
  const settings = await getSettings();

  const csrf = crypto.randomUUID();

  return {
    settings,
    csrf,
  };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();

    const dockerHost = formData.get("dockerHost") as string;
    const autoUpdate = formData.get("autoUpdate") === "off";
    const pollingIntervalStr = formData.get("pollingInterval") as string;
    const stacksDirectory = (formData.get("stacksDirectory") as string) || "";

    if (!dockerHost) {
      return fail(400, {
        error: "Docker host cannot be empty.",
        values: Object.fromEntries(formData),
      });
    }

    let pollingInterval = parseInt(pollingIntervalStr, 10);
    if (isNaN(pollingInterval) || pollingInterval < 5 || pollingInterval > 60) {
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

    // Extract Valkey config from form
    const valkeyEnabled = formData.get("valkeyEnabled") === "on";

    // Only process Valkey settings if enabled
    let valkeyConfig = null;
    if (valkeyEnabled) {
      valkeyConfig = {
        enabled: true,
        host: formData.get("valkeyHost")?.toString() || "localhost",
        port: parseInt(formData.get("valkeyPort")?.toString() || "6379", 10),
        username: formData.get("valkeyUsername")?.toString() || undefined,
        password: formData.get("valkeyPassword")?.toString() || undefined,
        keyPrefix:
          formData.get("valkeyKeyPrefix")?.toString() || "arcane:settings:",
      };
    } else {
      valkeyConfig = {
        enabled: false,
        host: "localhost",
        port: 6379,
        keyPrefix: "arcane:settings:",
      };
    }

    const updatedSettings: SettingsData = {
      dockerHost,
      autoUpdate,
      pollingInterval,
      stacksDirectory,
      valkeyConfig,
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
