import { eq } from 'drizzle-orm';
import { s as settingsTable, a as SETTINGS_DIR } from './schema-CDkq0ub_.js';
import fs from 'node:fs/promises';
import path__default from 'node:path';
import { d as decrypt } from './encryption-service-C1I869gF.js';
import { d as db } from './index4-SoK3Vczo.js';
import 'drizzle-orm/sqlite-core';
import 'node:crypto';
import 'node:util';

async function getSettingsFromFile() {
  try {
    const settingsFilePath = path__default.join(SETTINGS_DIR, "settings.dat");
    console.log(`Attempting to read settings from: ${settingsFilePath}`);
    const fileExists = await fs.access(settingsFilePath).then(() => true).catch(() => false);
    console.log(`Settings file exists: ${fileExists}`);
    if (!fileExists) {
      console.log("No settings file found for migration");
      return null;
    }
    const fileContent = await fs.readFile(settingsFilePath, "utf8");
    console.log(`Read settings file, length: ${fileContent.length}`);
    const settingsData = JSON.parse(fileContent);
    console.log(`Parsed settings data, keys: ${Object.keys(settingsData).join(", ")}`);
    let decryptedData = {};
    if (settingsData._encrypted) {
      console.log("Decrypting sensitive settings data...");
      decryptedData = await decrypt(settingsData._encrypted);
      console.log(`Decrypted data keys: ${Object.keys(decryptedData).join(", ")}`);
    }
    const { _encrypted, ...nonSensitiveData } = settingsData;
    const completeSettings = {
      ...nonSensitiveData,
      ...decryptedData
    };
    console.log(`Complete settings keys: ${Object.keys(completeSettings).join(", ")}`);
    console.log(`OIDC settings found: ${completeSettings.auth?.oidc ? "yes" : "no"}`);
    return completeSettings;
  } catch (error) {
    console.error("Error reading settings from file:", error);
    return null;
  }
}
async function migrateSettingsToDatabase(backupOldFile = true) {
  try {
    console.log("Starting settings migration from file to database...");
    const fileSettings = await getSettingsFromFile();
    if (!fileSettings) {
      console.log("No settings found in file system. Migration completed.");
      return true;
    }
    console.log("Retrieved settings from file system");
    console.log(`OIDC enabled: ${fileSettings.auth?.oidcEnabled}`);
    console.log(`OIDC client ID: ${fileSettings.auth?.oidc?.clientId ? "present" : "missing"}`);
    const existingSettings = await db.select().from(settingsTable).limit(1);
    if (existingSettings.length > 0) {
      console.log("Settings already exist in database. Migration aborted.");
      return false;
    }
    await db.insert(settingsTable).values({
      dockerHost: fileSettings.dockerHost,
      stacksDirectory: fileSettings.stacksDirectory,
      autoUpdate: fileSettings.autoUpdate,
      autoUpdateInterval: fileSettings.autoUpdateInterval,
      pollingEnabled: fileSettings.pollingEnabled,
      pollingInterval: fileSettings.pollingInterval,
      pruneMode: fileSettings.pruneMode,
      registryCredentials: JSON.stringify(fileSettings.registryCredentials || []),
      templateRegistries: JSON.stringify(fileSettings.templateRegistries || []),
      auth: JSON.stringify(fileSettings.auth),
      onboarding: fileSettings.onboarding ? JSON.stringify(fileSettings.onboarding) : null,
      baseServerUrl: fileSettings.baseServerUrl,
      maturityThresholdDays: fileSettings.maturityThresholdDays
    });
    console.log("Settings successfully migrated to database");
    console.log(`OIDC settings migrated: ${fileSettings.auth?.oidcEnabled ? "enabled" : "disabled"}`);
    if (backupOldFile) {
      const settingsFilePath = path__default.join(SETTINGS_DIR, "settings.dat");
      const backupPath = path__default.join(SETTINGS_DIR, `settings.dat.backup.${Date.now()}`);
      try {
        await fs.access(settingsFilePath);
        await fs.copyFile(settingsFilePath, backupPath);
        console.log(`Settings file backed up to: ${backupPath}`);
      } catch (error) {
        console.warn("Could not backup settings file:", error);
      }
    }
    return true;
  } catch (error) {
    console.error("Failed to migrate settings to database:", error);
    throw error;
  }
}
async function getSettingsFromDb() {
  try {
    const result = await db.select().from(settingsTable).limit(1);
    if (result.length === 0) {
      return null;
    }
    const dbSettings = result[0];
    return {
      dockerHost: dbSettings.dockerHost,
      stacksDirectory: dbSettings.stacksDirectory,
      autoUpdate: dbSettings.autoUpdate,
      autoUpdateInterval: dbSettings.autoUpdateInterval,
      pollingEnabled: dbSettings.pollingEnabled,
      pollingInterval: dbSettings.pollingInterval,
      pruneMode: dbSettings.pruneMode,
      registryCredentials: JSON.parse(dbSettings.registryCredentials),
      templateRegistries: JSON.parse(dbSettings.templateRegistries),
      auth: JSON.parse(dbSettings.auth),
      onboarding: dbSettings.onboarding ? JSON.parse(dbSettings.onboarding) : void 0,
      baseServerUrl: dbSettings.baseServerUrl || void 0,
      maturityThresholdDays: dbSettings.maturityThresholdDays
    };
  } catch (error) {
    console.error("Failed to get settings from database:", error);
    throw error;
  }
}
async function saveSettingsToDb(settings) {
  try {
    const existing = await db.select().from(settingsTable).limit(1);
    const settingsData = {
      dockerHost: settings.dockerHost,
      stacksDirectory: settings.stacksDirectory,
      autoUpdate: settings.autoUpdate,
      autoUpdateInterval: settings.autoUpdateInterval,
      pollingEnabled: settings.pollingEnabled,
      pollingInterval: settings.pollingInterval,
      pruneMode: settings.pruneMode,
      registryCredentials: JSON.stringify(settings.registryCredentials || []),
      templateRegistries: JSON.stringify(settings.templateRegistries || []),
      auth: JSON.stringify(settings.auth),
      onboarding: settings.onboarding ? JSON.stringify(settings.onboarding) : null,
      baseServerUrl: settings.baseServerUrl,
      maturityThresholdDays: settings.maturityThresholdDays,
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (existing.length > 0) {
      await db.update(settingsTable).set(settingsData).where(eq(settingsTable.id, existing[0].id));
    } else {
      await db.insert(settingsTable).values(settingsData);
    }
  } catch (error) {
    console.error("Failed to save settings to database:", error);
    throw error;
  }
}

export { getSettingsFromDb, migrateSettingsToDatabase, saveSettingsToDb };
//# sourceMappingURL=settings-db-service-DyTlfQVT.js.map
