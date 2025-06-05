import { p as push, c as copy_payload, d as assign_payload, e as bind_props, a as pop, b as spread_props } from './index3-DI1Ivwzg.js';
import { a as cn } from './button-CUTwDrbo.js';
import { M as Menu_item } from './menu-item-iytmaAC5.js';

function Dropdown_menu_item($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    inset,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Menu_item($$payload2, spread_props([
      {
        class: cn("data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", inset && "pl-8", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out += `<!---->`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}

export { Dropdown_menu_item as D };
//# sourceMappingURL=dropdown-menu-item-avPBUpKU.js.map
