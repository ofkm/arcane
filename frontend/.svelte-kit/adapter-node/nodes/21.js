import * as server from '../entries/pages/onboarding/welcome/_page.server.ts.js';

export const index = 21;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/onboarding/welcome/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/onboarding/welcome/+page.server.ts";
export const imports = ["_app/immutable/nodes/21.CiwhWz5x.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/DGZIYs0n.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/CMCUU1X7.js","_app/immutable/chunks/CCfxTW1_.js"];
export const stylesheets = [];
export const fonts = [];
