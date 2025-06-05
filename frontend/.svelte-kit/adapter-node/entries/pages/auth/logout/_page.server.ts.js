import { r as redirect } from "../../../../chunks/index.js";
const load = async () => {
  throw redirect(302, "/auth/login");
};
const actions = {
  default: async ({ locals }) => {
    await locals.session.destroy();
    throw redirect(302, "/auth/login");
  }
};
export {
  actions,
  load
};
