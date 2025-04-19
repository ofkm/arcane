import type { SettingsData } from "$lib/types/settings";
import { updateStacksDirectory } from "./compose";
import { updateDockerConnection } from "./docker-service";
import fs from "fs/promises";
import path from "path";

const SETTINGS_FILE = path.resolve("./app-settings.json");

// Default settings
const DEFAULT_SETTINGS: SettingsData = {
  dockerHost: "unix:///var/run/docker.sock",
  autoRefresh: true,
  refreshInterval: 10,
  darkMode: true,
  stacksDirectory: path.resolve(".arcane", "stacks"),
};

// Get settings
export async function getSettings(): Promise<SettingsData> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(data);

    // Ensure all expected properties exist
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.log("Settings file not found, using defaults.");
      // Automatically save defaults if file doesn't exist
      await saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    console.error("Error loading settings:", error);
    return DEFAULT_SETTINGS;
  }
}

// Save settings
export async function saveSettings(settings: SettingsData): Promise<void> {
  try {
    // Ensure directory exists
    const settingsDir = path.dirname(SETTINGS_FILE);
    await fs.mkdir(settingsDir, { recursive: true });

    // Write the settings
    await fs.writeFile(
      SETTINGS_FILE,
      JSON.stringify(settings, null, 2),
      "utf-8"
    );

    console.log("Settings saved to:", SETTINGS_FILE);

    // Apply settings to runtime services
    updateDockerConnection(settings.dockerHost);
    updateStacksDirectory(settings.stacksDirectory);
  } catch (error) {
    console.error("Error saving settings:", error);
    throw new Error("Failed to save settings.");
  }
}

// Initialize settings on server start
export async function initializeSettings(): Promise<SettingsData> {
  const settings = await getSettings();

  // Apply settings to services
  updateDockerConnection(settings.dockerHost);
  updateStacksDirectory(settings.stacksDirectory);

  return settings;
}
