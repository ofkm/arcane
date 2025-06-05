import { l as listContainers } from './container-service-m5_StWPI.js';
import { l as listImages } from './image-service-CL2WzxPP.js';
import { l as listNetworks } from './network-service-FOR9TyaI.js';
import { l as listVolumes } from './volume-service-CME0Oab3.js';
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
import './errors.type-DfKnJ3rD.js';
import './registry.utils-rtYanQFp.js';
import '@swimlane/docker-reference';
import './try-catch-KtE72Cop.js';
import './constants-BuoZlPL3.js';

const load = async () => {
  try {
    const [containers, volumes, networks, images] = await Promise.all([listContainers(true), listVolumes(), listNetworks(), listImages()]);
    return {
      containers,
      volumes,
      networks,
      images
    };
  } catch (error) {
    console.error("Error loading container data:", error);
    return {
      containers: [],
      volumes: [],
      networks: [],
      images: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 12;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-Cqf23IHV.js')).default;
const server_id = "src/routes/containers/+page.server.ts";
const imports = ["_app/immutable/nodes/12.C4qU22bp.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/D2ZQhq98.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/BVjinSze.js","_app/immutable/chunks/iOXoOfm2.js","_app/immutable/chunks/CnMg5bH0.js","_app/immutable/chunks/CCfxTW1_.js","_app/immutable/chunks/C73rBIzk.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/BQr-K8qI.js","_app/immutable/chunks/DivMWeKY.js","_app/immutable/chunks/DLenizsP.js","_app/immutable/chunks/B2ByiyBM.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/DmpUnYw5.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/CjSQePMv.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/BUdkjQ9d.js","_app/immutable/chunks/CNwxKbLf.js","_app/immutable/chunks/BN5XhaSV.js","_app/immutable/chunks/CM2Qy78Q.js","_app/immutable/chunks/RONkA9YH.js","_app/immutable/chunks/UVnX9grY.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/DUYgD2_s.js","_app/immutable/chunks/CgyVJ7zG.js","_app/immutable/chunks/BR-g04mS.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/bJ_I8NpF.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/C2kjEBku.js","_app/immutable/chunks/CThrnvRT.js","_app/immutable/chunks/DJtaXGK5.js","_app/immutable/chunks/DhMUiTRD.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/CJVn1vXg.js","_app/immutable/chunks/CWU1czEL.js","_app/immutable/chunks/BhZTThSR.js","_app/immutable/chunks/Co9IQC3A.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/BNz4MoZq.js","_app/immutable/chunks/DYFwiHrC.js","_app/immutable/chunks/CX4OS9M0.js","_app/immutable/chunks/mAxAJ61f.js","_app/immutable/chunks/CXuQMvfN.js","_app/immutable/chunks/DVaDWjV4.js","_app/immutable/chunks/BXZ-8GCb.js","_app/immutable/chunks/Buz1G913.js","_app/immutable/chunks/B877H2_W.js","_app/immutable/chunks/CuZ1HGtB.js","_app/immutable/chunks/BCsdK-MS.js","_app/immutable/chunks/CdIEgevt.js","_app/immutable/chunks/GFFG_c1M.js"];
const stylesheets = ["_app/immutable/assets/index.CV-KWLNP.css","_app/immutable/assets/Toaster.D7TgzYVC.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=12-D8BK6rSl.js.map
