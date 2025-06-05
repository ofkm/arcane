import { g as getImage } from './image-service-CL2WzxPP.js';
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
import './errors.type-DfKnJ3rD.js';
import './registry.utils-rtYanQFp.js';
import '@swimlane/docker-reference';
import './try-catch-KtE72Cop.js';

const load = async ({ params }) => {
  const imageId = params.imageId;
  try {
    const image = await getImage(imageId);
    return {
      image
    };
  } catch (err) {
    console.error(`Failed to load image ${imageId}:`, err);
    if (err instanceof NotFoundError) {
      error(404, { message: err.message });
    } else {
      error(err.status || 500, {
        message: err.message || `Failed to load image details for "${imageId}".`
      });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 15;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-DSzZW-KA.js')).default;
const server_id = "src/routes/images/[imageId]/+page.server.ts";
const imports = ["_app/immutable/nodes/15.DxOi6oee.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/DDBOCpJi.js","_app/immutable/chunks/CCfxTW1_.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/n3W22Cu1.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/DTWxSKed.js","_app/immutable/chunks/DVaDWjV4.js","_app/immutable/chunks/BR-g04mS.js","_app/immutable/chunks/BUdkjQ9d.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/xhhyndDT.js","_app/immutable/chunks/CThrnvRT.js","_app/immutable/chunks/DJtaXGK5.js","_app/immutable/chunks/DhMUiTRD.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/CJVn1vXg.js","_app/immutable/chunks/CWU1czEL.js","_app/immutable/chunks/BhZTThSR.js","_app/immutable/chunks/Co9IQC3A.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/CE-plJDc.js","_app/immutable/chunks/B3rBFWl_.js","_app/immutable/chunks/Tgwv_1ap.js","_app/immutable/chunks/CywCv4nj.js","_app/immutable/chunks/0Kkvs01K.js","_app/immutable/chunks/Bs79U31N.js"];
const stylesheets = ["_app/immutable/assets/Toaster.D7TgzYVC.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=15-DjqkPr2n.js.map
