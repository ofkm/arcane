import type { SettingsData } from "$lib/types/settings";
import { updateStacksDirectory } from "./compose";
import { updateDockerConnection } from "./docker-service";
import fs from "fs/promises";
import path from "path";
import * as valkeyService from "./valkey-service";

// Update the settings file path to be in /app/data directory
const SETTINGS_FILE = path.resolve("/app/data/app-settings.json");

// The key prefix for settings in Valkey
const DEFAULT_KEY_PREFIX = "arcane:settings:";

// Default settings
const DEFAULT_SETTINGS: SettingsData = {
  dockerHost: "unix:///var/run/docker.sock",
  autoUpdate: false,
  pollingInterval: 10,
  stacksDirectory: path.resolve("/app/data/stacks"),
  // Default Valkey configuration (disabled by default)
  valkeyConfig: {
    enabled: false,
    host: "localhost",
    port: 6379,
    keyPrefix: DEFAULT_KEY_PREFIX,
  },
};

// Get settings from Valkey
async function getSettingsFromValkey(
  keyPrefix: string
): Promise<Partial<SettingsData>> {
  try {
    if (!valkeyService.isValKeyConnected()) return {};

    // Get all settings from Valkey
    const settingsEntries = await valkeyService.getKeysValues(`${keyPrefix}*`);
    const settings: Partial<SettingsData> = {};

    for (const [key, value] of Object.entries(settingsEntries)) {
      const settingKey = key.replace(keyPrefix, "");
      // Handle nested properties
      if (settingKey.includes(":")) {
        const [parent, child] = settingKey.split(":");
        if (!settings[parent as keyof SettingsData]) {
          settings[parent as keyof SettingsData] = {} as any;
        }
        (settings[parent as keyof SettingsData] as any)[child] =
          tryParse(value);
      } else {
        (settings as any)[settingKey] = tryParse(value);
      }
    }

    return settings;
  } catch (error) {
    console.error("Error loading settings from Valkey:", error);
    return {};
  }
}

// Save settings to Valkey
async function saveSettingsToValkey(
  settings: SettingsData,
  keyPrefix: string
): Promise<boolean> {
  try {
    if (!valkeyService.isValKeyConnected()) return false;

    // Flatten settings object for storage
    const flattenedSettings = flattenObject(settings);

    for (const [key, value] of Object.entries(flattenedSettings)) {
      await valkeyService.setValue(`${keyPrefix}${key}`, JSON.stringify(value));
    }

    return true;
  } catch (error) {
    console.error("Error saving settings to Valkey:", error);
    return false;
  }
}

// Helper function to flatten nested objects
function flattenObject(obj: any, prefix = ""): Record<string, any> {
  return Object.keys(obj).reduce((acc: Record<string, any>, k: string) => {
    const pre = prefix.length ? `${prefix}:` : "";
    if (
      typeof obj[k] === "object" &&
      obj[k] !== null &&
      !Array.isArray(obj[k])
    ) {
      Object.assign(acc, flattenObject(obj[k], `${pre}${k}`));
    } else {
      acc[`${pre}${k}`] = obj[k];
    }
    return acc;
  }, {});
}

// Helper to parse JSON values
function tryParse(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// Get settings
export async function getSettings(): Promise<SettingsData> {
  try {
    // First, read from file for baseline settings
    const settingsDir = path.dirname(SETTINGS_FILE);
    await fs.mkdir(settingsDir, { recursive: true });

    let fileSettings: Partial<SettingsData> = {};
    try {
      const data = await fs.readFile(SETTINGS_FILE, "utf-8");
      fileSettings = JSON.parse(data);
    } catch (error) {
      console.log("Settings file not found or invalid, using defaults.");
      fileSettings = {};
    }

    // Merge with defaults
    const settings = { ...DEFAULT_SETTINGS, ...fileSettings };

    // If Valkey is enabled in the file settings, try to connect and get settings
    let valkeySettings: Partial<SettingsData> = {};
    if (settings.valkeyConfig?.enabled) {
      // Initialize Valkey connection with settings from file
      await valkeyService.initValKeyClient({
        host: settings.valkeyConfig.host,
        port: settings.valkeyConfig.port,
        username: settings.valkeyConfig.username,
        password: settings.valkeyConfig.password,
      });

      // Get settings from Valkey
      valkeySettings = await getSettingsFromValkey(
        settings.valkeyConfig.keyPrefix || DEFAULT_KEY_PREFIX
      );
    }

    // Merge in this order: defaults < valkey < file
    // This ensures file settings take precedence as overrides
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...valkeySettings,
      ...fileSettings,
    };

    // Don't try to update Docker connection during build time
    if (process.env.NODE_ENV !== "build") {
      await saveSettings(mergedSettings, false); // Don't update connections during initialization
    }

    return mergedSettings;
  } catch (error) {
    console.error("Error loading settings:", error);
    return DEFAULT_SETTINGS;
  }
}

// Save settings
export async function saveSettings(
  settings: SettingsData,
  updateConnections = true
): Promise<void> {
  try {
    // Always save to the JSON file
    const settingsDir = path.dirname(SETTINGS_FILE);
    await fs.mkdir(settingsDir, { recursive: true });
    await fs.writeFile(
      SETTINGS_FILE,
      JSON.stringify(settings, null, 2),
      "utf-8"
    );
    console.log("Settings saved to file:", SETTINGS_FILE);

    // If Valkey is enabled, save to Valkey as well
    if (settings.valkeyConfig?.enabled) {
      // Make sure connection is established with current settings
      await valkeyService.initValKeyClient({
        host: settings.valkeyConfig.host,
        port: settings.valkeyConfig.port,
        username: settings.valkeyConfig.username,
        password: settings.valkeyConfig.password,
      });

      // Save settings to Valkey
      const saved = await saveSettingsToValkey(
        settings,
        settings.valkeyConfig.keyPrefix || DEFAULT_KEY_PREFIX
      );

      if (saved) {
        console.log("Settings saved to Valkey");
      }
    }

    // Apply settings to runtime services - but skip during builds or initial loading
    if (updateConnections && process.env.NODE_ENV !== "build") {
      updateDockerConnection(settings.dockerHost);
      updateStacksDirectory(settings.stacksDirectory);
    }
  } catch (error) {
    console.error("Error saving settings:", error);
    throw new Error("Failed to save settings.");
  }
}
