import { w as writable, g as get } from "./index2.js";
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item));
  }
  const clonedObj = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}
const settingsStore = writable({
  dockerHost: "",
  stacksDirectory: "",
  autoUpdate: false,
  autoUpdateInterval: 60,
  pollingEnabled: false,
  pollingInterval: 10,
  pruneMode: "all",
  registryCredentials: [],
  templateRegistries: [],
  auth: {
    localAuthEnabled: true,
    oidcEnabled: false,
    sessionTimeout: 30,
    passwordPolicy: "strong",
    rbacEnabled: false
  },
  maturityThresholdDays: 30
});
function updateSettingsStore(serverData) {
  const dataToUpdate = deepClone(serverData);
  settingsStore.update((current) => {
    return {
      ...current,
      ...dataToUpdate,
      auth: {
        ...current.auth || {},
        ...dataToUpdate.auth || {}
      }
    };
  });
}
function getSettings() {
  return get(settingsStore);
}
async function saveSettingsToServer() {
  try {
    const settings = getSettings();
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(settings)
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw error;
  }
}
export {
  saveSettingsToServer as a,
  settingsStore as s,
  updateSettingsStore as u
};
