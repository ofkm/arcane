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
  if (settings.onboarding && settings.onboarding.completed) {
    throw redirect(302, "/");
  }
  return { settings };
}

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 21;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-CUxoHAjP.js')).default;
const server_id = "src/routes/onboarding/welcome/+page.server.ts";
const imports = ["_app/immutable/nodes/21.CiwhWz5x.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/DGZIYs0n.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/CMCUU1X7.js","_app/immutable/chunks/CCfxTW1_.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=21-TcM22eK-.js.map
