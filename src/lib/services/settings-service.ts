import type { SettingsData } from "$lib/types/settings";
import { updateStacksDirectory } from "./compose";
import { updateDockerConnection } from "./docker-service";
import fs from "fs/promises";
import path from "path";

// Update the settings file path to be in /app/data directory
const SETTINGS_FILE = path.resolve("/app/data/app-settings.json");

// Default settings
const DEFAULT_SETTINGS: SettingsData = {
  dockerHost: "unix:///var/run/docker.sock",
  autoRefresh: true,
  refreshInterval: 10,
  darkMode: true,
  stacksDirectory: path.resolve("/app/data/stacks"),
};

// Get settings
export async function getSettings(): Promise<SettingsData> {
  try {
    const settingsDir = path.dirname(SETTINGS_FILE);
    await fs.mkdir(settingsDir, { recursive: true });

    const data = await fs.readFile(SETTINGS_FILE, "utf-8").catch(() => {
      console.log("Settings file not found, using defaults.");
      return JSON.stringify(DEFAULT_SETTINGS);
    });

    const settings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };

    // Don't try to update Docker connection during build time
    if (process.env.NODE_ENV !== "build") {
      await saveSettings(settings, false); // Don't update connections during initialization
    }

    return settings;
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
