import * as server from '../entries/pages/onboarding/settings/_page.server.ts.js';

export const index = 20;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/onboarding/settings/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/onboarding/settings/+page.server.ts";
export const imports = ["_app/immutable/nodes/20.Co4kvIsn.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/DUYgD2_s.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/bJ_I8NpF.js","_app/immutable/chunks/BVjinSze.js","_app/immutable/chunks/CWlk9DSI.js","_app/immutable/chunks/DMiKHtVB.js","_app/immutable/chunks/DmpUnYw5.js","_app/immutable/chunks/m9ItHG6J.js","_app/immutable/chunks/iMjrFJrG.js","_app/immutable/chunks/BUTdIsFV.js","_app/immutable/chunks/B9HEA4Xl.js","_app/immutable/chunks/B5ui7ZgY.js","_app/immutable/chunks/DGZIYs0n.js","_app/immutable/chunks/B1ASiaS-.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/CCfxTW1_.js","_app/immutable/chunks/CX4OS9M0.js"];
export const stylesheets = [];
export const fonts = [];
