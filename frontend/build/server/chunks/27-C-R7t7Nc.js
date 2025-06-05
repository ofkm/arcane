import { B as BaseAPIService } from './api-service-DMPLrOP8.js';
import { l as listUsers } from './user-service-DRkBleBJ.js';

class UserAPIService extends BaseAPIService {
  async update(id, user) {
    const res = await this.api.put(`/users/${id}`, user);
    return res.data;
  }
  async create(user) {
    const res = await this.api.post(`/users`, user);
    return res.data;
  }
  async delete(id) {
    const res = await this.api.delete(`/users/${id}`);
    return res.data;
  }
}

const load = async ({ cookies }) => {
  try {
    const userApi = new UserAPIService();
    const users = await listUsers();
    const sanitizedUsers = users.map((user) => {
      const { passwordHash: _passwordHash, ...rest } = user;
      return rest;
    });
    return {
      users: users || []
    };
  } catch (error) {
    console.error("Failed to load users:", error);
    return {
      users: []
    };
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 27;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-Bh2xcwln.js')).default;
const server_id = "src/routes/settings/users/+page.server.ts";
const imports = ["_app/immutable/nodes/27.RblaOHJh.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/B5ui7ZgY.js","_app/immutable/chunks/BJCWvCOq.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/D2ZQhq98.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/BVjinSze.js","_app/immutable/chunks/iOXoOfm2.js","_app/immutable/chunks/CnMg5bH0.js","_app/immutable/chunks/CCfxTW1_.js","_app/immutable/chunks/C73rBIzk.js","_app/immutable/chunks/Cz4A3yFi.js","_app/immutable/chunks/BQr-K8qI.js","_app/immutable/chunks/DivMWeKY.js","_app/immutable/chunks/DLenizsP.js","_app/immutable/chunks/B2ByiyBM.js","_app/immutable/chunks/DmpUnYw5.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/CjSQePMv.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/UVnX9grY.js","_app/immutable/chunks/DVI-9q8T.js","_app/immutable/chunks/DUYgD2_s.js","_app/immutable/chunks/B1ASiaS-.js","_app/immutable/chunks/BjTWgG3-.js","_app/immutable/chunks/BNz4MoZq.js","_app/immutable/chunks/BKkfcLAR.js","_app/immutable/chunks/CNwxKbLf.js","_app/immutable/chunks/BN5XhaSV.js","_app/immutable/chunks/CM2Qy78Q.js","_app/immutable/chunks/RONkA9YH.js","_app/immutable/chunks/CHemGuYG.js","_app/immutable/chunks/CThrnvRT.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/BUdkjQ9d.js","_app/immutable/chunks/mAxAJ61f.js","_app/immutable/chunks/CuZ1HGtB.js","_app/immutable/chunks/BCsdK-MS.js","_app/immutable/chunks/CtVgMZPJ.js"];
const stylesheets = ["_app/immutable/assets/Toaster.D7TgzYVC.css","_app/immutable/assets/index.CV-KWLNP.css"];
const fonts = [];

var _27 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  component: component,
  fonts: fonts,
  imports: imports,
  index: index,
  server: _page_server_ts,
  server_id: server_id,
  stylesheets: stylesheets
});

export { UserAPIService as U, _27 as _ };
//# sourceMappingURL=27-C-R7t7Nc.js.map
