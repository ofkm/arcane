import { r as redirect } from './index-Ddp2AB5f.js';
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

async function load() {
  const settings = await getSettings();
  if (!settings.onboarding?.steps?.password) {
    throw redirect(302, "/onboarding/welcome");
  }
  return { settings };
}

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 20;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-xrOQPYgQ.js')).default;
const server_id = "src/routes/onboarding/settings/+page.server.ts";
const imports = ["_app/immutable/nodes/20.Co4kvIsn.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/DUYgD2_s.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/bJ_I8NpF.js","_app/immutable/chunks/BVjinSze.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/DmpUnYw5.js","_app/immutable/chunks/m9ItHG6J.js","_app/immutable/chunks/iMjrFJrG.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/B5ui7ZgY.js","_app/immutable/chunks/DGZIYs0n.js","_app/immutable/chunks/B1ASiaS-.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/CCfxTW1_.js","_app/immutable/chunks/CX4OS9M0.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=20-DdxnLCWm.js.map
