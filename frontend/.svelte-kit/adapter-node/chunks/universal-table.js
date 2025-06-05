import { o as derived, p as push, q as props_id, m as spread_attributes, t as bind_props, a as pop, k as escape_html, j as spread_props, f as clsx, u as copy_payload, v as assign_payload, d as attr_class, l as ensure_array_like, n as stringify } from "./index3.js";
import { createTable, getPaginationRowModel, getFilteredRowModel, getSortedRowModel, getCoreRowModel } from "@tanstack/table-core";
import "clsx";
import { c as cn, b as buttonVariants, B as Button, d as debounced } from "./button.js";
import { c as createBitsAttrs, a as attachRef, n as getDataOrientation, b as createId, d as box, m as mergeProps } from "./create-id.js";
import "style-to-object";
import { C as Context, S as SPACE, E as ENTER, d as END, H as HOME, n as noop } from "./noop.js";
import { g as getElemDirection, a as getDirectionalKeys } from "./get-directional-keys.js";
import { u as useId } from "./use-id.js";
import { I as Icon } from "./Icon.js";
import { C as Chevron_right } from "./chevron-right.js";
import { R as Root, S as Select_trigger, a as Select_content, b as Select_item } from "./index11.js";
import { I as Input } from "./input.js";
import { C as Checkbox } from "./checkbox.js";
import { C as Chevron_down } from "./chevron-down.js";
const paginationAttrs = createBitsAttrs({
  component: "pagination",
  parts: ["root", "page", "prev", "next"]
});
class PaginationRootState {
  opts;
  #totalPages = derived(() => {
    if (this.opts.count.current === 0) return 1;
    return Math.ceil(this.opts.count.current / this.opts.perPage.current);
  });
  get totalPages() {
    return this.#totalPages();
  }
  set totalPages($$value) {
    return this.#totalPages($$value);
  }
  #range = derived(() => {
    const start = (this.opts.page.current - 1) * this.opts.perPage.current;
    const end = Math.min(start + this.opts.perPage.current, this.opts.count.current);
    return { start: start + 1, end };
  });
  get range() {
    return this.#range();
  }
  set range($$value) {
    return this.#range($$value);
  }
  #pages = derived(() => getPageItems({
    page: this.opts.page.current,
    totalPages: this.totalPages,
    siblingCount: this.opts.siblingCount.current
  }));
  get pages() {
    return this.#pages();
  }
  set pages($$value) {
    return this.#pages($$value);
  }
  constructor(opts) {
    this.opts = opts;
  }
  setPage(page) {
    this.opts.page.current = page;
  }
  getPageTriggerNodes() {
    const node = this.opts.ref.current;
    if (!node) return [];
    return Array.from(node.querySelectorAll("[data-pagination-page]"));
  }
  getButtonNode(type) {
    const node = this.opts.ref.current;
    if (!node) return;
    return node.querySelector(paginationAttrs.selector(type));
  }
  #hasPrevPage = derived(() => this.opts.page.current > 1);
  get hasPrevPage() {
    return this.#hasPrevPage();
  }
  set hasPrevPage($$value) {
    return this.#hasPrevPage($$value);
  }
  #hasNextPage = derived(() => this.opts.page.current < this.totalPages);
  get hasNextPage() {
    return this.#hasNextPage();
  }
  set hasNextPage($$value) {
    return this.#hasNextPage($$value);
  }
  prevPage() {
    this.opts.page.current = Math.max(this.opts.page.current - 1, 1);
  }
  nextPage() {
    this.opts.page.current = Math.min(this.opts.page.current + 1, this.totalPages);
  }
  #snippetProps = derived(() => ({
    pages: this.pages,
    range: this.range,
    currentPage: this.opts.page.current
  }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-orientation": getDataOrientation(this.opts.orientation.current),
    [paginationAttrs.root]: "",
    ...attachRef(this.opts.ref)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class PaginationPageState {
  opts;
  root;
  #isSelected = derived(() => this.opts.page.current.value === this.root.opts.page.current);
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.onclick = this.onclick.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
  }
  onclick(e) {
    if (this.opts.disabled.current) return;
    if (e.button !== 0) return;
    this.root.setPage(this.opts.page.current.value);
  }
  onkeydown(e) {
    if (e.key === SPACE || e.key === ENTER) {
      e.preventDefault();
      this.root.setPage(this.opts.page.current.value);
    } else {
      handleTriggerKeydown(e, this.opts.ref.current, this.root);
    }
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "aria-label": `Page ${this.opts.page.current.value}`,
    "data-value": `${this.opts.page.current.value}`,
    "data-selected": this.#isSelected() ? "" : void 0,
    [paginationAttrs.page]: "",
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
class PaginationButtonState {
  opts;
  root;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.onclick = this.onclick.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
  }
  #action() {
    this.opts.type === "prev" ? this.root.prevPage() : this.root.nextPage();
  }
  #isDisabled = derived(() => {
    if (this.opts.disabled.current) return true;
    if (this.opts.type === "prev") return !this.root.hasPrevPage;
    if (this.opts.type === "next") return !this.root.hasNextPage;
    return false;
  });
  onclick(e) {
    if (this.opts.disabled.current) return;
    if (e.button !== 0) return;
    this.#action();
  }
  onkeydown(e) {
    if (e.key === SPACE || e.key === ENTER) {
      e.preventDefault();
      this.#action();
    } else {
      handleTriggerKeydown(e, this.opts.ref.current, this.root);
    }
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    [paginationAttrs[this.opts.type]]: "",
    disabled: this.#isDisabled(),
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
function handleTriggerKeydown(e, node, root) {
  if (!node || !root.opts.ref.current) return;
  const items = root.getPageTriggerNodes();
  const nextButton = root.getButtonNode("next");
  const prevButton = root.getButtonNode("prev");
  if (prevButton) {
    items.unshift(prevButton);
  }
  if (nextButton) {
    items.push(nextButton);
  }
  const currentIndex = items.indexOf(node);
  const dir = getElemDirection(root.opts.ref.current);
  const { nextKey, prevKey } = getDirectionalKeys(dir, root.opts.orientation.current);
  const loop = root.opts.loop.current;
  const keyToIndex = {
    [nextKey]: currentIndex + 1,
    [prevKey]: currentIndex - 1,
    [HOME]: 0,
    [END]: items.length - 1
  };
  let itemIndex = keyToIndex[e.key];
  if (itemIndex === void 0) return;
  e.preventDefault();
  if (itemIndex < 0 && loop) {
    itemIndex = items.length - 1;
  } else if (itemIndex === items.length && loop) {
    itemIndex = 0;
  }
  const itemToFocus = items[itemIndex];
  if (!itemToFocus) return;
  itemToFocus.focus();
}
function getPageItems({ page = 1, totalPages, siblingCount = 1 }) {
  const pageItems = [];
  const pagesToShow = /* @__PURE__ */ new Set([1, totalPages]);
  const firstItemWithSiblings = 3 + siblingCount;
  const lastItemWithSiblings = totalPages - 2 - siblingCount;
  if (firstItemWithSiblings > lastItemWithSiblings) {
    for (let i = 2; i <= totalPages - 1; i++) {
      pagesToShow.add(i);
    }
  } else if (page < firstItemWithSiblings) {
    for (let i = 2; i <= Math.min(firstItemWithSiblings, totalPages); i++) {
      pagesToShow.add(i);
    }
  } else if (page > lastItemWithSiblings) {
    for (let i = totalPages - 1; i >= Math.max(lastItemWithSiblings, 2); i--) {
      pagesToShow.add(i);
    }
  } else {
    for (let i = Math.max(page - siblingCount, 2); i <= Math.min(page + siblingCount, totalPages); i++) {
      pagesToShow.add(i);
    }
  }
  function addPage(value) {
    pageItems.push({ type: "page", value, key: `page-${value}` });
  }
  function addEllipsis() {
    const id = useId();
    pageItems.push({ type: "ellipsis", key: `ellipsis-${id}` });
  }
  let lastNumber = 0;
  for (const p of Array.from(pagesToShow).sort((a, b) => a - b)) {
    if (p - lastNumber > 1) {
      addEllipsis();
    }
    addPage(p);
    lastNumber = p;
  }
  return pageItems;
}
const PaginationRootContext = new Context("Pagination.Root");
function usePaginationRoot(props) {
  return PaginationRootContext.set(new PaginationRootState(props));
}
function usePaginationPage(props) {
  return new PaginationPageState(props, PaginationRootContext.get());
}
function usePaginationButton(props) {
  return new PaginationButtonState(props, PaginationRootContext.get());
}
function Pagination$1($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    id = createId(uid),
    count,
    perPage = 1,
    page = 1,
    ref = null,
    siblingCount = 1,
    onPageChange = noop,
    loop = false,
    orientation = "horizontal",
    child,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const rootState = usePaginationRoot({
    id: box.with(() => id),
    count: box.with(() => count),
    perPage: box.with(() => perPage),
    page: box.with(() => page, (v) => {
      page = v;
      onPageChange?.(v);
    }),
    loop: box.with(() => loop),
    siblingCount: box.with(() => siblingCount),
    orientation: box.with(() => orientation),
    ref: box.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps(restProps, rootState.props);
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { props: mergedProps, ...rootState.snippetProps });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<div${spread_attributes({ ...mergedProps }, null)}>`;
    children?.($$payload, rootState.snippetProps);
    $$payload.out += `<!----></div>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { page, ref });
  pop();
}
function Pagination_prev_button$1($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    id = createId(uid),
    child,
    children,
    ref = null,
    type = "button",
    disabled = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const prevButtonState = usePaginationButton({
    type: "prev",
    id: box.with(() => id),
    ref: box.with(() => ref, (v) => ref = v),
    disabled: box.with(() => Boolean(disabled))
  });
  const mergedProps = mergeProps(restProps, prevButtonState.props, { type });
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { props: mergedProps });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<button${spread_attributes({ ...mergedProps }, null)}>`;
    children?.($$payload);
    $$payload.out += `<!----></button>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { ref });
  pop();
}
function Pagination_next_button$1($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    id = createId(uid),
    child,
    children,
    ref = null,
    type = "button",
    disabled = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const nextButtonState = usePaginationButton({
    type: "next",
    id: box.with(() => id),
    ref: box.with(() => ref, (v) => ref = v),
    disabled: box.with(() => Boolean(disabled))
  });
  const mergedProps = mergeProps(restProps, nextButtonState.props, { type });
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { props: mergedProps });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<button${spread_attributes({ ...mergedProps }, null)}>`;
    children?.($$payload);
    $$payload.out += `<!----></button>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { ref });
  pop();
}
function Pagination_page($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    id = createId(uid),
    page,
    child,
    children,
    type = "button",
    ref = null,
    disabled = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const pageState = usePaginationPage({
    id: box.with(() => id),
    page: box.with(() => page),
    ref: box.with(() => ref, (v) => ref = v),
    disabled: box.with(() => Boolean(disabled))
  });
  const mergedProps = mergeProps(restProps, pageState.props, { type });
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { props: mergedProps });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<button${spread_attributes({ ...mergedProps }, null)}>`;
    if (children) {
      $$payload.out += "<!--[-->";
      children?.($$payload);
      $$payload.out += `<!---->`;
    } else {
      $$payload.out += "<!--[!-->";
      $$payload.out += `${escape_html(page.value)}`;
    }
    $$payload.out += `<!--]--></button>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { ref });
  pop();
}
function Chevron_left($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [["path", { "d": "m15 18-6-6 6-6" }]];
  Icon($$payload, spread_props([
    { name: "chevron-left" },
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
function Ellipsis($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "circle",
      { "cx": "12", "cy": "12", "r": "1" }
    ],
    [
      "circle",
      { "cx": "19", "cy": "12", "r": "1" }
    ],
    ["circle", { "cx": "5", "cy": "12", "r": "1" }]
  ];
  Icon($$payload, spread_props([
    { name: "ellipsis" },
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
class RenderComponentConfig {
  component;
  props;
  constructor(component, props = {}) {
    this.component = component;
    this.props = props;
  }
}
class RenderSnippetConfig {
  snippet;
  params;
  constructor(snippet, params) {
    this.snippet = snippet;
    this.params = params;
  }
}
function Flex_render($$payload, $$props) {
  push();
  let { content, context } = $$props;
  if (typeof content === "string") {
    $$payload.out += "<!--[-->";
    $$payload.out += `${escape_html(content)}`;
  } else if (content instanceof Function) {
    $$payload.out += "<!--[1-->";
    const result = content(context);
    if (result instanceof RenderComponentConfig) {
      $$payload.out += "<!--[-->";
      const { component: Component, props } = result;
      $$payload.out += `<!---->`;
      Component($$payload, spread_props([props]));
      $$payload.out += `<!---->`;
    } else if (result instanceof RenderSnippetConfig) {
      $$payload.out += "<!--[1-->";
      const { snippet, params } = result;
      snippet($$payload, params);
      $$payload.out += `<!---->`;
    } else {
      $$payload.out += "<!--[!-->";
      $$payload.out += `${escape_html(result)}`;
    }
    $$payload.out += `<!--]-->`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function createSvelteTable(options) {
  const resolvedOptions = mergeObjects(
    {
      state: {},
      onStateChange() {
      },
      renderFallbackValue: null,
      mergeOptions: (defaultOptions, options2) => {
        return mergeObjects(defaultOptions, options2);
      }
    },
    options
  );
  const table = createTable(resolvedOptions);
  let state = table.initialState;
  function updateOptions() {
    table.setOptions((prev) => {
      return mergeObjects(prev, options, {
        state: mergeObjects(state, options.state || {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStateChange: (updater) => {
          if (updater instanceof Function) state = updater(state);
          else state = mergeObjects(state, updater);
          options.onStateChange?.(updater);
        }
      });
    });
  }
  updateOptions();
  return table;
}
function mergeObjects(...sources) {
  const target = {};
  for (let i = 0; i < sources.length; i++) {
    let source = sources[i];
    if (typeof source === "function") source = source();
    if (source) {
      const descriptors = Object.getOwnPropertyDescriptors(source);
      for (const key in descriptors) {
        if (key in target) continue;
        Object.defineProperty(target, key, {
          enumerable: true,
          get() {
            for (let i2 = sources.length - 1; i2 >= 0; i2--) {
              let s = sources[i2];
              if (typeof s === "function") s = s();
              const v = (s || {})[key];
              if (v !== void 0) return v;
            }
          }
        });
      }
    }
  }
  return target;
}
function Table($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<div class="relative w-full overflow-auto"><table${spread_attributes(
    {
      class: clsx(cn("w-full caption-bottom text-sm table-fixed", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></table></div>`;
  bind_props($$props, { ref });
  pop();
}
function Table_body($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<tbody${spread_attributes(
    {
      class: clsx(cn("[&_tr:last-child]:border-0", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></tbody>`;
  bind_props($$props, { ref });
  pop();
}
function Table_cell($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<td${spread_attributes(
    {
      class: clsx(cn("p-4 align-middle [&:has([role=checkbox])]:pr-0 truncate overflow-hidden whitespace-nowrap text-ellipsis", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></td>`;
  bind_props($$props, { ref });
  pop();
}
function Table_head($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<th${spread_attributes(
    {
      class: clsx(cn("text-muted-foreground h-12 px-4 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></th>`;
  bind_props($$props, { ref });
  pop();
}
function Table_header($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<thead${spread_attributes(
    {
      class: clsx(cn("[&_tr]:border-b", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></thead>`;
  bind_props($$props, { ref });
  pop();
}
function Table_row($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<tr${spread_attributes(
    {
      class: clsx(cn("hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></tr>`;
  bind_props($$props, { ref });
  pop();
}
function Pagination($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    count = 0,
    perPage = 10,
    page = 1,
    siblingCount = 1,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Pagination$1($$payload2, spread_props([
      {
        class: cn("mx-auto flex w-full flex-col items-center", className),
        count,
        perPage,
        siblingCount
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
        get page() {
          return page;
        },
        set page($$value) {
          page = $$value;
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
  bind_props($$props, { ref, page });
  pop();
}
function Pagination_content($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<ul${spread_attributes(
    {
      class: clsx(cn("flex flex-row items-center gap-1", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></ul>`;
  bind_props($$props, { ref });
  pop();
}
function Pagination_item($$payload, $$props) {
  push();
  let {
    ref = null,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<li${spread_attributes({ ...restProps }, null)}>`;
  children?.($$payload);
  $$payload.out += `<!----></li>`;
  bind_props($$props, { ref });
  pop();
}
function Pagination_link($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    size = "sm",
    isActive = false,
    page,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  function Fallback2($$payload2) {
    $$payload2.out += `<!---->${escape_html(page.value)}`;
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Pagination_page($$payload2, spread_props([
      {
        page,
        class: cn(buttonVariants({ variant: isActive ? "outline" : "ghost", size }), className),
        children: children || Fallback2
      },
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
function Fallback$1($$payload) {
  Chevron_left($$payload, { class: "size-4" });
}
function Pagination_prev_button($$payload, $$props) {
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
    Pagination_prev_button$1($$payload2, spread_props([
      {
        class: cn(buttonVariants({ variant: "ghost", class: "gap-1 pl-2.5" }), className),
        children: children || Fallback$1
      },
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
function Fallback($$payload) {
  Chevron_right($$payload, { class: "size-4" });
}
function Pagination_next_button($$payload, $$props) {
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
    Pagination_next_button$1($$payload2, spread_props([
      {
        class: cn(buttonVariants({ variant: "ghost", class: "gap-1 pr-2.5" }), className),
        children: children || Fallback
      },
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
function Pagination_ellipsis($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<span${spread_attributes(
    {
      "aria-hidden": "true",
      class: clsx(cn("flex size-9 items-center justify-center", className)),
      ...restProps
    },
    null
  )}>`;
  Ellipsis($$payload, { class: "size-4" });
  $$payload.out += `<!----> <span class="sr-only">More pages</span></span>`;
  bind_props($$props, { ref });
  pop();
}
function Universal_table($$payload, $$props) {
  push();
  let {
    data,
    columns,
    idKey,
    features = {},
    display = {},
    pagination = {},
    sort = {},
    selectedIds = [],
    rows,
    onPageSizeChange = void 0
  } = $$props;
  const {
    sorting: enableSorting = true,
    filtering: enableFiltering = true,
    selection: enableSelection = true
  } = features;
  const {
    pageSize: initialPageSize = 10,
    pageSizeOptions = [10, 20, 50, 100],
    itemsPerPageLabel = "Items per page"
  } = pagination;
  const {
    filterPlaceholder = "Search...",
    noResultsMessage = "No results found",
    isDashboardTable = false,
    class: className = ""
  } = display;
  const { defaultSort } = sort;
  let pageSize = Math.max(1, initialPageSize);
  let pageIndex = 0;
  let currentPage = 1;
  let sorting = defaultSort ? [defaultSort] : [];
  let columnFilters = [];
  let globalFilter = "";
  let rowSelection = {};
  const debouncedFilter = debounced(
    (value) => {
      table.setGlobalFilter(value);
    },
    300
  );
  const table = createSvelteTable({
    get data() {
      return data;
    },
    columns,
    getRowId: idKey ? (originalRow) => String(originalRow[idKey]) : void 0,
    getCoreRowModel: getCoreRowModel(),
    ...enableSorting && { getSortedRowModel: getSortedRowModel() },
    ...enableFiltering && { getFilteredRowModel: getFilteredRowModel() },
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: enableSelection,
    state: {
      get pagination() {
        return { pageIndex, pageSize };
      },
      get sorting() {
        return sorting;
      },
      get columnFilters() {
        return columnFilters;
      },
      get globalFilter() {
        return globalFilter;
      },
      get rowSelection() {
        return rowSelection;
      }
    },
    onSortingChange: (updater) => {
      sorting = typeof updater === "function" ? updater(sorting) : updater;
    },
    onColumnFiltersChange: (updater) => {
      columnFilters = typeof updater === "function" ? updater(columnFilters) : updater;
    },
    onGlobalFilterChange: (value) => {
      globalFilter = value ?? "";
      pageIndex = 0;
      currentPage = 1;
    },
    onRowSelectionChange: (updater) => {
      if (!enableSelection) return;
      const newSelection = typeof updater === "function" ? updater(rowSelection) : updater;
      if (JSON.stringify(newSelection) !== JSON.stringify(rowSelection)) {
        rowSelection = newSelection;
        const newSelectedIds = Object.entries(newSelection).filter(([_, selected]) => selected).map(([id]) => id);
        if (JSON.stringify(selectedIds.sort()) !== JSON.stringify(newSelectedIds.sort())) {
          selectedIds = newSelectedIds;
        }
      }
    }
  });
  const validPageSizeOptions = pageSizeOptions.filter((size) => size > 0).sort((a, b) => a - b);
  const shouldShowPagination = !isDashboardTable && (table.getPageCount() > 1 || validPageSizeOptions.length > 1);
  const shouldShowFiltering = enableFiltering && !isDashboardTable;
  const allRowsSelected = table.getIsAllPageRowsSelected() && table.getRowModel().rows.length > 0;
  const filteredRowCount = table.getFilteredRowModel().rows.length;
  function handleFilterChange(value) {
    debouncedFilter(value);
  }
  function handlePageSizeChange(size) {
    const sizeNumber = typeof size === "string" ? parseInt(size, 10) : size;
    if (!isNaN(sizeNumber) && sizeNumber > 0) {
      pageSize = sizeNumber;
      table.setPageSize(sizeNumber);
      pageIndex = 0;
      currentPage = 1;
      onPageSizeChange?.(sizeNumber);
    }
  }
  function handleSelectAllChange(checked) {
    table.toggleAllPageRowsSelected(checked);
  }
  function handleRowSelectionChange(row, checked) {
    const isDisabled = row.original?.isExternal ?? false;
    if (!isDisabled) {
      row.toggleSelected(checked);
    }
  }
  function handleSortChange(header) {
    header.column.toggleSorting(header.column.getIsSorted() === "asc");
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div${attr_class(clsx(cn("space-y-4", className, isDashboardTable && "dashboard-table")))}>`;
    if (shouldShowFiltering) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<div class="flex items-center">`;
      Input($$payload2, {
        placeholder: filterPlaceholder,
        value: globalFilter,
        oninput: (e) => handleFilterChange(e.currentTarget.value),
        class: "max-w-sm"
      });
      $$payload2.out += `<!----></div>`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> <div${attr_class(clsx(cn("rounded-md border", isDashboardTable && "border-none rounded-none")))}><!---->`;
    Table($$payload2, {
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Table_header($$payload3, {
          children: ($$payload4) => {
            const each_array = ensure_array_like(table.getHeaderGroups());
            $$payload4.out += `<!--[-->`;
            for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
              let headerGroup = each_array[$$index_1];
              $$payload4.out += `<!---->`;
              Table_row($$payload4, {
                children: ($$payload5) => {
                  const each_array_1 = ensure_array_like(headerGroup.headers);
                  if (enableSelection) {
                    $$payload5.out += "<!--[-->";
                    $$payload5.out += `<!---->`;
                    Table_head($$payload5, {
                      class: "size-12",
                      children: ($$payload6) => {
                        Checkbox($$payload6, {
                          checked: allRowsSelected,
                          onCheckedChange: handleSelectAllChange,
                          "aria-label": "Select all rows"
                        });
                      },
                      $$slots: { default: true }
                    });
                    $$payload5.out += `<!---->`;
                  } else {
                    $$payload5.out += "<!--[!-->";
                  }
                  $$payload5.out += `<!--]--> <!--[-->`;
                  for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
                    let header = each_array_1[$$index];
                    $$payload5.out += `<!---->`;
                    Table_head($$payload5, {
                      children: ($$payload6) => {
                        if (!header.isPlaceholder) {
                          $$payload6.out += "<!--[-->";
                          if (header.column.getCanSort()) {
                            $$payload6.out += "<!--[-->";
                            Button($$payload6, {
                              variant: "ghost",
                              class: "flex items-center p-0 hover:bg-transparent",
                              onclick: () => handleSortChange(header),
                              "aria-label": `Sort by ${stringify(header.column.columnDef.header)}`,
                              children: ($$payload7) => {
                                Flex_render($$payload7, {
                                  content: header.column.columnDef.header,
                                  context: header.getContext()
                                });
                                $$payload7.out += `<!----> `;
                                if (header.column.getIsSorted()) {
                                  $$payload7.out += "<!--[-->";
                                  Chevron_down($$payload7, {
                                    class: cn("ml-2 size-4 transition-transform", header.column.getIsSorted() === "asc" && "rotate-180")
                                  });
                                } else {
                                  $$payload7.out += "<!--[!-->";
                                }
                                $$payload7.out += `<!--]-->`;
                              },
                              $$slots: { default: true }
                            });
                          } else {
                            $$payload6.out += "<!--[!-->";
                            Flex_render($$payload6, {
                              content: header.column.columnDef.header,
                              context: header.getContext()
                            });
                          }
                          $$payload6.out += `<!--]-->`;
                        } else {
                          $$payload6.out += "<!--[!-->";
                        }
                        $$payload6.out += `<!--]-->`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload5.out += `<!---->`;
                  }
                  $$payload5.out += `<!--]-->`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            }
            $$payload4.out += `<!--]-->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Table_body($$payload3, {
          children: ($$payload4) => {
            if (table.getRowModel().rows.length > 0) {
              $$payload4.out += "<!--[-->";
              const each_array_2 = ensure_array_like(table.getRowModel().rows);
              $$payload4.out += `<!--[-->`;
              for (let $$index_3 = 0, $$length = each_array_2.length; $$index_3 < $$length; $$index_3++) {
                let row = each_array_2[$$index_3];
                const isDisabled = row.original?.isExternal ?? false;
                $$payload4.out += `<!---->`;
                Table_row($$payload4, {
                  "data-state": row.getIsSelected() ? "selected" : void 0,
                  children: ($$payload5) => {
                    if (enableSelection) {
                      $$payload5.out += "<!--[-->";
                      $$payload5.out += `<!---->`;
                      Table_cell($$payload5, {
                        class: "size-12",
                        children: ($$payload6) => {
                          Checkbox($$payload6, {
                            checked: row.getIsSelected(),
                            disabled: isDisabled,
                            onCheckedChange: (checked) => handleRowSelectionChange(row, !!checked),
                            "aria-label": "Select row"
                          });
                        },
                        $$slots: { default: true }
                      });
                      $$payload5.out += `<!---->`;
                    } else {
                      $$payload5.out += "<!--[!-->";
                    }
                    $$payload5.out += `<!--]--> `;
                    if (rows) {
                      $$payload5.out += "<!--[-->";
                      rows($$payload5, { item: row.original, index: row.index });
                      $$payload5.out += `<!---->`;
                    } else {
                      $$payload5.out += "<!--[!-->";
                      const each_array_3 = ensure_array_like(row.getVisibleCells());
                      $$payload5.out += `<!--[-->`;
                      for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
                        let cell = each_array_3[$$index_2];
                        $$payload5.out += `<!---->`;
                        Table_cell($$payload5, {
                          class: "w-32",
                          children: ($$payload6) => {
                            Flex_render($$payload6, {
                              content: cell.column.columnDef.cell,
                              context: cell.getContext()
                            });
                          },
                          $$slots: { default: true }
                        });
                        $$payload5.out += `<!---->`;
                      }
                      $$payload5.out += `<!--]-->`;
                    }
                    $$payload5.out += `<!--]-->`;
                  },
                  $$slots: { default: true }
                });
                $$payload4.out += `<!---->`;
              }
              $$payload4.out += `<!--]-->`;
            } else {
              $$payload4.out += "<!--[!-->";
              $$payload4.out += `<!---->`;
              Table_row($$payload4, {
                children: ($$payload5) => {
                  $$payload5.out += `<!---->`;
                  Table_cell($$payload5, {
                    colspan: enableSelection ? columns.length + 1 : columns.length,
                    class: "text-center size-24",
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(noResultsMessage)}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!---->`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            }
            $$payload4.out += `<!--]-->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div> `;
    if (shouldShowPagination) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<div class="flex flex-col sm:flex-row items-center justify-between gap-4">`;
      if (validPageSizeOptions.length > 1) {
        $$payload2.out += "<!--[-->";
        $$payload2.out += `<div class="flex items-center gap-4"><span class="text-sm whitespace-nowrap">${escape_html(itemsPerPageLabel)}</span> <!---->`;
        Root($$payload2, {
          type: "single",
          value: pageSize.toString(),
          onValueChange: handlePageSizeChange,
          children: ($$payload3) => {
            $$payload3.out += `<!---->`;
            Select_trigger($$payload3, {
              class: "h-8 w-[70px]",
              "aria-label": "Items per page",
              children: ($$payload4) => {
                $$payload4.out += `<span>${escape_html(pageSize)}</span>`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> <!---->`;
            Select_content($$payload3, {
              children: ($$payload4) => {
                const each_array_4 = ensure_array_like(validPageSizeOptions);
                $$payload4.out += `<!--[-->`;
                for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
                  let size = each_array_4[$$index_4];
                  $$payload4.out += `<!---->`;
                  Select_item($$payload4, {
                    value: size.toString(),
                    children: ($$payload5) => {
                      $$payload5.out += `<!---->${escape_html(size)}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload4.out += `<!---->`;
                }
                $$payload4.out += `<!--]-->`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!----></div>`;
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--> <div class="ml-auto"><!---->`;
      {
        let children = function($$payload3, { pages, currentPage: paginationCurrentPage }) {
          $$payload3.out += `<!---->`;
          Pagination_content($$payload3, {
            children: ($$payload4) => {
              const each_array_5 = ensure_array_like(pages);
              $$payload4.out += `<!---->`;
              Pagination_item($$payload4, {
                children: ($$payload5) => {
                  $$payload5.out += `<!---->`;
                  Pagination_prev_button($$payload5, {});
                  $$payload5.out += `<!---->`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> <!--[-->`;
              for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
                let page = each_array_5[$$index_5];
                if (page.type === "ellipsis") {
                  $$payload4.out += "<!--[-->";
                  $$payload4.out += `<!---->`;
                  Pagination_item($$payload4, {
                    children: ($$payload5) => {
                      $$payload5.out += `<!---->`;
                      Pagination_ellipsis($$payload5, {});
                      $$payload5.out += `<!---->`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload4.out += `<!---->`;
                } else {
                  $$payload4.out += "<!--[!-->";
                  $$payload4.out += `<!---->`;
                  Pagination_item($$payload4, {
                    children: ($$payload5) => {
                      $$payload5.out += `<!---->`;
                      Pagination_link($$payload5, {
                        page,
                        isActive: paginationCurrentPage === page.value,
                        children: ($$payload6) => {
                          $$payload6.out += `<!---->${escape_html(page.value)}`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload5.out += `<!---->`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload4.out += `<!---->`;
                }
                $$payload4.out += `<!--]-->`;
              }
              $$payload4.out += `<!--]--> <!---->`;
              Pagination_item($$payload4, {
                children: ($$payload5) => {
                  $$payload5.out += `<!---->`;
                  Pagination_next_button($$payload5, {});
                  $$payload5.out += `<!---->`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        };
        Pagination($$payload2, {
          count: filteredRowCount,
          perPage: pageSize,
          get page() {
            return currentPage;
          },
          set page($$value) {
            currentPage = $$value;
            $$settled = false;
          },
          children,
          $$slots: { default: true }
        });
      }
      $$payload2.out += `<!----></div></div>`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--></div>`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { selectedIds, onPageSizeChange });
  pop();
}
export {
  Ellipsis as E,
  Table_cell as T,
  Universal_table as U
};
