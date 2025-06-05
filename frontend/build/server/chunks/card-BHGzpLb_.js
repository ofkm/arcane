import { p as push, k as spread_attributes, l as clsx, e as bind_props, a as pop } from './index3-DI1Ivwzg.js';
import { a as cn } from './button-CUTwDrbo.js';

function Card($$payload, $$props) {
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
      class: clsx(cn("bg-card text-card-foreground rounded-lg border shadow-sm", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></div>`;
  bind_props($$props, { ref });
  pop();
}

export { Card as C };
//# sourceMappingURL=card-BHGzpLb_.js.map
