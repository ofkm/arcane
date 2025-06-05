import { p as push, y as props_id, k as spread_attributes, e as bind_props, a as pop, c as copy_payload, d as assign_payload, b as spread_props, u as derived } from './index3-DI1Ivwzg.js';
import { I as Icon } from './Icon-DbVCNmsR.js';
import { a as cn } from './button-CUTwDrbo.js';
import { c as createBitsAttrs, a as createId, w as watch, b as box, m as mergeProps, d as attachRef, g as getDataDisabled, n as getDataOrientation, e as getDataOpenClosed, u as getAriaDisabled, f as getAriaExpanded } from './create-id-DRrkdd12.js';
import { d as MenuCheckboxGroupContext, e as useMenuCheckboxItem } from './is-using-keyboard.svelte-DKF6IOQr.js';
import { n as noop, C as Context, S as SPACE, E as ENTER } from './noop-BrWcRgZY.js';
import { M as Minus } from './checkbox-CMEX2hM2.js';
import { C as Check } from './check-CkcwyHfy.js';
import { a as Presence_layer, b as afterTick } from './scroll-lock-C_EWKkAl.js';
import { C as Chevron_down } from './chevron-down-DOg7W4Qb.js';
import { u as useRovingFocus } from './use-roving-focus.svelte-Cnaf6bhO.js';

const accordionAttrs = createBitsAttrs({
  component: "accordion",
  parts: [
    "root",
    "trigger",
    "content",
    "item",
    "header"
  ]
});
class AccordionBaseState {
  opts;
  rovingFocusGroup;
  constructor(opts) {
    this.opts = opts;
    this.rovingFocusGroup = useRovingFocus({
      rootNode: this.opts.ref,
      candidateAttr: accordionAttrs.trigger,
      loop: this.opts.loop,
      orientation: this.opts.orientation
    });
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-orientation": getDataOrientation(this.opts.orientation.current),
    "data-disabled": getDataDisabled(this.opts.disabled.current),
    [accordionAttrs.root]: "",
    ...attachRef(this.opts.ref)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class AccordionSingleState extends AccordionBaseState {
  opts;
  isMulti = false;
  constructor(opts) {
    super(opts);
    this.opts = opts;
  }
  includesItem = (item) => this.opts.value.current === item;
  toggleItem = (item) => {
    this.opts.value.current = this.includesItem(item) ? "" : item;
  };
}
class AccordionMultiState extends AccordionBaseState {
  #value;
  isMulti = true;
  constructor(props) {
    super(props);
    this.#value = props.value;
  }
  includesItem = (item) => this.#value.current.includes(item);
  toggleItem = (item) => {
    this.#value.current = this.includesItem(item) ? this.#value.current.filter((v) => v !== item) : [...this.#value.current, item];
  };
}
class AccordionItemState {
  opts;
  root;
  #isActive = derived(() => this.root.includesItem(this.opts.value.current));
  get isActive() {
    return this.#isActive();
  }
  set isActive($$value) {
    return this.#isActive($$value);
  }
  #isDisabled = derived(() => this.opts.disabled.current || this.root.opts.disabled.current);
  get isDisabled() {
    return this.#isDisabled();
  }
  set isDisabled($$value) {
    return this.#isDisabled($$value);
  }
  constructor(opts) {
    this.opts = opts;
    this.root = opts.rootState;
  }
  updateValue = () => {
    this.root.toggleItem(this.opts.value.current);
  };
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-state": getDataOpenClosed(this.isActive),
    "data-disabled": getDataDisabled(this.isDisabled),
    "data-orientation": getDataOrientation(this.root.opts.orientation.current),
    [accordionAttrs.item]: "",
    ...attachRef(this.opts.ref)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class AccordionTriggerState {
  opts;
  itemState;
  #root;
  #isDisabled = derived(() => this.opts.disabled.current || this.itemState.opts.disabled.current || this.#root.opts.disabled.current);
  constructor(opts, itemState) {
    this.opts = opts;
    this.itemState = itemState;
    this.#root = itemState.root;
  }
  onclick = (e) => {
    if (this.#isDisabled() || e.button !== 0) {
      e.preventDefault();
      return;
    }
    this.itemState.updateValue();
  };
  onkeydown = (e) => {
    if (this.#isDisabled()) return;
    if (e.key === SPACE || e.key === ENTER) {
      e.preventDefault();
      this.itemState.updateValue();
      return;
    }
    this.#root.rovingFocusGroup.handleKeydown(this.opts.ref.current, e);
  };
  #props = derived(() => ({
    id: this.opts.id.current,
    disabled: this.#isDisabled(),
    "aria-expanded": getAriaExpanded(this.itemState.isActive),
    "aria-disabled": getAriaDisabled(this.#isDisabled()),
    "data-disabled": getDataDisabled(this.#isDisabled()),
    "data-state": getDataOpenClosed(this.itemState.isActive),
    "data-orientation": getDataOrientation(this.#root.opts.orientation.current),
    [accordionAttrs.trigger]: "",
    tabindex: 0,
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
class AccordionContentState {
  opts;
  item;
  #originalStyles = void 0;
  #isMountAnimationPrevented = false;
  #dimensions = { width: 0, height: 0 };
  #present = derived(() => this.opts.forceMount.current || this.item.isActive);
  get present() {
    return this.#present();
  }
  set present($$value) {
    return this.#present($$value);
  }
  constructor(opts, item) {
    this.opts = opts;
    this.item = item;
    this.#isMountAnimationPrevented = this.item.isActive;
    watch(
      [
        () => this.present,
        () => this.opts.ref.current
      ],
      this.#updateDimensions
    );
  }
  #updateDimensions = ([_, node]) => {
    if (!node) return;
    afterTick(() => {
      const element = this.opts.ref.current;
      if (!element) return;
      this.#originalStyles ??= {
        transitionDuration: element.style.transitionDuration,
        animationName: element.style.animationName
      };
      element.style.transitionDuration = "0s";
      element.style.animationName = "none";
      const rect = element.getBoundingClientRect();
      this.#dimensions = { width: rect.width, height: rect.height };
      if (!this.#isMountAnimationPrevented && this.#originalStyles) {
        element.style.transitionDuration = this.#originalStyles.transitionDuration;
        element.style.animationName = this.#originalStyles.animationName;
      }
    });
  };
  #snippetProps = derived(() => ({ open: this.item.isActive }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-state": getDataOpenClosed(this.item.isActive),
    "data-disabled": getDataDisabled(this.item.isDisabled),
    "data-orientation": getDataOrientation(this.item.root.opts.orientation.current),
    [accordionAttrs.content]: "",
    style: {
      "--bits-accordion-content-height": `${this.#dimensions.height}px`,
      "--bits-accordion-content-width": `${this.#dimensions.width}px`
    },
    ...attachRef(this.opts.ref)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class AccordionHeaderState {
  opts;
  item;
  constructor(opts, item) {
    this.opts = opts;
    this.item = item;
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "heading",
    "aria-level": this.opts.level.current,
    "data-heading-level": this.opts.level.current,
    "data-state": getDataOpenClosed(this.item.isActive),
    "data-orientation": getDataOrientation(this.item.root.opts.orientation.current),
    [accordionAttrs.header]: "",
    ...attachRef(this.opts.ref)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
const AccordionRootContext = new Context("Accordion.Root");
const AccordionItemContext = new Context("Accordion.Item");
function useAccordionRoot(props) {
  const { type, ...rest } = props;
  const rootState = type === "single" ? new AccordionSingleState(rest) : new AccordionMultiState(rest);
  return AccordionRootContext.set(rootState);
}
function useAccordionItem(props) {
  const rootState = AccordionRootContext.get();
  return AccordionItemContext.set(new AccordionItemState({ ...props, rootState }));
}
function useAccordionTrigger(props) {
  return new AccordionTriggerState(props, AccordionItemContext.get());
}
function useAccordionContent(props) {
  return new AccordionContentState(props, AccordionItemContext.get());
}
function useAccordionHeader(props) {
  return new AccordionHeaderState(props, AccordionItemContext.get());
}
function Accordion($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    disabled = false,
    children,
    child,
    type,
    value = void 0,
    ref = null,
    id = createId(uid),
    onValueChange = noop,
    loop = true,
    orientation = "vertical",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  function handleDefaultValue() {
    if (value !== void 0) return;
    value = type === "single" ? "" : [];
  }
  handleDefaultValue();
  watch.pre(() => value, () => {
    handleDefaultValue();
  });
  const rootState = useAccordionRoot({
    type,
    value: box.with(() => value, (v) => {
      value = v;
      onValueChange(v);
    }),
    id: box.with(() => id),
    disabled: box.with(() => disabled),
    loop: box.with(() => loop),
    orientation: box.with(() => orientation),
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
  bind_props($$props, { value, ref });
  pop();
}
function Accordion_item$1($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  const defaultId = createId(uid);
  let {
    id = defaultId,
    disabled = false,
    value = defaultId,
    children,
    child,
    ref = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const itemState = useAccordionItem({
    value: box.with(() => value),
    disabled: box.with(() => disabled),
    id: box.with(() => id),
    ref: box.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps(restProps, itemState.props);
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
function Accordion_header($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    id = createId(uid),
    level = 2,
    children,
    child,
    ref = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const headerState = useAccordionHeader({
    id: box.with(() => id),
    level: box.with(() => level),
    ref: box.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps(restProps, headerState.props);
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
function Accordion_trigger$1($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    disabled = false,
    ref = null,
    id = createId(uid),
    children,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const triggerState = useAccordionTrigger({
    disabled: box.with(() => disabled),
    id: box.with(() => id),
    ref: box.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps(restProps, triggerState.props);
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { props: mergedProps });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<button${spread_attributes({ type: "button", ...mergedProps }, null)}>`;
    children?.($$payload);
    $$payload.out += `<!----></button>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { ref });
  pop();
}
function Accordion_content$1($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    child,
    ref = null,
    id = createId(uid),
    forceMount = false,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const contentState = useAccordionContent({
    forceMount: box.with(() => forceMount),
    id: box.with(() => id),
    ref: box.with(() => ref, (v) => ref = v)
  });
  {
    let presence = function($$payload2, { present }) {
      const mergedProps = mergeProps(restProps, contentState.props, {
        hidden: forceMount ? void 0 : !present.current
      });
      if (child) {
        $$payload2.out += "<!--[-->";
        child($$payload2, {
          props: mergedProps,
          ...contentState.snippetProps
        });
        $$payload2.out += `<!---->`;
      } else {
        $$payload2.out += "<!--[!-->";
        $$payload2.out += `<div${spread_attributes({ ...mergedProps }, null)}>`;
        children?.($$payload2);
        $$payload2.out += `<!----></div>`;
      }
      $$payload2.out += `<!--]-->`;
    };
    Presence_layer($$payload, {
      forceMount: true,
      present: contentState.present,
      ref: contentState.opts.ref,
      presence
    });
  }
  bind_props($$props, { ref });
  pop();
}
function Menu_checkbox_item($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    child,
    children,
    ref = null,
    checked = false,
    id = createId(uid),
    onCheckedChange = noop,
    disabled = false,
    onSelect = noop,
    closeOnSelect = true,
    indeterminate = false,
    onIndeterminateChange = noop,
    value = "",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const group = MenuCheckboxGroupContext.getOr(null);
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
  const checkboxItemState = useMenuCheckboxItem(
    {
      checked: box.with(() => checked, (v) => {
        checked = v;
        onCheckedChange(v);
      }),
      id: box.with(() => id),
      disabled: box.with(() => disabled),
      onSelect: box.with(() => handleSelect),
      ref: box.with(() => ref, (v) => ref = v),
      closeOnSelect: box.with(() => closeOnSelect),
      indeterminate: box.with(() => indeterminate, (v) => {
        indeterminate = v;
        onIndeterminateChange(v);
      }),
      value: box.with(() => value)
    },
    group
  );
  function handleSelect(e) {
    onSelect(e);
    if (e.defaultPrevented) return;
    checkboxItemState.toggleChecked();
  }
  const mergedProps = mergeProps(restProps, checkboxItemState.props);
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { checked, indeterminate, props: mergedProps });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<div${spread_attributes({ ...mergedProps }, null)}>`;
    children?.($$payload, { checked, indeterminate });
    $$payload.out += `<!----></div>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { ref, checked, indeterminate });
  pop();
}
function Funnel($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "funnel" },
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
function Dropdown_menu_checkbox_item($$payload, $$props) {
  push();
  let {
    ref = null,
    checked = false,
    indeterminate = false,
    class: className,
    children: childrenProp,
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
        $$payload3.out += `<span class="absolute left-2 flex size-3.5 items-center justify-center">`;
        if (indeterminate2) {
          $$payload3.out += "<!--[-->";
          Minus($$payload3, { class: "size-4" });
        } else {
          $$payload3.out += "<!--[!-->";
          Check($$payload3, {
            class: cn("size-4", !checked2 && "text-transparent")
          });
        }
        $$payload3.out += `<!--]--></span> `;
        childrenProp?.($$payload3);
        $$payload3.out += `<!---->`;
      };
      Menu_checkbox_item($$payload2, spread_props([
        {
          class: cn("data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-disabled:pointer-events-none data-disabled:opacity-50", className)
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
function Accordion_content($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Accordion_content$1($$payload2, spread_props([
      {
        class: cn("data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm transition-all", className)
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
        children: ($$payload3) => {
          $$payload3.out += `<div class="pb-4 pt-0">`;
          children?.($$payload3);
          $$payload3.out += `<!----></div>`;
        },
        $$slots: { default: true }
      }
    ]));
    $$payload2.out += `<!---->`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
function Accordion_item($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Accordion_item$1($$payload2, spread_props([
      { class: cn("border-b", className) },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out += `<!---->`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
function Accordion_trigger($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    level = 3,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Accordion_header($$payload2, {
      level,
      class: "flex",
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Accordion_trigger$1($$payload3, spread_props([
          {
            class: cn("flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180", className)
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
            children: ($$payload4) => {
              children?.($$payload4);
              $$payload4.out += `<!----> `;
              Chevron_down($$payload4, {
                class: "size-4 shrink-0 transition-transform duration-200"
              });
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          }
        ]));
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!---->`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
const Root = Accordion;

export { Accordion_item as A, Dropdown_menu_checkbox_item as D, Funnel as F, Root as R, Accordion_trigger as a, Accordion_content as b };
//# sourceMappingURL=index13-BySTmDpe.js.map
