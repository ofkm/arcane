import { l as listImages, d as isImageInUse, b as checkImageMaturity } from './image-service-CL2WzxPP.js';
import { g as getSettings } from './settings-service-B1w8bfJq.js';
import './core-C8NMHkc_.js';
import 'dockerode';
import './errors.type-DfKnJ3rD.js';
import './registry.utils-rtYanQFp.js';
import '@swimlane/docker-reference';
import './try-catch-KtE72Cop.js';
import './index4-SoK3Vczo.js';
import './schema-CDkq0ub_.js';
import 'node:path';
import 'node:fs/promises';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import 'proper-lockfile';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:util';
import './settings-db-service-DyTlfQVT.js';

const load = async () => {
  try {
    const images = await listImages();
    const settings = await getSettings();
    const enhancedImages = await Promise.all(
      images.map(async (image) => {
        const inUse = await isImageInUse(image.Id);
        let maturity = void 0;
        try {
          if (image.repo !== "<none>" && image.tag !== "<none>") {
            maturity = await checkImageMaturity(image.Id);
          }
        } catch (maturityError) {
          console.error(`Failed to check maturity for image ${image.Id}:`, maturityError);
        }
        return {
          ...image,
          inUse,
          maturity
        };
      })
    );
    return {
      images: enhancedImages,
      settings
    };
  } catch (err) {
    console.error("Failed to load images:", err);
    const settings = await getSettings().catch(() => ({}));
    return {
      images: [],
      error: err.message || "Failed to connect to Docker or list images.",
      settings
    };
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 14;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-CozI-j_x.js')).default;
const server_id = "src/routes/images/+page.server.ts";
const imports = ["_app/immutable/nodes/14.Bqum5zr8.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/D2ZQhq98.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/BVjinSze.js","_app/immutable/chunks/iOXoOfm2.js","_app/immutable/chunks/CnMg5bH0.js","_app/immutable/chunks/CCfxTW1_.js","_app/immutable/chunks/C73rBIzk.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/BQr-K8qI.js","_app/immutable/chunks/DivMWeKY.js","_app/immutable/chunks/DLenizsP.js","_app/immutable/chunks/B2ByiyBM.js","_app/immutable/chunks/DmpUnYw5.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/CjSQePMv.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/m9ItHG6J.js","_app/immutable/chunks/iMjrFJrG.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/UVnX9grY.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/DUYgD2_s.js","_app/immutable/chunks/DzaAsv10.js","_app/immutable/chunks/BN5XhaSV.js","_app/immutable/chunks/CM2Qy78Q.js","_app/immutable/chunks/RONkA9YH.js","_app/immutable/chunks/BNz4MoZq.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/BR-g04mS.js","_app/immutable/chunks/CNwxKbLf.js","_app/immutable/chunks/BUdkjQ9d.js","_app/immutable/chunks/mAxAJ61f.js","_app/immutable/chunks/xhhyndDT.js","_app/immutable/chunks/CThrnvRT.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/DGZIYs0n.js","_app/immutable/chunks/XF4Z48D_.js","_app/immutable/chunks/CL-Amk4I.js","_app/immutable/chunks/Tgwv_1ap.js","_app/immutable/chunks/CMCUU1X7.js","_app/immutable/chunks/BHXAfpfV.js","_app/immutable/chunks/DJtaXGK5.js","_app/immutable/chunks/DhMUiTRD.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/CJVn1vXg.js","_app/immutable/chunks/CWU1czEL.js","_app/immutable/chunks/BhZTThSR.js","_app/immutable/chunks/Co9IQC3A.js","_app/immutable/chunks/BXZ-8GCb.js","_app/immutable/chunks/B3rBFWl_.js","_app/immutable/chunks/CX4OS9M0.js","_app/immutable/chunks/DLcUb980.js","_app/immutable/chunks/CuZ1HGtB.js","_app/immutable/chunks/BCsdK-MS.js"];
const stylesheets = ["_app/immutable/assets/index.CV-KWLNP.css","_app/immutable/assets/Toaster.D7TgzYVC.css","_app/immutable/assets/14.BIxtkHzO.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=14-CXvyTPbq.js.map
