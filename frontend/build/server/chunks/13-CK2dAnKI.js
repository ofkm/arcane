import { g as getContainer, a as getContainerLogs, b as getContainerStats } from './container-service-m5_StWPI.js';
import { e as error } from './index-Ddp2AB5f.js';
import './core-C8NMHkc_.js';
import 'dockerode';
import './settings-service-B1w8bfJq.js';
import 'proper-lockfile';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:fs/promises';
import 'node:path';
import 'node:util';
import './schema-CDkq0ub_.js';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './settings-db-service-DyTlfQVT.js';
import './index4-SoK3Vczo.js';
import './errors-BtZyvX-k.js';

const load = async ({ params }) => {
  const containerId = params.id;
  try {
    const [container, logs, stats] = await Promise.all([
      getContainer(containerId),
      getContainerLogs(containerId, { tail: 100 }).catch((err) => {
        console.error(`Failed to retrieve logs for ${containerId}:`, err);
        return "Failed to load logs. Container might not be running or logs are unavailable.";
      }),
      getContainerStats(containerId).catch((err) => {
        console.error(`Failed to retrieve stats for ${containerId}:`, err);
        return null;
      })
    ]);
    if (!container) {
      error(404, {
        message: `Container with ID "${containerId}" not found.`
      });
    }
    return {
      container,
      logs,
      stats
    };
  } catch (err) {
    console.error(`Failed to load container ${containerId}:`, err);
    if (err.name === "NotFoundError") {
      error(404, { message: err.message });
    } else {
      error(500, {
        message: err.message || `Failed to load container details for "${containerId}".`
      });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 13;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-D5e0X8Hb.js')).default;
const server_id = "src/routes/containers/[id]/+page.server.ts";
const imports = ["_app/immutable/nodes/13.BxJ0jDqA.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/DTWxSKed.js","_app/immutable/chunks/vd7J2FIp.js","_app/immutable/chunks/BUdkjQ9d.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/C2kjEBku.js","_app/immutable/chunks/CThrnvRT.js","_app/immutable/chunks/TMHAhBh7.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/DJtaXGK5.js","_app/immutable/chunks/DhMUiTRD.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/CJVn1vXg.js","_app/immutable/chunks/CWU1czEL.js","_app/immutable/chunks/BhZTThSR.js","_app/immutable/chunks/Co9IQC3A.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/Bt-Xh7oU.js","_app/immutable/chunks/DVaDWjV4.js","_app/immutable/chunks/BR-g04mS.js","_app/immutable/chunks/mAxAJ61f.js","_app/immutable/chunks/Bh_rBs7G.js","_app/immutable/chunks/CnMg5bH0.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/-0Ble-HS.js","_app/immutable/chunks/B877H2_W.js","_app/immutable/chunks/B3rBFWl_.js","_app/immutable/chunks/66aVjmWj.js","_app/immutable/chunks/CHbZ4NRu.js","_app/immutable/chunks/DxrT6TVP.js","_app/immutable/chunks/B5Po4twO.js","_app/immutable/chunks/Tgwv_1ap.js","_app/immutable/chunks/CWPqODAu.js","_app/immutable/chunks/CX4OS9M0.js"];
const stylesheets = ["_app/immutable/assets/Toaster.D7TgzYVC.css","_app/immutable/assets/LogViewer.DaKR7mnA.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=13-CK2dAnKI.js.map
