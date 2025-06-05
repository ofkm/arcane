const version = "0.15.0";
let building = false;
let prerendering = false;
function set_building() {
  building = true;
}
function set_prerendering() {
  prerendering = true;
}
export {
  set_prerendering as a,
  building as b,
  prerendering as p,
  set_building as s,
  version as v
};
