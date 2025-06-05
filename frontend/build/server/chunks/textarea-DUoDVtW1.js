import { p as push, k as spread_attributes, l as clsx, t as escape_html, e as bind_props, a as pop } from './index3-DI1Ivwzg.js';
import { a as cn } from './button-CUTwDrbo.js';

function Textarea($$payload, $$props) {
  push();
  let {
    ref = null,
    value = void 0,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<textarea${spread_attributes(
    {
      class: clsx(cn("border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className)),
      ...restProps
    },
    null
  )}>`;
  const $$body = escape_html(value);
  if ($$body) {
    $$payload.out += `${$$body}`;
  }
  $$payload.out += `</textarea>`;
  bind_props($$props, { ref, value });
  pop();
}

export { Textarea as T };
//# sourceMappingURL=textarea-DUoDVtW1.js.map
