import { p as push, y as props_id, k as spread_attributes, e as bind_props, a as pop } from './index3-DI1Ivwzg.js';
import { a as createId, b as box, m as mergeProps } from './create-id-DRrkdd12.js';
import { b as useMenuSeparator } from './is-using-keyboard.svelte-DKF6IOQr.js';

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

export { Menu_separator as M };
//# sourceMappingURL=menu-separator-Cugmsrwi.js.map
