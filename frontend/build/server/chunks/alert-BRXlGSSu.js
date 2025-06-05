import { p as push, k as spread_attributes, l as clsx, e as bind_props, a as pop } from './index3-DI1Ivwzg.js';
import { a as cn, c as ce } from './button-CUTwDrbo.js';

const alertVariants = ce({
  base: "[&>svg]:text-foreground relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7",
  variants: {
    variant: {
      default: "bg-background text-foreground",
      destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
    }
  },
  defaultVariants: { variant: "default" }
});
function Alert($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    variant = "default",
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<div${spread_attributes(
    {
      class: clsx(cn(alertVariants({ variant }), className)),
      ...restProps,
      role: "alert"
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></div>`;
  bind_props($$props, { ref });
  pop();
}

export { Alert as A };
//# sourceMappingURL=alert-BRXlGSSu.js.map
