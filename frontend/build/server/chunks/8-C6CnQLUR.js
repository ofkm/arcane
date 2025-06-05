import { loadComposeStacks, discoverExternalStacks } from './stack-custom-service-5Y1e9SF0.js';
import { l as listAgents } from './agent-manager-CcYAjDZW.js';
import { g as getAllAgentStacks } from './agent-stack-service-fp3gmye9.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import 'node:fs';
import 'node:path';
import 'dockerode';
import 'js-yaml';
import 'slugify';
import './core-C8NMHkc_.js';
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
import './compose-db-service-CB23kKq4.js';
import './compose.utils-Dy0jCFPf.js';
import './compose-validate.utils-NVGE7GWN.js';
import 'nanoid';
import 'fs/promises';

const load = async ({ fetch }) => {
  const [managedResult, externalResult, agentsResult] = await Promise.all([tryCatch(loadComposeStacks()), tryCatch(discoverExternalStacks()), tryCatch(listAgents())]);
  if (managedResult.error || externalResult.error) {
    console.error("Failed to load stacks:", managedResult.error || externalResult.error);
    const errorMessage = (managedResult.error?.message || externalResult.error?.message) ?? "Unknown error";
    return {
      stacks: [],
      error: "Failed to load Docker Compose stacks: " + errorMessage
    };
  }
  const managedStacks = managedResult.data;
  const externalStacks = externalResult.data;
  const agents = agentsResult.data || [];
  const onlineAgents = agents.filter((agent) => {
    const now = /* @__PURE__ */ new Date();
    const lastSeen = new Date(agent.lastSeen);
    const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
    const timeout = 5 * 60 * 1e3;
    return timeSinceLastSeen <= timeout && agent.status === "online";
  });
  const agentStacksResult = await tryCatch(getAllAgentStacks(onlineAgents, { fetch }));
  const agentStacks = agentStacksResult.data || [];
  const agentStackNames = new Set(agentStacks.map((stack) => stack.name));
  const combinedStacks = [...managedStacks];
  for (const externalStack of externalStacks) {
    const isDuplicate = combinedStacks.some((stack) => stack.id === externalStack.id) || agentStackNames.has(externalStack.name);
    if (!isDuplicate) {
      combinedStacks.push(externalStack);
    }
  }
  for (const agentStack of agentStacks) {
    const uniqueId = `agent:${agentStack.agentId}:${agentStack.name || agentStack.id}`;
    if (!combinedStacks.some((stack) => stack.id === uniqueId || stack.name === agentStack.name && stack.agentId === agentStack.agentId)) {
      combinedStacks.push({
        ...agentStack,
        id: uniqueId,
        // Ensure unique ID
        status: agentStack.status || "unknown"
        // Ensure status is always defined
      });
    }
  }
  return {
    stacks: combinedStacks,
    agents: onlineAgents,
    agentError: agentStacksResult.error ? `Failed to fetch agent stacks: ${agentStacksResult.error.message}` : null
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 8;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BFEvIiOf.js')).default;
const server_id = "src/routes/compose/+page.server.ts";
const imports = ["_app/immutable/nodes/8.lnVsxuh8.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/D2ZQhq98.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/BVjinSze.js","_app/immutable/chunks/iOXoOfm2.js","_app/immutable/chunks/CnMg5bH0.js","_app/immutable/chunks/CCfxTW1_.js","_app/immutable/chunks/C73rBIzk.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/BQr-K8qI.js","_app/immutable/chunks/DivMWeKY.js","_app/immutable/chunks/DLenizsP.js","_app/immutable/chunks/B2ByiyBM.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/DmpUnYw5.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/CjSQePMv.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/BUdkjQ9d.js","_app/immutable/chunks/CNwxKbLf.js","_app/immutable/chunks/BN5XhaSV.js","_app/immutable/chunks/CM2Qy78Q.js","_app/immutable/chunks/RONkA9YH.js","_app/immutable/chunks/m9ItHG6J.js","_app/immutable/chunks/iMjrFJrG.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/mAxAJ61f.js","_app/immutable/chunks/DVaDWjV4.js","_app/immutable/chunks/CXuQMvfN.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/TMHAhBh7.js","_app/immutable/chunks/CThrnvRT.js","_app/immutable/chunks/DJtaXGK5.js","_app/immutable/chunks/DhMUiTRD.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/CJVn1vXg.js","_app/immutable/chunks/CWU1czEL.js","_app/immutable/chunks/BhZTThSR.js","_app/immutable/chunks/Co9IQC3A.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/BXZ-8GCb.js","_app/immutable/chunks/C5X3i-BG.js","_app/immutable/chunks/0Kkvs01K.js","_app/immutable/chunks/CX4OS9M0.js","_app/immutable/chunks/CuZ1HGtB.js","_app/immutable/chunks/BCsdK-MS.js","_app/immutable/chunks/CdIEgevt.js","_app/immutable/chunks/GFFG_c1M.js"];
const stylesheets = ["_app/immutable/assets/index.CV-KWLNP.css","_app/immutable/assets/Toaster.D7TgzYVC.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=8-C6CnQLUR.js.map
