import fs from "fs/promises";
import path from "path";
import proper from "proper-lockfile";
import type { SettingsData } from "$lib/types/settings";

// Determine if we're in development or production
const isDev = process.env.NODE_ENV === "development";

// Configure paths based on environment
const BASE_PATH = isDev
  ? path.resolve(process.cwd(), ".dev-data")
  : "/app/data";

const SETTINGS_FILE = path.join(BASE_PATH, "app-settings.json");
const SETTINGS_FOLDER = path.join(BASE_PATH, "settings");

// Default settings - also adapt paths for development environment
export const DEFAULT_SETTINGS: SettingsData = {
  dockerHost: isDev
    ? process.platform === "win32"
      ? "npipe:////./pipe/docker_engine"
      : "unix:///var/run/docker.sock"
    : "unix:///var/run/docker.sock",
  autoUpdate: false,
  pollingEnabled: true,
  pollingInterval: 10,
  stacksDirectory: path.resolve(BASE_PATH, "stacks"),
  externalServices: {
    valkey: {
      enabled: false,
      host: "localhost",
      port: 6379,
      username: "",
      password: "",
      keyPrefix: "arcane:settings:",
    },
  },
};

// Path getter functions
export function getBasePath(): string {
  return BASE_PATH;
}

export function getSettingsFilePath(): string {
  return SETTINGS_FILE;
}

export function getStacksDirectory(): string {
  return DEFAULT_SETTINGS.stacksDirectory;
}

// Log configured paths on startup
console.log(`Settings service configured with:
- Environment: ${isDev ? "Development" : "Production"}
- Settings file: ${SETTINGS_FILE}
- Settings folder: ${SETTINGS_FOLDER}
- Default stacks directory: ${DEFAULT_SETTINGS.stacksDirectory}
`);

// Make sure directories exist
async function ensureDirs() {
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await fs.mkdir(SETTINGS_FOLDER, { recursive: true });
}

/**
 * Create stacks directory if it doesn't exist
 */
export async function ensureStacksDirectory(): Promise<string> {
  try {
    const settings = await getSettings();
    const stacksDir = settings.stacksDirectory;

    await fs.mkdir(stacksDir, { recursive: true });
    return stacksDir;
  } catch (err) {
    console.error("Error ensuring stacks directory:", err);
    // Fall back to default
    try {
      await fs.mkdir(DEFAULT_SETTINGS.stacksDirectory, { recursive: true });
      return DEFAULT_SETTINGS.stacksDirectory;
    } catch (innerErr) {
      console.error("Failed to create default stacks directory:", innerErr);
      throw new Error("Unable to create stacks directory");
    }
  }
}

// Save a setting to its own file
async function saveSetting(key: string, value: any): Promise<void> {
  const filePath = path.join(SETTINGS_FOLDER, `${key}.json`);

  // Make sure the directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    // Create the file if it doesn't exist
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, "{}");
    }

    // Acquire a lock
    const release = await proper.lock(filePath, { retries: 5 });

    try {
      await fs.writeFile(filePath, JSON.stringify(value));
    } finally {
      // Release the lock
      await release();
    }
  } catch (error) {
    console.error(`Error saving setting ${key}:`, error);
    throw error;
  }
}

// Get a setting from its own file
async function getSetting(key: string): Promise<any | null> {
  const filePath = path.join(SETTINGS_FOLDER, `${key}.json`);

  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

// Get all settings
export async function getSettings(): Promise<SettingsData> {
  try {
    await ensureDirs();

    // Try to load the main settings file first (as override)
    let fileSettings: Partial<SettingsData> = {};
    try {
      const data = await fs.readFile(SETTINGS_FILE, "utf-8");
      fileSettings = JSON.parse(data);

      // If in development and paths are production paths, convert them
      if (isDev) {
        // Convert any absolute /app/data paths to local development paths
        if (
          fileSettings.stacksDirectory &&
          fileSettings.stacksDirectory.startsWith("/app/data")
        ) {
          fileSettings.stacksDirectory = fileSettings.stacksDirectory.replace(
            "/app/data",
            BASE_PATH
          );
        }
      }
    } catch (error) {
      console.log("No main settings file found");
    }

    // Load individual settings
    const individualSettings: Record<string, any> = {};
    try {
      const files = await fs.readdir(SETTINGS_FOLDER);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const key = file.replace(".json", "");
          const value = await getSetting(key);
          if (value !== null) {
            individualSettings[key] = value;
          }
        }
      }
    } catch (error) {
      console.error("Error reading individual settings:", error);
    }

    // Merge in order: defaults < individual < file
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...individualSettings,
      ...fileSettings,
    };

    // Ensure stacks directory exists
    await fs.mkdir(mergedSettings.stacksDirectory, { recursive: true });

    return mergedSettings;
  } catch (error) {
    console.error("Error loading settings:", error);
    return DEFAULT_SETTINGS;
  }
}

// Save all settings
export async function saveSettings(settings: SettingsData): Promise<void> {
  await ensureDirs();

  try {
    // In development mode, ensure paths are relative to the current environment
    let settingsToSave = { ...settings };

    // If we're in development and the stacks directory is still a production path
    if (isDev && settingsToSave.stacksDirectory?.startsWith("/app/data")) {
      settingsToSave.stacksDirectory = settingsToSave.stacksDirectory.replace(
        "/app/data",
        BASE_PATH
      );
    }

    // Save each setting to its own file for granular access
    const flatSettings = flattenObject(settingsToSave);
    for (const [key, value] of Object.entries(flatSettings)) {
      await saveSetting(key, value);
    }

    // Also save the complete settings as a snapshot
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settingsToSave, null, 2));

    // Ensure the stacks directory exists
    await fs.mkdir(settingsToSave.stacksDirectory, { recursive: true });

    console.log("Settings saved successfully");
  } catch (error) {
    console.error("Error saving settings:", error);
    throw new Error("Failed to save settings");
  }
}

// Helper function to flatten nested objects
function flattenObject(obj: any, prefix = ""): Record<string, any> {
  return Object.keys(obj).reduce((acc: Record<string, any>, k: string) => {
    const pre = prefix.length ? `${prefix}.` : "";
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
