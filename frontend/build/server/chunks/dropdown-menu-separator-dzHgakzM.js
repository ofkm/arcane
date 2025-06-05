import { p as push, c as copy_payload, d as assign_payload, e as bind_props, a as pop, b as spread_props } from './index3-DI1Ivwzg.js';
import { a as cn } from './button-CUTwDrbo.js';
import { M as Menu_separator } from './menu-separator-Cugmsrwi.js';

function Dropdown_menu_separator($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Menu_separator($$payload2, spread_props([
      {
        class: cn("bg-muted -mx-1 my-1 h-px", className)
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

export { Dropdown_menu_separator as D };
//# sourceMappingURL=dropdown-menu-separator-dzHgakzM.js.map
