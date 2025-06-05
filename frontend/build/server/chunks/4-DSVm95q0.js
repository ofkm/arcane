import { l as listAgents } from './agent-manager-CcYAjDZW.js';
import { e as error } from './index-Ddp2AB5f.js';
import 'nanoid';
import 'fs/promises';
import 'node:path';
import './schema-CDkq0ub_.js';
import 'node:fs/promises';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './index4-SoK3Vczo.js';

const load = async ({ locals }) => {
  if (!locals.user?.roles.includes("admin")) {
    throw error(403, {
      message: "Unauthorized access"
    });
  }
  try {
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
      agents: agentsWithStatus
    };
  } catch (err) {
    console.error("SSR: Failed to load agents:", err);
    throw error(500, {
      message: err instanceof Error ? err.message : "Failed to load agents"
    });
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 4;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BD7BfXeO.js')).default;
const server_id = "src/routes/agents/+page.server.ts";
const imports = ["_app/immutable/nodes/4.By0VG2kx.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/gYT1oUgQ.js","_app/immutable/chunks/BUdkjQ9d.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/DJtaXGK5.js","_app/immutable/chunks/DhMUiTRD.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/CJVn1vXg.js","_app/immutable/chunks/CWU1czEL.js","_app/immutable/chunks/BhZTThSR.js","_app/immutable/chunks/Co9IQC3A.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/B877H2_W.js","_app/immutable/chunks/CX4OS9M0.js","_app/immutable/chunks/Cm35N4Au.js","_app/immutable/chunks/BfFJ5vja.js","_app/immutable/chunks/B3rBFWl_.js","_app/immutable/chunks/B-YH0pa3.js"];
const stylesheets = ["_app/immutable/assets/Toaster.D7TgzYVC.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=4-DSVm95q0.js.map
