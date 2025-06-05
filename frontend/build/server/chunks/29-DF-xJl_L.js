import { r as removeVolume, g as getVolume, i as isVolumeInUse } from './volume-service-CME0Oab3.js';
import { r as redirect, f as fail, e as error } from './index-Ddp2AB5f.js';
import { N as NotFoundError, C as ConflictError, D as DockerApiError } from './errors-BtZyvX-k.js';
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

const load = async ({ params }) => {
  const volumeName = params.volumeName;
  try {
    const [volume, inUse] = await Promise.all([
      getVolume(volumeName),
      isVolumeInUse(volumeName).catch((err) => {
        console.error(`Failed to check if volume ${volumeName} is in use:`, err);
        return true;
      })
    ]);
    return {
      volume,
      inUse
    };
  } catch (err) {
    console.error(`Failed to load volume ${volumeName}:`, err);
    if (err instanceof NotFoundError) {
      error(404, { message: err.message });
    } else if (err instanceof DockerApiError) {
      error(err.status || 500, { message: err.message });
    } else if (err instanceof Error) {
      error(500, { message: err.message || `Failed to load volume details for "${volumeName}".` });
    } else {
      error(500, { message: `An unexpected error occurred while loading volume "${volumeName}".` });
    }
  }
};
const actions = {
  remove: async ({ params, url }) => {
    const volumeName = params.volumeName;
    const force = url.searchParams.get("force") === "true";
    try {
      await removeVolume(volumeName, force);
      redirect(303, "/volumes");
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof ConflictError || err instanceof DockerApiError) {
        return fail(err.status || 500, { error: err.message });
      }
      const message = err instanceof Error ? err.message : "An unexpected error occurred during removal.";
      return fail(500, { error: message });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 29;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BZGD24nn.js')).default;
const server_id = "src/routes/volumes/[volumeName]/+page.server.ts";
const imports = ["_app/immutable/nodes/29.BkZY5C8f.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/B5ui7ZgY.js","_app/immutable/chunks/DDBOCpJi.js","_app/immutable/chunks/CCfxTW1_.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/m9ItHG6J.js","_app/immutable/chunks/iMjrFJrG.js","_app/immutable/chunks/mAxAJ61f.js","_app/immutable/chunks/DVaDWjV4.js","_app/immutable/chunks/BUdkjQ9d.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/1rCL2Ywu.js","_app/immutable/chunks/CThrnvRT.js","_app/immutable/chunks/DJtaXGK5.js","_app/immutable/chunks/DhMUiTRD.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/CJVn1vXg.js","_app/immutable/chunks/CWU1czEL.js","_app/immutable/chunks/BhZTThSR.js","_app/immutable/chunks/Co9IQC3A.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/CX4OS9M0.js","_app/immutable/chunks/B5Po4twO.js","_app/immutable/chunks/B3rBFWl_.js","_app/immutable/chunks/Tgwv_1ap.js","_app/immutable/chunks/BjVJhjER.js","_app/immutable/chunks/amUgki5J.js","_app/immutable/chunks/0Kkvs01K.js","_app/immutable/chunks/Bs79U31N.js"];
const stylesheets = ["_app/immutable/assets/Toaster.D7TgzYVC.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=29-DF-xJl_L.js.map
