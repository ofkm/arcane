import { p as push, y as props_id, k as spread_attributes, e as bind_props, a as pop } from './index3-DI1Ivwzg.js';
import { a as createId, b as box, m as mergeProps } from './create-id-DRrkdd12.js';
import { c as useMenuItem } from './is-using-keyboard.svelte-DKF6IOQr.js';
import { n as noop } from './noop-BrWcRgZY.js';

function Menu_item($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    child,
    children,
    ref = null,
    id = createId(uid),
    disabled = false,
    onSelect = noop,
    closeOnSelect = true,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const itemState = useMenuItem({
    id: box.with(() => id),
    disabled: box.with(() => disabled),
    onSelect: box.with(() => onSelect),
    ref: box.with(() => ref, (v) => ref = v),
    closeOnSelect: box.with(() => closeOnSelect)
  });
  const mergedProps = mergeProps(restProps, itemState.props);
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

export { Menu_item as M };
//# sourceMappingURL=menu-item-iytmaAC5.js.map
