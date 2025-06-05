import { m as spread_attributes, f as clsx, t as bind_props, a as pop, p as push } from "./index3.js";
import { c as cn } from "./button.js";
function Card_description($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<p${spread_attributes(
    {
      class: clsx(cn("text-muted-foreground text-sm", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></p>`;
  bind_props($$props, { ref });
  pop();
}
export {
  Card_description as C
};
