import { p as push, B as element, e as bind_props, a as pop, k as spread_attributes, l as clsx } from './index3-DI1Ivwzg.js';
import { c as ce, a as cn } from './button-CUTwDrbo.js';

const badgeVariants = ce({
  base: "focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/80 border-transparent",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80 border-transparent",
      outline: "text-foreground"
    }
  },
  defaultVariants: { variant: "default" }
});
function Badge($$payload, $$props) {
  push();
  let {
    ref = null,
    href,
    class: className,
    variant = "default",
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  element(
    $$payload,
    href ? "a" : "span",
    () => {
      $$payload.out += `${spread_attributes(
        {
          href,
          class: clsx(cn(badgeVariants({ variant }), className)),
          ...restProps
        },
        null
      )}`;
    },
    () => {
      children?.($$payload);
      $$payload.out += `<!---->`;
    }
  );
  bind_props($$props, { ref });
  pop();
}

export { Badge as B };
//# sourceMappingURL=badge-Pb9wGjGi.js.map
