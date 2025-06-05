import { p as push, q as props_id, m as spread_attributes, t as bind_props, a as pop } from "./index3.js";
import { b as createId, d as box, m as mergeProps } from "./create-id.js";
import "style-to-object";
import "clsx";
import { b as useMenuSeparator } from "./is-using-keyboard.svelte.js";
function Menu_separator($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    ref = null,
    id = createId(uid),
    child,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const separatorState = useMenuSeparator({
    id: box.with(() => id),
    ref: box.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps(restProps, separatorState.props);
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { props: mergedProps });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<div${spread_attributes({ ...mergedProps }, null)}>`;
    children?.($$payload);
    $$payload.out += `<!----></div>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { ref });
  pop();
}
export {
  Menu_separator as M
};
