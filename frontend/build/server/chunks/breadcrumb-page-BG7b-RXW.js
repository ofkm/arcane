import { p as push, k as spread_attributes, l as clsx, e as bind_props, a as pop } from './index3-DI1Ivwzg.js';
import { a as cn } from './button-CUTwDrbo.js';
import { C as Chevron_right } from './chevron-right-EG31JOyw.js';

function Breadcrumb($$payload, $$props) {
  push();
  let {
    ref = void 0,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<nav${spread_attributes(
    {
      class: clsx(className),
      "aria-label": "breadcrumb",
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></nav>`;
  bind_props($$props, { ref });
  pop();
}
function Breadcrumb_item($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<li${spread_attributes(
    {
      class: clsx(cn("inline-flex items-center gap-1.5", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></li>`;
  bind_props($$props, { ref });
  pop();
}
function Breadcrumb_separator($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<li${spread_attributes(
    {
      role: "presentation",
      "aria-hidden": "true",
      class: clsx(cn("[&>svg]:size-3.5", className)),
      ...restProps
    },
    null
  )}>`;
  if (children) {
    $$payload.out += "<!--[-->";
    children?.($$payload);
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    Chevron_right($$payload, {});
  }
  $$payload.out += `<!--]--></li>`;
  bind_props($$props, { ref });
  pop();
}
function Breadcrumb_link($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    href = void 0,
    child,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const attrs = {
    class: cn("hover:text-foreground transition-colors", className),
    href,
    ...restProps
  };
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { props: attrs });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<a${spread_attributes({ ...attrs }, null)}>`;
    children?.($$payload);
    $$payload.out += `<!----></a>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { ref });
  pop();
}
function Breadcrumb_list($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<ol${spread_attributes(
    {
      class: clsx(cn("text-muted-foreground flex flex-wrap items-center gap-1.5 break-words text-sm sm:gap-2.5", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></ol>`;
  bind_props($$props, { ref });
  pop();
}
function Breadcrumb_page($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<span${spread_attributes(
    {
      role: "link",
      "aria-disabled": "true",
      "aria-current": "page",
      class: clsx(cn("text-foreground font-normal", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></span>`;
  bind_props($$props, { ref });
  pop();
}

export { Breadcrumb as B, Breadcrumb_list as a, Breadcrumb_item as b, Breadcrumb_link as c, Breadcrumb_separator as d, Breadcrumb_page as e };
//# sourceMappingURL=breadcrumb-page-BG7b-RXW.js.map
