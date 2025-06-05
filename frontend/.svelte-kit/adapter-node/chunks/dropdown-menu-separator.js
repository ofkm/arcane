import { p as push, u as copy_payload, v as assign_payload, t as bind_props, a as pop, j as spread_props } from "./index3.js";
import { c as cn } from "./button.js";
import { M as Menu_separator } from "./menu-separator.js";
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
export {
  Dropdown_menu_separator as D
};
