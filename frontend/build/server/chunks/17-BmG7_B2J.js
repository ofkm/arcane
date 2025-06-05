import { g as getNetwork } from './network-service-FOR9TyaI.js';
import { e as error } from './index-Ddp2AB5f.js';
import { N as NotFoundError } from './errors-BtZyvX-k.js';
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
import './constants-BuoZlPL3.js';

const load = async ({ params }) => {
  const networkId = params.networkId;
  try {
    const network = await getNetwork(networkId);
    return {
      network
    };
  } catch (err) {
    console.error(`Failed to load network ${networkId}:`, err);
    if (err instanceof NotFoundError) {
      error(404, { message: err.message });
    } else {
      const statusCode = err && typeof err === "object" && "status" in err ? err.status : 500;
      error(statusCode, {
        message: err instanceof Error ? err.message : `Failed to load network details for "${networkId}".`
      });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 17;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-15OoC6eN.js')).default;
const server_id = "src/routes/networks/[networkId]/+page.server.ts";
const imports = ["_app/immutable/nodes/17.DXzMN_3l.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/B5ui7ZgY.js","_app/immutable/chunks/DDBOCpJi.js","_app/immutable/chunks/CCfxTW1_.js","_app/immutable/chunks/m9ItHG6J.js","_app/immutable/chunks/iMjrFJrG.js","_app/immutable/chunks/mAxAJ61f.js","_app/immutable/chunks/DVaDWjV4.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/BUdkjQ9d.js","_app/immutable/chunks/DJtaXGK5.js","_app/immutable/chunks/DhMUiTRD.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/CJVn1vXg.js","_app/immutable/chunks/CWU1czEL.js","_app/immutable/chunks/BhZTThSR.js","_app/immutable/chunks/Co9IQC3A.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/b9-iWvG8.js","_app/immutable/chunks/CThrnvRT.js","_app/immutable/chunks/CX4OS9M0.js","_app/immutable/chunks/DxrT6TVP.js","_app/immutable/chunks/CE-plJDc.js","_app/immutable/chunks/B3rBFWl_.js","_app/immutable/chunks/BjVJhjER.js","_app/immutable/chunks/Tgwv_1ap.js","_app/immutable/chunks/0Kkvs01K.js","_app/immutable/chunks/CHbZ4NRu.js","_app/immutable/chunks/BfFJ5vja.js","_app/immutable/chunks/Bs79U31N.js"];
const stylesheets = ["_app/immutable/assets/Toaster.D7TgzYVC.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=17-BmG7_B2J.js.map
