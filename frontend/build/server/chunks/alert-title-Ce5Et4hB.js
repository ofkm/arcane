import { p as push, k as spread_attributes, l as clsx, e as bind_props, a as pop } from './index3-DI1Ivwzg.js';
import { a as cn } from './button-CUTwDrbo.js';

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

export { Alert_title as A, Alert_description as a };
//# sourceMappingURL=alert-title-Ce5Et4hB.js.map
