import { g as getSettings } from './settings-service-B1w8bfJq.js';
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

const load = async () => {
  const settings = await getSettings();
  return {
    settings
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 24;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-DQc_pcli.js')).default;
const server_id = "src/routes/settings/rbac/+page.server.ts";
const imports = ["_app/immutable/nodes/24.BoDr4UAO.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/B5ui7ZgY.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/bJ_I8NpF.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/BVjinSze.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/DmpUnYw5.js","_app/immutable/chunks/DGZIYs0n.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/B877H2_W.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/BrT7AbVn.js","_app/immutable/chunks/DYFwiHrC.js","_app/immutable/chunks/CHbZ4NRu.js","_app/immutable/chunks/BHsVyg00.js"];
const stylesheets = ["_app/immutable/assets/Toaster.D7TgzYVC.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=24-BfIi89HD.js.map
