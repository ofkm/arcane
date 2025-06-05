import { e as error } from './index-Ddp2AB5f.js';
import { g as getAgent } from './agent-manager-CcYAjDZW.js';
import { a as getStacksFromAgent } from './agent-stack-service-fp3gmye9.js';
import 'nanoid';
import 'fs/promises';
import 'node:path';
import './schema-CDkq0ub_.js';
import 'node:fs/promises';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './index4-SoK3Vczo.js';

const load = async ({ params, fetch }) => {
  const { agentId, composeName } = params;
  try {
    const agent = await getAgent(agentId);
    if (!agent) {
      throw error(404, "Agent not found");
    }
    if (agent.status !== "online") {
      throw error(400, `Agent is not online (status: ${agent.status})`);
    }
    const stacks = await getStacksFromAgent(agent, { fetch });
    const stack = stacks.find((s) => s.name === composeName);
    if (!stack) {
      throw error(404, "Stack not found on agent");
    }
    return {
      agent,
      stack,
      composeName
    };
  } catch (err) {
    console.error("Error loading agent stack:", err);
    throw error(500, "Failed to load agent stack");
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 10;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BheB2Dtz.js')).default;
const server_id = "src/routes/compose/agent/[agentId]/[composeName]/+page.server.ts";
const imports = ["_app/immutable/nodes/10.UgrFaHzy.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/DUYgD2_s.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/mAxAJ61f.js","_app/immutable/chunks/CXuQMvfN.js","_app/immutable/chunks/DVaDWjV4.js","_app/immutable/chunks/BZp3mCew.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/DJtaXGK5.js","_app/immutable/chunks/DhMUiTRD.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/CJVn1vXg.js","_app/immutable/chunks/CWU1czEL.js","_app/immutable/chunks/BhZTThSR.js","_app/immutable/chunks/Co9IQC3A.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/-0Ble-HS.js","_app/immutable/chunks/C5X3i-BG.js","_app/immutable/chunks/0Kkvs01K.js","_app/immutable/chunks/CHbZ4NRu.js","_app/immutable/chunks/66aVjmWj.js","_app/immutable/chunks/BrT7AbVn.js"];
const stylesheets = ["_app/immutable/assets/Toaster.D7TgzYVC.css","_app/immutable/assets/env-editor.DgRsnJS3.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=10-B9uhjSKJ.js.map
