import { r as redirect } from './index-Ddp2AB5f.js';

const load = async () => {
  throw redirect(302, "/auth/login");
};
const actions = {
  default: async ({ locals }) => {
    await locals.session.destroy();
    throw redirect(302, "/auth/login");
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 7;
const server_id = "src/routes/auth/logout/+page.server.ts";
const imports = [];
const stylesheets = [];
const fonts = [];

export { fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=7-Bc3aI_UK.js.map
