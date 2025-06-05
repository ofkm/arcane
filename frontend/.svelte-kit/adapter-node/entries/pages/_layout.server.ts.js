import { v as version } from "../../chunks/environment.js";
import { d as private_env } from "../../chunks/shared-server.js";
import { l as listAgents } from "../../chunks/agent-manager.js";
import { t as testDockerConnection } from "../../chunks/core.js";
class AppConfigService {
  /**
   * Fetches version information from GitHub or a configured API
   */
  async getVersionInformation() {
    try {
      const apiUrl = "https://api.github.com/repos/ofkm/arcane/releases/latest";
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch version info: ${response.status}`);
      }
      const data = await response.json();
      const newestVersion = data.tag_name.replace(/^v/, "");
      const currentVersionClean = version.replace(/^v/, "");
      const updateAvailable = this.isNewerVersion(newestVersion, currentVersionClean);
      return {
        currentVersion: version,
        newestVersion,
        updateAvailable,
        releaseUrl: data.html_url,
        releaseNotes: data.body
      };
    } catch (error) {
      console.error("Error fetching version information:", error);
      return { currentVersion: version };
    }
  }
  /**
   * Compare versions to determine if an update is available
   * Simple version comparison, assumes semantic versioning (x.y.z)
   */
  isNewerVersion(latest, current) {
    if (!latest || !current) return false;
    const latestParts = latest.split(".").map(Number);
    const currentParts = current.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((latestParts[i] || 0) > (currentParts[i] || 0)) return true;
      if ((latestParts[i] || 0) < (currentParts[i] || 0)) return false;
    }
    return false;
  }
}
let versionInformation;
let versionInformationLastUpdated;
const load = async (locals) => {
  const updateCheckDisabled = private_env.UPDATE_CHECK_DISABLED === "true";
  const csrf = crypto.randomUUID();
  if (updateCheckDisabled) {
    return {
      versionInformation: {
        currentVersion: version
      },
      user: locals.locals.user || null
    };
  }
  const agents = await listAgents();
  const now = /* @__PURE__ */ new Date();
  const timeout = 5 * 60 * 1e3;
  const agentsWithStatus = agents.map((agent) => {
    const lastSeen = new Date(agent.lastSeen);
    const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
    return {
      ...agent,
      status: timeSinceLastSeen > timeout ? "offline" : agent.status
    };
  });
  let hasLocalDocker = false;
  try {
    hasLocalDocker = await testDockerConnection();
  } catch (error) {
    console.log("Local Docker not available:", error);
    hasLocalDocker = false;
  }
  const appConfigService = new AppConfigService();
  const cacheExpired = versionInformationLastUpdated && Date.now() - versionInformationLastUpdated > 1e3 * 60 * 60 * 3;
  if (!versionInformation || cacheExpired) {
    try {
      versionInformation = await appConfigService.getVersionInformation();
      versionInformationLastUpdated = Date.now();
    } catch (error) {
      console.error("Error fetching version information:", error);
      versionInformation = { currentVersion: version };
    }
  }
  return {
    versionInformation,
    user: locals.locals.user || null,
    csrf,
    agents: agentsWithStatus,
    hasLocalDocker
  };
};
export {
  load
};
