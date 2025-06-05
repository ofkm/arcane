import { o as derived, p as push, q as props_id, m as spread_attributes, t as bind_props, a as pop, b as attr, k as escape_html, d as attr_class, f as clsx, j as spread_props, e as attr_style, n as stringify } from "./index3.js";
import { c as cn } from "./button.js";
import { u as useId } from "./use-id.js";
import { c as createBitsAttrs, a as attachRef, b as createId, d as box, m as mergeProps } from "./create-id.js";
import "style-to-object";
import "clsx";
const meterAttrs = createBitsAttrs({ component: "meter", parts: ["root"] });
class MeterRootState {
  opts;
  constructor(opts) {
    this.opts = opts;
  }
  #props = derived(() => ({
    role: "meter",
    value: this.opts.value.current,
    "aria-valuemin": this.opts.min.current,
    "aria-valuemax": this.opts.max.current,
    "aria-valuenow": this.opts.value.current,
    "data-value": this.opts.value.current,
    "data-max": this.opts.max.current,
    "data-min": this.opts.min.current,
    [meterAttrs.root]: "",
    ...attachRef(this.opts.ref)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function useMeterRootState(props) {
  return new MeterRootState(props);
}
function Meter($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    child,
    children,
    value = 0,
    max = 100,
    min = 0,
    id = createId(uid),
    ref = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const rootState = useMeterRootState({
    value: box.with(() => value),
    max: box.with(() => max),
    min: box.with(() => min),
    id: box.with(() => id),
    ref: box.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps(restProps, rootState.props);
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { props: mergedProps });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<div${spread_attributes({ ...mergedProps }, null)}>`;
    children?.($$payload);
    $$payload.out += `<!----></div>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { ref });
  pop();
}
function Meter_1($$payload, $$props) {
  push();
  let {
    max = 100,
    value = 0,
    min = 0,
    label,
    valueLabel,
    showLabel = true,
    showValueLabel = true,
    variant = "default",
    size = "default",
    class: className = "",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const labelId = useId();
  const variantStyles = {
    default: "bg-accent",
    success: "bg-green-500",
    warning: "bg-amber-500",
    destructive: "bg-destructive"
  };
  const sizeStyles = { sm: "h-1.5", default: "h-2.5", lg: "h-4" };
  const percentage = Math.round((value - min) / (max - min) * 100);
  if (showLabel && (label || valueLabel)) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="flex items-center justify-between text-sm mb-2">`;
    if (showLabel && label) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<span${attr("id", labelId)} class="font-medium text-foreground">${escape_html(label)}</span>`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--> `;
    if (showValueLabel && valueLabel) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<span class="text-muted-foreground">${escape_html(valueLabel)}</span>`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <div${attr_class(clsx(cn("relative w-full bg-secondary rounded-full overflow-hidden", sizeStyles[size], className)))}><!---->`;
  Meter($$payload, spread_props([
    {
      "aria-labelledby": label ? labelId : void 0,
      "aria-valuetext": valueLabel,
      value,
      min,
      max,
      class: "w-full h-full"
    },
    restProps,
    {
      children: ($$payload2) => {
        $$payload2.out += `<div${attr_class(clsx(cn("h-full rounded-full transition-all duration-300 ease-in-out", variantStyles[variant])))}${attr_style(`width: ${stringify(percentage)}%`)}></div>`;
      },
      $$slots: { default: true }
    }
  ]));
  $$payload.out += `<!----></div>`;
  pop();
}
export {
  Meter_1 as M
};
