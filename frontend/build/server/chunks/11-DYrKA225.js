import { T as TemplateService } from './template-service-CSNZG-20.js';
import { d as defaultComposeTemplate } from './constants-BuoZlPL3.js';
import { l as listAgents } from './agent-manager-CcYAjDZW.js';
import 'node:fs';
import 'node:path';
import './template-registry-service-CoCZP6pF.js';
import './index5-HpJcNJHQ.js';
import './false-CRHihH2U.js';
import './settings-service-B1w8bfJq.js';
import 'proper-lockfile';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:fs/promises';
import 'node:util';
import './schema-CDkq0ub_.js';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './settings-db-service-DyTlfQVT.js';
import './index4-SoK3Vczo.js';
import 'nanoid';
import 'fs/promises';

const load = async () => {
  try {
    const templateService = new TemplateService();
    const [allTemplates, envTemplate] = await Promise.all([templateService.loadAllTemplates(), TemplateService.getEnvTemplate()]);
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
    return {
      composeTemplates: allTemplates,
      envTemplate,
      defaultTemplate: defaultComposeTemplate,
      agents: agentsWithStatus
    };
  } catch (error) {
    console.error("Error loading templates:", error);
    return {
      composeTemplates: [],
      envTemplate: defaultComposeTemplate,
      defaultTemplate: defaultComposeTemplate,
      agents: []
    };
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 11;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BdZhjSNG.js')).default;
const server_id = "src/routes/compose/new/+page.server.ts";
const imports = ["_app/immutable/nodes/11.JSBg-50H.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/B5ui7ZgY.js","_app/immutable/chunks/DDBOCpJi.js","_app/immutable/chunks/CCfxTW1_.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/DUYgD2_s.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/BZp3mCew.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/TMHAhBh7.js","_app/immutable/chunks/CThrnvRT.js","_app/immutable/chunks/B1ASiaS-.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/DeVrQjJ6.js","_app/immutable/chunks/DJtaXGK5.js","_app/immutable/chunks/DhMUiTRD.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/CJVn1vXg.js","_app/immutable/chunks/CWU1czEL.js","_app/immutable/chunks/BhZTThSR.js","_app/immutable/chunks/Co9IQC3A.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/B2pR1KHz.js","_app/immutable/chunks/CKC8MdI0.js","_app/immutable/chunks/DivMWeKY.js","_app/immutable/chunks/DrSgZYhw.js","_app/immutable/chunks/iOXoOfm2.js","_app/immutable/chunks/BVjinSze.js","_app/immutable/chunks/UVnX9grY.js","_app/immutable/chunks/DLenizsP.js","_app/immutable/chunks/CnMg5bH0.js","_app/immutable/chunks/DTWxSKed.js","_app/immutable/chunks/m9ItHG6J.js","_app/immutable/chunks/BNz4MoZq.js","_app/immutable/chunks/kDqmmi48.js","_app/immutable/chunks/CHbZ4NRu.js","_app/immutable/chunks/BjVJhjER.js","_app/immutable/chunks/BN5XhaSV.js","_app/immutable/chunks/B2ByiyBM.js","_app/immutable/chunks/CM2Qy78Q.js","_app/immutable/chunks/RONkA9YH.js","_app/immutable/chunks/CWPqODAu.js","_app/immutable/chunks/C5X3i-BG.js","_app/immutable/chunks/-0Ble-HS.js","_app/immutable/chunks/CU5Yr9hi.js","_app/immutable/chunks/BCsdK-MS.js","_app/immutable/chunks/xg94FB6W.js","_app/immutable/chunks/GFFG_c1M.js"];
const stylesheets = ["_app/immutable/assets/Toaster.D7TgzYVC.css","_app/immutable/assets/env-editor.DgRsnJS3.css","_app/immutable/assets/11.DXuoz1oi.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=11-DYrKA225.js.map
