import { p as push, k as spread_attributes, l as clsx, e as bind_props, a as pop } from './index3-DI1Ivwzg.js';
import { a as cn } from './button-CUTwDrbo.js';

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

export { Dropdown_menu_label as D };
//# sourceMappingURL=dropdown-menu-label-BGU7solI.js.map
