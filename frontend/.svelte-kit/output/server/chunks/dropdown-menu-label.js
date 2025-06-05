import { p as push, m as spread_attributes, f as clsx, t as bind_props, a as pop } from "./index3.js";
import { c as cn } from "./button.js";
function Dropdown_menu_label($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    inset,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<div${spread_attributes(
    {
      class: clsx(cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></div>`;
  bind_props($$props, { ref });
  pop();
}
export {
  Dropdown_menu_label as D
};
