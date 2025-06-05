import { m as spread_attributes, f as clsx, t as bind_props, a as pop, p as push } from "./index3.js";
import { c as cn } from "./button.js";
function Alert_description($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<div${spread_attributes(
    {
      class: clsx(cn("text-sm [&_p]:leading-relaxed", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></div>`;
  bind_props($$props, { ref });
  pop();
}
function Alert_title($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    level = 5,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<div${spread_attributes(
    {
      role: "heading",
      "aria-level": level,
      class: clsx(cn("mb-1 font-medium leading-none tracking-tight", className)),
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
  Alert_title as A,
  Alert_description as a
};
