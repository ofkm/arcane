import { getStack } from './stack-custom-service-5Y1e9SF0.js';
import { g as getSettings } from './settings-service-B1w8bfJq.js';
import { g as getContainer } from './container-service-m5_StWPI.js';
import { l as listAgents } from './agent-manager-CcYAjDZW.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import 'node:fs';
import 'node:path';
import 'dockerode';
import 'js-yaml';
import 'slugify';
import './core-C8NMHkc_.js';
import './compose-db-service-CB23kKq4.js';
import 'drizzle-orm';
import './schema-CDkq0ub_.js';
import 'node:fs/promises';
import 'drizzle-orm/sqlite-core';
import './index4-SoK3Vczo.js';
import './compose.utils-Dy0jCFPf.js';
import './compose-validate.utils-NVGE7GWN.js';
import 'proper-lockfile';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:util';
import './settings-db-service-DyTlfQVT.js';
import './errors-BtZyvX-k.js';
import 'nanoid';
import 'fs/promises';

const load = async ({ params }) => {
  const { composeId } = params;
  const stackResult = await tryCatch(getStack(composeId));
  if (stackResult.error || !stackResult.data) {
    console.error(`Error loading stack ${composeId}:`, stackResult.error);
    const errorMessage = stackResult.error?.message ?? "Stack not found or failed to load";
    return {
      stack: null,
      error: `Stack not found or failed to load: ${errorMessage}`,
      editorState: {
        name: "",
        composeContent: "",
        envContent: "",
        originalName: "",
        originalComposeContent: "",
        originalEnvContent: "",
        autoUpdate: false
      },
      isAgentStack: false
    };
  }
  const stack = stackResult.data;
  const editorState = {
    name: stack.name,
    composeContent: stack.composeContent || "",
    envContent: stack.envContent || "",
    originalName: stack.name,
    originalComposeContent: stack.composeContent || "",
    originalEnvContent: stack.envContent || "",
    autoUpdate: false
    // Will be loaded from database if available
  };
  const settingsResult = await tryCatch(getSettings());
  const settings = settingsResult.data;
  const servicePorts = {};
  if (stack.services) {
    for (const service of stack.services) {
      if (service.id) {
        const containerResult = await tryCatch(getContainer(service.id));
        const containerData = containerResult.data;
        if (!containerResult.error && containerData && containerData.NetworkSettings?.Ports) {
          const portBindings = containerData.NetworkSettings.Ports;
          const parsedPorts = [];
          for (const containerPort in portBindings) {
            if (Object.prototype.hasOwnProperty.call(portBindings, containerPort)) {
              const bindings = portBindings[containerPort];
              if (bindings && Array.isArray(bindings) && bindings.length > 0) {
                bindings.forEach((binding) => {
                  if (binding.HostPort) {
                    const portType = containerPort.split("/")[1] || "tcp";
                    parsedPorts.push(`${binding.HostPort}:${containerPort.split("/")[0]}/${portType}`);
                  }
                });
              }
            }
          }
          servicePorts[service.id] = parsedPorts;
        } else if (containerResult.error) {
          console.error(`Failed to fetch ports for service ${service.id}:`, containerResult.error);
        }
      }
    }
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
  return {
    stack,
    servicePorts,
    editorState,
    settings,
    agents: agentsWithStatus,
    isAgentStack: false
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 9;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-5NHsZ7lV.js')).default;
const server_id = "src/routes/compose/[composeId]/+page.server.ts";
const imports = ["_app/immutable/nodes/9.BgXR2OIR.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/m9ItHG6J.js","_app/immutable/chunks/iMjrFJrG.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/DUYgD2_s.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/vd7J2FIp.js","_app/immutable/chunks/BUdkjQ9d.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/C2kjEBku.js","_app/immutable/chunks/CThrnvRT.js","_app/immutable/chunks/TMHAhBh7.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/DJtaXGK5.js","_app/immutable/chunks/DhMUiTRD.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/CJVn1vXg.js","_app/immutable/chunks/CWU1czEL.js","_app/immutable/chunks/BhZTThSR.js","_app/immutable/chunks/Co9IQC3A.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/Bt-Xh7oU.js","_app/immutable/chunks/mAxAJ61f.js","_app/immutable/chunks/CXuQMvfN.js","_app/immutable/chunks/DVaDWjV4.js","_app/immutable/chunks/BZp3mCew.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/UVnX9grY.js","_app/immutable/chunks/DLenizsP.js","_app/immutable/chunks/BVjinSze.js","_app/immutable/chunks/CnMg5bH0.js","_app/immutable/chunks/C73rBIzk.js","_app/immutable/chunks/BQr-K8qI.js","_app/immutable/chunks/DivMWeKY.js","_app/immutable/chunks/B2ByiyBM.js","_app/immutable/chunks/DmpUnYw5.js","_app/immutable/chunks/BNz4MoZq.js","_app/immutable/chunks/xg94FB6W.js","_app/immutable/chunks/-0Ble-HS.js","_app/immutable/chunks/C5X3i-BG.js","_app/immutable/chunks/0Kkvs01K.js","_app/immutable/chunks/CHbZ4NRu.js","_app/immutable/chunks/CWPqODAu.js","_app/immutable/chunks/66aVjmWj.js","_app/immutable/chunks/BZMdbj5w.js","_app/immutable/chunks/B877H2_W.js","_app/immutable/chunks/CX4OS9M0.js","_app/immutable/chunks/GAc1BGJd.js"];
const stylesheets = ["_app/immutable/assets/Toaster.D7TgzYVC.css","_app/immutable/assets/LogViewer.DaKR7mnA.css","_app/immutable/assets/env-editor.DgRsnJS3.css","_app/immutable/assets/index.CV-KWLNP.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=9-CO7Ea1dj.js.map
