import { p as push, k as spread_attributes, e as bind_props, a as pop } from './index3-DI1Ivwzg.js';
import { m as mergeProps, s as srOnlyStylesString } from './create-id-DRrkdd12.js';

function Hidden_input($$payload, $$props) {
  push();
  let {
    value = void 0,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const mergedProps = mergeProps(restProps, {
    "aria-hidden": "true",
    tabindex: -1,
    style: srOnlyStylesString
  });
  if (mergedProps.type === "checkbox") {
    $$payload.out += "<!--[-->";
    $$payload.out += `<input${spread_attributes({ ...mergedProps, value }, null)}/>`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<input${spread_attributes({ value, ...mergedProps }, null)}/>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { value });
  pop();
}

export { Hidden_input as H };
//# sourceMappingURL=hidden-input-BsZkZal-.js.map
