import { g as getAgent, a as getAgentTasks, b as getDeploymentsFromDb } from './agent-manager-CcYAjDZW.js';
import { e as error } from './index-Ddp2AB5f.js';
import 'nanoid';
import 'fs/promises';
import 'node:path';
import './schema-CDkq0ub_.js';
import 'node:fs/promises';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './index4-SoK3Vczo.js';

const load = async ({ params }) => {
  const { agentId } = params;
  try {
    const [agent, tasks, deployments] = await Promise.allSettled([getAgent(agentId), getAgentTasks(agentId), getDeploymentsFromDb(agentId)]);
    if (agent.status === "rejected" || !agent.value) {
      throw error(404, {
        message: "Agent not found"
      });
    }
    const now = /* @__PURE__ */ new Date();
    const timeout = 5 * 60 * 1e3;
    const lastSeen = new Date(agent.value.lastSeen);
    const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
    const agentWithStatus = {
      ...agent.value,
      status: timeSinceLastSeen > timeout ? "offline" : agent.value.status
    };
    return {
      agent: agentWithStatus,
      tasks: tasks.status === "fulfilled" ? tasks.value : [],
      deployments: deployments.status === "fulfilled" ? deployments.value : [],
      agentId
    };
  } catch (err) {
    console.error("SSR: Failed to load agent data:", err);
    throw error(500, {
      message: err instanceof Error ? err.message : "Failed to load agent data"
    });
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 5;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-B8eDj6Ku.js')).default;
const server_id = "src/routes/agents/[agentId]/+page.server.ts";
const imports = ["_app/immutable/nodes/5.Co__Mtr3.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/DDBOCpJi.js","_app/immutable/chunks/CCfxTW1_.js","_app/immutable/chunks/m9ItHG6J.js","_app/immutable/chunks/iMjrFJrG.js","_app/immutable/chunks/UVnX9grY.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/DLenizsP.js","_app/immutable/chunks/BVjinSze.js","_app/immutable/chunks/CnMg5bH0.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/C73rBIzk.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/BQr-K8qI.js","_app/immutable/chunks/DivMWeKY.js","_app/immutable/chunks/B2ByiyBM.js","_app/immutable/chunks/DmpUnYw5.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/CgyVJ7zG.js","_app/immutable/chunks/CM2Qy78Q.js","_app/immutable/chunks/iOXoOfm2.js","_app/immutable/chunks/CKC8MdI0.js","_app/immutable/chunks/B5ui7ZgY.js","_app/immutable/chunks/D2ZQhq98.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/CjSQePMv.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/DUYgD2_s.js","_app/immutable/chunks/mAxAJ61f.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/B2pR1KHz.js","_app/immutable/chunks/CJVn1vXg.js","_app/immutable/chunks/bJ_I8NpF.js","_app/immutable/chunks/DYFwiHrC.js","_app/immutable/chunks/BhZTThSR.js","_app/immutable/chunks/gYT1oUgQ.js","_app/immutable/chunks/BUdkjQ9d.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/-0Ble-HS.js","_app/immutable/chunks/BNz4MoZq.js","_app/immutable/chunks/B877H2_W.js","_app/immutable/chunks/CWU1czEL.js","_app/immutable/chunks/CX4OS9M0.js","_app/immutable/chunks/CWPqODAu.js","_app/immutable/chunks/DEdMGNll.js","_app/immutable/chunks/Cm35N4Au.js","_app/immutable/chunks/CHbZ4NRu.js","_app/immutable/chunks/Tgwv_1ap.js","_app/immutable/chunks/66aVjmWj.js","_app/immutable/chunks/BfFJ5vja.js","_app/immutable/chunks/B3rBFWl_.js","_app/immutable/chunks/DxrT6TVP.js","_app/immutable/chunks/B5Po4twO.js","_app/immutable/chunks/0Kkvs01K.js"];
const stylesheets = ["_app/immutable/assets/Toaster.D7TgzYVC.css","_app/immutable/assets/index.CV-KWLNP.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=5-DdjJJMkZ.js.map
