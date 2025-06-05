import { d as private_env } from './shared-server-DIsQ43MR.js';
import { l as listAgents } from './agent-manager-CcYAjDZW.js';
import { t as testDockerConnection } from './core-C8NMHkc_.js';
import 'nanoid';
import 'fs/promises';
import 'node:path';
import './schema-CDkq0ub_.js';
import 'node:fs/promises';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './index4-SoK3Vczo.js';
import 'dockerode';
import './settings-service-B1w8bfJq.js';
import 'proper-lockfile';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:util';
import './settings-db-service-DyTlfQVT.js';

const version = "0.15.0";

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

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 0;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-DxzXGmC7.js')).default;
const server_id = "src/routes/+layout.server.ts";
const imports = ["_app/immutable/nodes/0.D1JUauaA.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/DrSgZYhw.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/iHW4LnF_.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/UVnX9grY.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/DLenizsP.js","_app/immutable/chunks/BVjinSze.js","_app/immutable/chunks/CnMg5bH0.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/BUdkjQ9d.js","_app/immutable/chunks/DUYgD2_s.js","_app/immutable/chunks/CjSQePMv.js","_app/immutable/chunks/iOXoOfm2.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/DmpUnYw5.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/BHXAfpfV.js","_app/immutable/chunks/CL-Amk4I.js","_app/immutable/chunks/B2ByiyBM.js","_app/immutable/chunks/BQr-K8qI.js","_app/immutable/chunks/RONkA9YH.js","_app/immutable/chunks/CCfxTW1_.js","_app/immutable/chunks/CNwxKbLf.js","_app/immutable/chunks/BN5XhaSV.js","_app/immutable/chunks/CM2Qy78Q.js","_app/immutable/chunks/DLcUb980.js","_app/immutable/chunks/CdIEgevt.js","_app/immutable/chunks/GFFG_c1M.js","_app/immutable/chunks/n3W22Cu1.js","_app/immutable/chunks/GAc1BGJd.js","_app/immutable/chunks/BfFJ5vja.js","_app/immutable/chunks/C5X3i-BG.js","_app/immutable/chunks/DxrT6TVP.js","_app/immutable/chunks/B3rBFWl_.js","_app/immutable/chunks/DhMUiTRD.js","_app/immutable/chunks/CHbZ4NRu.js","_app/immutable/chunks/B5Po4twO.js","_app/immutable/chunks/CVwLPvhk.js","_app/immutable/chunks/BHsVyg00.js"];
const stylesheets = ["_app/immutable/assets/Toaster.D7TgzYVC.css","_app/immutable/assets/app.Brlz9FPy.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=0-CQHMxvMi.js.map
