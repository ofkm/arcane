import { p as push, c as copy_payload, d as assign_payload, e as bind_props, a as pop, b as spread_props, y as props_id, k as spread_attributes, u as derived } from './index3-DI1Ivwzg.js';
import { a as cn } from './button-CUTwDrbo.js';
import { c as createBitsAttrs, a as createId, w as watch, b as box, m as mergeProps, d as attachRef, g as getDataDisabled, h as getAriaRequired, i as getAriaChecked } from './create-id-DRrkdd12.js';
import { C as Context, E as ENTER, S as SPACE } from './noop-BrWcRgZY.js';
import { s as snapshot } from './get-directional-keys-4fLrGlIs.js';
import { H as Hidden_input } from './hidden-input-BsZkZal-.js';
import { I as Icon } from './Icon-DbVCNmsR.js';
import { C as Check } from './check-CkcwyHfy.js';

const checkboxAttrs = createBitsAttrs({
  component: "checkbox",
  parts: ["root", "group", "group-label", "input"]
});
class CheckboxRootState {
  opts;
  group;
  #trueName = derived(() => {
    if (this.group && this.group.opts.name.current) {
      return this.group.opts.name.current;
    } else {
      return this.opts.name.current;
    }
  });
  get trueName() {
    return this.#trueName();
  }
  set trueName($$value) {
    return this.#trueName($$value);
  }
  #trueRequired = derived(() => {
    if (this.group && this.group.opts.required.current) {
      return true;
    }
    return this.opts.required.current;
  });
  get trueRequired() {
    return this.#trueRequired();
  }
  set trueRequired($$value) {
    return this.#trueRequired($$value);
  }
  #trueDisabled = derived(() => {
    if (this.group && this.group.opts.disabled.current) {
      return true;
    }
    return this.opts.disabled.current;
  });
  get trueDisabled() {
    return this.#trueDisabled();
  }
  set trueDisabled($$value) {
    return this.#trueDisabled($$value);
  }
  constructor(opts, group = null) {
    this.opts = opts;
    this.group = group;
    this.onkeydown = this.onkeydown.bind(this);
    this.onclick = this.onclick.bind(this);
    watch.pre(
      [
        () => snapshot(this.group?.opts.value.current),
        () => this.opts.value.current
      ],
      ([groupValue, value]) => {
        if (!groupValue || !value) return;
        this.opts.checked.current = groupValue.includes(value);
      }
    );
    watch.pre(() => this.opts.checked.current, (checked) => {
      if (!this.group) return;
      if (checked) {
        this.group?.addValue(this.opts.value.current);
      } else {
        this.group?.removeValue(this.opts.value.current);
      }
    });
  }
  onkeydown(e) {
    if (this.opts.disabled.current) return;
    if (e.key === ENTER) e.preventDefault();
    if (e.key === SPACE) {
      e.preventDefault();
      this.#toggle();
    }
  }
  #toggle() {
    if (this.opts.indeterminate.current) {
      this.opts.indeterminate.current = false;
      this.opts.checked.current = true;
    } else {
      this.opts.checked.current = !this.opts.checked.current;
    }
  }
  onclick(_) {
    if (this.opts.disabled.current) return;
    this.#toggle();
  }
  #snippetProps = derived(() => ({
    checked: this.opts.checked.current,
    indeterminate: this.opts.indeterminate.current
  }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "checkbox",
    type: this.opts.type.current,
    disabled: this.trueDisabled,
    "aria-checked": getAriaChecked(this.opts.checked.current, this.opts.indeterminate.current),
    "aria-required": getAriaRequired(this.trueRequired),
    "data-disabled": getDataDisabled(this.trueDisabled),
    "data-state": getCheckboxDataState(this.opts.checked.current, this.opts.indeterminate.current),
    [checkboxAttrs.root]: "",
    //
    onclick: this.onclick,
    onkeydown: this.onkeydown,
    ...attachRef(this.opts.ref)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CheckboxInputState {
  root;
  #trueChecked = derived(() => {
    if (!this.root.group) return this.root.opts.checked.current;
    if (this.root.opts.value.current !== void 0 && this.root.group.opts.value.current.includes(this.root.opts.value.current)) {
      return true;
    }
    return false;
  });
  get trueChecked() {
    return this.#trueChecked();
  }
  set trueChecked($$value) {
    return this.#trueChecked($$value);
  }
  #shouldRender = derived(() => Boolean(this.root.trueName));
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  constructor(root) {
    this.root = root;
  }
  #props = derived(() => ({
    type: "checkbox",
    checked: this.root.opts.checked.current === true,
    disabled: this.root.trueDisabled,
    required: this.root.trueRequired,
    name: this.root.trueName,
    value: this.root.opts.value.current
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function getCheckboxDataState(checked, indeterminate) {
  if (indeterminate) return "indeterminate";
  return checked ? "checked" : "unchecked";
}
const CheckboxGroupContext = new Context("Checkbox.Group");
const CheckboxRootContext = new Context("Checkbox.Root");
function useCheckboxRoot(props, group) {
  return CheckboxRootContext.set(new CheckboxRootState(props, group));
}
function useCheckboxInput() {
  return new CheckboxInputState(CheckboxRootContext.get());
}
function Checkbox_input($$payload, $$props) {
  push();
  const inputState = useCheckboxInput();
  if (inputState.shouldRender) {
    $$payload.out += "<!--[-->";
    Hidden_input($$payload, spread_props([inputState.props]));
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function Checkbox$1($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    checked = false,
    ref = null,
    onCheckedChange,
    children,
    disabled = false,
    required = false,
    name = void 0,
    value = "on",
    id = createId(uid),
    indeterminate = false,
    onIndeterminateChange,
    child,
    type = "button",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const group = CheckboxGroupContext.getOr(null);
  if (group && value) {
    if (group.opts.value.current.includes(value)) {
      checked = true;
    } else {
      checked = false;
    }
  }
  watch.pre(() => value, () => {
    if (group && value) {
      if (group.opts.value.current.includes(value)) {
        checked = true;
      } else {
        checked = false;
      }
    }
  });
  const rootState = useCheckboxRoot(
    {
      checked: box.with(() => checked, (v) => {
        checked = v;
        onCheckedChange?.(v);
      }),
      disabled: box.with(() => disabled ?? false),
      required: box.with(() => required),
      name: box.with(() => name),
      value: box.with(() => value),
      id: box.with(() => id),
      ref: box.with(() => ref, (v) => ref = v),
      indeterminate: box.with(() => indeterminate, (v) => {
        indeterminate = v;
        onIndeterminateChange?.(v);
      }),
      type: box.with(() => type)
    },
    group
  );
  const mergedProps = mergeProps({ ...restProps }, rootState.props);
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { props: mergedProps, ...rootState.snippetProps });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<button${spread_attributes({ ...mergedProps }, null)}>`;
    children?.($$payload, rootState.snippetProps);
    $$payload.out += `<!----></button>`;
  }
  $$payload.out += `<!--]--> `;
  Checkbox_input($$payload);
  $$payload.out += `<!---->`;
  bind_props($$props, { checked, ref, indeterminate });
  pop();
}
function Minus($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [["path", { "d": "M5 12h14" }]];
  Icon($$payload, spread_props([
    { name: "minus" },
    props,
    {
      iconNode,
      children: ($$payload2) => {
        props.children?.($$payload2);
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    }
  ]));
  pop();
}
function Checkbox($$payload, $$props) {
  push();
  let {
    ref = null,
    checked = false,
    indeterminate = false,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    {
      let children = function($$payload3, { checked: checked2, indeterminate: indeterminate2 }) {
        $$payload3.out += `<div class="flex size-4 items-center justify-center text-current">`;
        if (indeterminate2) {
          $$payload3.out += "<!--[-->";
          Minus($$payload3, { class: "size-3.5" });
        } else {
          $$payload3.out += "<!--[!-->";
          Check($$payload3, {
            class: cn("size-3.5", !checked2 && "text-transparent")
          });
        }
        $$payload3.out += `<!--]--></div>`;
      };
      Checkbox$1($$payload2, spread_props([
        {
          class: cn("border-primary ring-offset-background focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground peer box-content size-4 shrink-0 rounded-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          get checked() {
            return checked;
          },
          set checked($$value) {
            checked = $$value;
            $$settled = false;
          },
          get indeterminate() {
            return indeterminate;
          },
          set indeterminate($$value) {
            indeterminate = $$value;
            $$settled = false;
          },
          children,
          $$slots: { default: true }
        }
      ]));
    }
    $$payload2.out += `<!---->`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref, checked, indeterminate });
  pop();
}

export { Checkbox as C, Minus as M };
//# sourceMappingURL=checkbox-CMEX2hM2.js.map
