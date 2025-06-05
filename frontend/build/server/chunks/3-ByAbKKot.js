import { l as listContainers } from './container-service-m5_StWPI.js';
import { g as getDockerInfo } from './core-C8NMHkc_.js';
import { l as listImages, d as isImageInUse, i as imageMaturityDb, b as checkImageMaturity } from './image-service-CL2WzxPP.js';
import { g as getSettings } from './settings-service-B1w8bfJq.js';
import './errors-BtZyvX-k.js';
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
    const [dockerInfo, containersData, imagesData, settings] = await Promise.all([
      getDockerInfo().catch((e) => {
        console.error("Dashboard: Failed to get Docker info:", e.message);
        return null;
      }),
      listContainers(true).catch((e) => {
        console.error("Dashboard: Failed to list containers:", e.message);
        return [];
      }),
      listImages().catch((e) => {
        console.error("Dashboard: Failed to list images:", e.message);
        return [];
      }),
      getSettings().catch((e) => {
        console.error("Dashboard: Failed to get settings:", e.message);
        return null;
      })
    ]);
    const enhancedImages = await Promise.all(
      imagesData.map(async (image) => {
        const inUse = await isImageInUse(image.Id);
        const record = await imageMaturityDb.getImageMaturity(image.Id);
        let maturity = record ? imageMaturityDb.recordToImageMaturity(record) : void 0;
        if (maturity === void 0) {
          try {
            if (image.repo !== "<none>" && image.tag !== "<none>") {
              maturity = await checkImageMaturity(image.Id);
            }
          } catch (maturityError) {
            console.error(`Dashboard: Failed to check maturity for image ${image.Id}:`, maturityError);
            maturity = void 0;
          }
        }
        return {
          ...image,
          inUse,
          maturity
        };
      })
    );
    if (!dockerInfo) {
      return {
        dockerInfo: null,
        containers: [],
        images: enhancedImages,
        settings: settings ? { pruneMode: settings.pruneMode } : null,
        error: "Failed to connect to Docker Engine. Please check settings and ensure Docker is running."
      };
    }
    return {
      dockerInfo,
      containers: containersData,
      images: enhancedImages,
      settings: settings ? { pruneMode: settings.pruneMode } : null
    };
  } catch (err) {
    console.error("Dashboard: Unexpected error loading data:", err);
    return {
      dockerInfo: null,
      containers: [],
      images: [],
      // Return empty EnhancedImageInfo array on error
      settings: null,
      error: err.message || "An unexpected error occurred while loading dashboard data."
    };
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 3;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-DEBUcBMY.js')).default;
const server_id = "src/routes/+page.server.ts";
const imports = ["_app/immutable/nodes/3.DCryZd64.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/B5ui7ZgY.js","_app/immutable/chunks/D2ZQhq98.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/BVjinSze.js","_app/immutable/chunks/iOXoOfm2.js","_app/immutable/chunks/CnMg5bH0.js","_app/immutable/chunks/CCfxTW1_.js","_app/immutable/chunks/C73rBIzk.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/BQr-K8qI.js","_app/immutable/chunks/DivMWeKY.js","_app/immutable/chunks/DLenizsP.js","_app/immutable/chunks/B2ByiyBM.js","_app/immutable/chunks/DmpUnYw5.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/CjSQePMv.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/m9ItHG6J.js","_app/immutable/chunks/iMjrFJrG.js","_app/immutable/chunks/DVaDWjV4.js","_app/immutable/chunks/BR-g04mS.js","_app/immutable/chunks/mAxAJ61f.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/UVnX9grY.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/DUYgD2_s.js","_app/immutable/chunks/BNz4MoZq.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/BhZTThSR.js","_app/immutable/chunks/CX4OS9M0.js","_app/immutable/chunks/CXuQMvfN.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/C2kjEBku.js","_app/immutable/chunks/CThrnvRT.js","_app/immutable/chunks/BUdkjQ9d.js","_app/immutable/chunks/XF4Z48D_.js","_app/immutable/chunks/CL-Amk4I.js","_app/immutable/chunks/RONkA9YH.js","_app/immutable/chunks/Tgwv_1ap.js","_app/immutable/chunks/CMCUU1X7.js","_app/immutable/chunks/BHXAfpfV.js","_app/immutable/chunks/xhhyndDT.js","_app/immutable/chunks/CKC8MdI0.js","_app/immutable/chunks/Bh_rBs7G.js","_app/immutable/chunks/CHbZ4NRu.js","_app/immutable/chunks/B877H2_W.js","_app/immutable/chunks/Buz1G913.js","_app/immutable/chunks/B3rBFWl_.js","_app/immutable/chunks/CywCv4nj.js","_app/immutable/chunks/Cm35N4Au.js","_app/immutable/chunks/BZMdbj5w.js","_app/immutable/chunks/Co9IQC3A.js"];
const stylesheets = ["_app/immutable/assets/index.CV-KWLNP.css","_app/immutable/assets/Toaster.D7TgzYVC.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=3-ByAbKKot.js.map
