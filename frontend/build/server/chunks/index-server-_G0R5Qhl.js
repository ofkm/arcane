const SvelteMap = globalThis.Map;
class MediaQuery {
  current;
  /**
   * @param {string} query
   * @param {boolean} [matches]
   */
  constructor(query, matches = false) {
    this.current = matches;
  }
}
function createSubscriber(_) {
  return () => {
  };
}

export { MediaQuery as M, SvelteMap as S, createSubscriber as c };
//# sourceMappingURL=index-server-_G0R5Qhl.js.map
