import "proper-lockfile";
import "./encryption-service.js";
import { S as STACKS_DIR, e as ensureDirectory } from "./schema.js";
import { getSettingsFromDb, saveSettingsToDb } from "./settings-db-service.js";
let env;
try {
  env = await import("./private.js");
} catch (e) {
  env = process.env;
}
const isDev = process.env.NODE_ENV === "development";
const DEFAULT_SETTINGS = {
  dockerHost: isDev ? process.platform === "win32" ? "npipe:////./pipe/docker_engine" : "unix:///var/run/docker.sock" : "unix:///var/run/docker.sock",
  autoUpdate: false,
  autoUpdateInterval: 5,
  pollingEnabled: true,
  pollingInterval: 10,
  pruneMode: "all",
  stacksDirectory: STACKS_DIR,
  registryCredentials: [],
  templateRegistries: [],
  auth: {
    localAuthEnabled: true,
    oidcEnabled: false,
    sessionTimeout: 60,
    passwordPolicy: "strong",
    rbacEnabled: false
  },
  maturityThresholdDays: 30
};
async function ensureStacksDirectory() {
  try {
    const settings = await getSettings();
    const stacksDir = settings.stacksDirectory;
    await ensureDirectory(stacksDir);
    return stacksDir;
  } catch (err) {
    console.error("Error ensuring stacks directory:", err);
    try {
      await ensureDirectory(STACKS_DIR);
      return STACKS_DIR;
    } catch (innerErr) {
      console.error("Failed to create default stacks directory:", innerErr);
      throw new Error("Unable to create stacks directory");
    }
  }
}
async function getSettings() {
  try {
    const dbSettings = await getSettingsFromDb();
    let effectiveSettings;
    if (dbSettings) {
      effectiveSettings = dbSettings;
    } else {
      console.log("No settings found in database, using default settings");
      effectiveSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
    const oidcClientId = env.OIDC_CLIENT_ID;
    const oidcClientSecret = env.OIDC_CLIENT_SECRET;
    const oidcRedirectUri = env.OIDC_REDIRECT_URI;
    const oidcAuthorizationEndpoint = env.OIDC_AUTHORIZATION_ENDPOINT;
    const oidcTokenEndpoint = env.OIDC_TOKEN_ENDPOINT;
    const oidcUserinfoEndpoint = env.OIDC_USERINFO_ENDPOINT;
    const oidcScopesEnv = env.OIDC_SCOPES;
    if (oidcClientId && oidcClientSecret && oidcRedirectUri && oidcAuthorizationEndpoint && oidcTokenEndpoint && oidcUserinfoEndpoint) {
      if (!effectiveSettings.auth) {
        effectiveSettings.auth = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.auth));
      }
      const oidcConfigFromEnv = {
        clientId: oidcClientId,
        clientSecret: oidcClientSecret,
        redirectUri: oidcRedirectUri,
        authorizationEndpoint: oidcAuthorizationEndpoint,
        tokenEndpoint: oidcTokenEndpoint,
        userinfoEndpoint: oidcUserinfoEndpoint,
        scopes: oidcScopesEnv || effectiveSettings.auth.oidc?.scopes || DEFAULT_SETTINGS.auth.oidc?.scopes || "openid email profile"
      };
      effectiveSettings.auth.oidc = oidcConfigFromEnv;
    }
    return effectiveSettings;
  } catch (error) {
    console.error("Error getting settings from database, falling back to defaults:", error);
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}
async function saveSettings(settings) {
  try {
    await saveSettingsToDb(settings);
    console.log("Settings saved to database successfully");
  } catch (error) {
    console.error("Error saving settings to database:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save settings: ${errorMessage}`);
  }
}
export {
  ensureStacksDirectory as e,
  getSettings as g,
  saveSettings as s
};
