import { s as stores } from "./client.js";
import { g as getContext } from "./index3.js";
({
  check: stores.updated.check
});
function context() {
  return getContext("__request__");
}
const page$1 = {
  get error() {
    return context().page.error;
  },
  get status() {
    return context().page.status;
  },
  get url() {
    return context().page.url;
  }
};
const navigating$1 = {
  type: null
};
const page = page$1;
const navigating = navigating$1;
export {
  navigating as n,
  page as p
};
