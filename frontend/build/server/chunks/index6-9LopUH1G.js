import { s as stores } from './client-Cc1XkR80.js';
import { n as getContext } from './index3-DI1Ivwzg.js';

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
const page = page$1;

export { page as p };
//# sourceMappingURL=index6-9LopUH1G.js.map
