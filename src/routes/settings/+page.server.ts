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
    let formData = new FormData();
    try {
      formData = await request.formData();
      const settings = await getSettings();

      const dockerHost = formData.get("dockerHost") as string;
      const autoUpdate = formData.get("autoUpdate") === "on";
      const pollingEnabled = formData.get("pollingInterval") === "on";
      const pollingIntervalStr = formData.get("pollingInterval") as string;
      const stacksDirectory = (formData.get("stacksDirectory") as string) || "";

      if (!dockerHost) {
        return fail(400, {
          error: "Docker host cannot be empty.",
          values: Object.fromEntries(formData),
        });
      }

      // Get the previous polling interval setting to use as default
      let pollingInterval = settings.pollingInterval;

      // Only validate polling interval if polling is enabled
      if (pollingEnabled) {
        const parsedInterval = parseInt(pollingIntervalStr, 10);
        if (
          !isNaN(parsedInterval) &&
          parsedInterval >= 5 &&
          parsedInterval <= 60
        ) {
          // Valid polling interval
          pollingInterval = parsedInterval;
        } else {
          // Invalid polling interval, but only return error if polling is enabled
          return fail(400, {
            error: "Polling interval must be between 5 and 60 minutes.",
            values: Object.fromEntries(formData),
          });
        }
      } else {
        // If polling is disabled, use the default or previous value
        // This ensures we don't lose the setting if polling is temporarily disabled
        pollingInterval = pollingInterval || 10;
      }

      if (!stacksDirectory) {
        return fail(400, {
          error: "Stacks directory cannot be empty.",
          values: Object.fromEntries(formData),
        });
      }

      // Extract Valkey settings
      const valkeyEnabled = formData.get("valkeyEnabled") === "on";

      // Update external services settings
      const externalServices = {
        ...settings.externalServices,
        valkey: {
          enabled: valkeyEnabled,
          host: formData.get("valkeyHost")?.toString() || "localhost",
          port: parseInt(formData.get("valkeyPort")?.toString() || "6379", 10),
          username: formData.get("valkeyUsername")?.toString() || "",
          password: formData.get("valkeyPassword")?.toString() || "",
          keyPrefix:
            formData.get("valkeyKeyPrefix")?.toString() || "arcane:settings:",
        },
      };

      // Update settings with all form values
      const updatedSettings: SettingsData = {
        ...settings,
        dockerHost,
        autoUpdate,
        pollingInterval,
        stacksDirectory,
        externalServices,
      };

      // Save updated settings
      await saveSettings(updatedSettings);

      return { success: true };
    } catch (error: any) {
      console.error("Error updating settings:", error);
      return fail(500, {
        error: error.message || "Failed to save settings.",
        values: Object.fromEntries(formData),
      });
    }
  },
};
