import { g as getSettings } from './settings-service-B1w8bfJq.js';
import { d as private_env } from './shared-server-DIsQ43MR.js';
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
  const oidcEnvVarsConfigured = !!private_env.OIDC_CLIENT_ID && !!private_env.OIDC_CLIENT_SECRET && !!private_env.OIDC_REDIRECT_URI && !!private_env.OIDC_AUTHORIZATION_ENDPOINT && !!private_env.OIDC_TOKEN_ENDPOINT && !!private_env.OIDC_USERINFO_ENDPOINT;
  return {
    settings,
    oidcEnvVarsConfigured
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 25;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-De7nDuIc.js')).default;
const server_id = "src/routes/settings/security/+page.server.ts";
const imports = ["_app/immutable/nodes/25.4SMLxdZ2.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/C4qL6Mf1.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/B5ui7ZgY.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/bJ_I8NpF.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/BVjinSze.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/DmpUnYw5.js","_app/immutable/chunks/DGZIYs0n.js","_app/immutable/chunks/UVnX9grY.js","_app/immutable/chunks/DLenizsP.js","_app/immutable/chunks/CnMg5bH0.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/DUYgD2_s.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/B877H2_W.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/BNz4MoZq.js","_app/immutable/chunks/L2MC0XWs.js","_app/immutable/chunks/BHXAfpfV.js","_app/immutable/chunks/amUgki5J.js"];
const stylesheets = ["_app/immutable/assets/Toaster.D7TgzYVC.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=25-CI5pGcwH.js.map
