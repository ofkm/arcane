import { p as push, j as spread_props, a as pop, m as spread_attributes, f as clsx$1, t as bind_props, c as hasContext, g as getContext, s as setContext, o as derived, u as copy_payload, v as assign_payload, l as ensure_array_like, k as escape_html } from "../../../../chunks/index3.js";
import { C as Card } from "../../../../chunks/card.js";
import { a as Card_header, b as Card_title, C as Card_content } from "../../../../chunks/card-title.js";
import { C as Card_description } from "../../../../chunks/card-description.js";
import { c as cn, B as Button, b as buttonVariants } from "../../../../chunks/button.js";
import { B as Breadcrumb, a as Breadcrumb_list, b as Breadcrumb_item, c as Breadcrumb_link, d as Breadcrumb_separator, e as Breadcrumb_page } from "../../../../chunks/breadcrumb-page.js";
import { clsx } from "clsx";
import { I as Input } from "../../../../chunks/input.js";
import { L as Label } from "../../../../chunks/label.js";
import { g as goto, i as invalidateAll } from "../../../../chunks/client.js";
import { a as toast } from "../../../../chunks/Toaster.svelte_svelte_type_style_lang.js";
import { Y as Yaml_editor, E as Env_editor } from "../../../../chunks/env-editor.js";
import { S as StackAPIService } from "../../../../chunks/stack-api-service.js";
import { t as tryCatch } from "../../../../chunks/try-catch.js";
import { h as handleApiResultWithCallbacks } from "../../../../chunks/api.util.js";
import { d as defaultEnvTemplate, a as defaultComposeTemplate } from "../../../../chunks/constants.js";
import { A as Arcane_button } from "../../../../chunks/arcane-button.js";
import { T as Textarea } from "../../../../chunks/textarea.js";
import { D as Dropdown_card } from "../../../../chunks/dropdown-card.js";
import { i as isClassValue, s as styleToString, w as watch$1, b as box } from "../../../../chunks/watch.svelte.js";
import parse from "style-to-object";
import { c as createSubscriber } from "../../../../chunks/index-server.js";
import { t as tick } from "../../../../chunks/use-id.js";
import { s as snapshot } from "../../../../chunks/get-directional-keys.js";
import { I as Icon } from "../../../../chunks/Icon.js";
import { R as Root, D as Dialog_content, a as Dialog_header, b as Dialog_title, c as Dialog_footer } from "../../../../chunks/index7.js";
import { B as Badge } from "../../../../chunks/badge.js";
import "../../../../chunks/alert.js";
import { B as BaseAPIService } from "../../../../chunks/api-service.js";
import { F as File_text } from "../../../../chunks/file-text.js";
import { D as Dialog_description } from "../../../../chunks/dialog-description.js";
import { F as Folder_open, C as Copy } from "../../../../chunks/folder-open.js";
import { S as Settings } from "../../../../chunks/settings.js";
import { L as Loader_circle } from "../../../../chunks/loader-circle.js";
import { G as Globe } from "../../../../chunks/globe.js";
import { D as Download } from "../../../../chunks/play.js";
import { D as Dropdown_menu_content, M as Menu, a as Menu_trigger } from "../../../../chunks/is-using-keyboard.svelte.js";
import { T as Terminal } from "../../../../chunks/terminal.js";
import { F as File_stack } from "../../../../chunks/file-stack.js";
import { S as Send } from "../../../../chunks/send.js";
import { C as Chevron_down } from "../../../../chunks/chevron-down.js";
import { b as Portal } from "../../../../chunks/scroll-lock.js";
import { M as Menu_item } from "../../../../chunks/menu-item.js";
import { M as Menu_separator } from "../../../../chunks/menu-separator.js";
import { A as Arrow_left } from "../../../../chunks/arrow-left.js";
function composeHandlers(...handlers) {
  return function(e) {
    for (const handler of handlers) {
      if (!handler)
        continue;
      if (e.defaultPrevented)
        return;
      if (typeof handler === "function") {
        handler.call(this, e);
      } else {
        handler.current?.call(this, e);
      }
    }
  };
}
const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char))
    return void 0;
  return char !== char.toLowerCase();
}
function splitByCase(str) {
  const parts = [];
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = STR_SPLITTERS.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function pascalCase(str) {
  if (!str)
    return "";
  return splitByCase(str).map((p) => upperFirst(p)).join("");
}
function camelCase(str) {
  return lowerFirst(pascalCase(str || ""));
}
function upperFirst(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : "";
}
function lowerFirst(str) {
  return str ? str[0].toLowerCase() + str.slice(1) : "";
}
function cssToStyleObj(css) {
  if (!css)
    return {};
  const styleObj = {};
  function iterator(name, value) {
    if (name.startsWith("-moz-") || name.startsWith("-webkit-") || name.startsWith("-ms-") || name.startsWith("-o-")) {
      styleObj[pascalCase(name)] = value;
      return;
    }
    if (name.startsWith("--")) {
      styleObj[name] = value;
      return;
    }
    styleObj[camelCase(name)] = value;
  }
  parse(css, iterator);
  return styleObj;
}
function executeCallbacks(...callbacks) {
  return (...args) => {
    for (const callback of callbacks) {
      if (typeof callback === "function") {
        callback(...args);
      }
    }
  };
}
function addEventListener(target, event, handler, options) {
  const events = Array.isArray(event) ? event : [event];
  events.forEach((_event) => target.addEventListener(_event, handler, options));
  return () => {
    events.forEach((_event) => target.removeEventListener(_event, handler, options));
  };
}
function isEventHandler(key) {
  return key.length > 2 && key.startsWith("on") && key[2] === key[2]?.toLowerCase();
}
function mergeProps(...args) {
  const result = { ...args[0] };
  for (let i = 1; i < args.length; i++) {
    const props = args[i];
    for (const key in props) {
      const a = result[key];
      const b = props[key];
      const aIsFunction = typeof a === "function";
      const bIsFunction = typeof b === "function";
      if (aIsFunction && typeof bIsFunction && isEventHandler(key)) {
        const aHandler = a;
        const bHandler = b;
        result[key] = composeHandlers(aHandler, bHandler);
      } else if (aIsFunction && bIsFunction) {
        result[key] = executeCallbacks(a, b);
      } else if (key === "class") {
        const aIsClassValue = isClassValue(a);
        const bIsClassValue = isClassValue(b);
        if (aIsClassValue && bIsClassValue) {
          result[key] = clsx(a, b);
        } else if (aIsClassValue) {
          result[key] = clsx(a);
        } else if (bIsClassValue) {
          result[key] = clsx(b);
        }
      } else if (key === "style") {
        const aIsObject = typeof a === "object";
        const bIsObject = typeof b === "object";
        const aIsString = typeof a === "string";
        const bIsString = typeof b === "string";
        if (aIsObject && bIsObject) {
          result[key] = { ...a, ...b };
        } else if (aIsObject && bIsString) {
          const parsedStyle = cssToStyleObj(b);
          result[key] = { ...a, ...parsedStyle };
        } else if (aIsString && bIsObject) {
          const parsedStyle = cssToStyleObj(a);
          result[key] = { ...parsedStyle, ...b };
        } else if (aIsString && bIsString) {
          const parsedStyleA = cssToStyleObj(a);
          const parsedStyleB = cssToStyleObj(b);
          result[key] = { ...parsedStyleA, ...parsedStyleB };
        } else if (aIsObject) {
          result[key] = a;
        } else if (bIsObject) {
          result[key] = b;
        } else if (aIsString) {
          result[key] = a;
        } else if (bIsString) {
          result[key] = b;
        }
      } else {
        result[key] = b !== void 0 ? b : a;
      }
    }
  }
  if (typeof result.style === "object") {
    result.style = styleToString(result.style).replaceAll("\n", " ");
  }
  if (result.hidden !== true) {
    result.hidden = void 0;
    delete result.hidden;
  }
  if (result.disabled !== true) {
    result.disabled = void 0;
    delete result.disabled;
  }
  return result;
}
function useRefById({
  id,
  ref,
  deps = () => true,
  onRefChange,
  getRootNode
}) {
  watch$1([() => id.current, deps], ([_id]) => {
    const rootNode = getRootNode?.() ?? document;
    const node = rootNode?.getElementById(_id);
    if (node) ref.current = node;
    else ref.current = null;
    onRefChange?.(ref.current);
  });
}
function afterTick(fn) {
  tick().then(fn);
}
function Grip_vertical($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["circle", { "cx": "9", "cy": "12", "r": "1" }],
    ["circle", { "cx": "9", "cy": "5", "r": "1" }],
    ["circle", { "cx": "9", "cy": "19", "r": "1" }],
    [
      "circle",
      { "cx": "15", "cy": "12", "r": "1" }
    ],
    ["circle", { "cx": "15", "cy": "5", "r": "1" }],
    [
      "circle",
      { "cx": "15", "cy": "19", "r": "1" }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "grip-vertical" },
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
function Wand($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M15 4V2" }],
    ["path", { "d": "M15 16v-2" }],
    ["path", { "d": "M8 9h2" }],
    ["path", { "d": "M20 9h2" }],
    ["path", { "d": "M17.8 11.8 19 13" }],
    ["path", { "d": "M15 9h.01" }],
    ["path", { "d": "M17.8 6.2 19 5" }],
    ["path", { "d": "m3 21 9-9" }],
    ["path", { "d": "M12.2 6.2 11 5" }]
  ];
  Icon($$payload, spread_props([
    { name: "wand" },
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
function Card_footer($$payload, $$props) {
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
      class: clsx$1(cn("flex items-center p-6 pt-0", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></div>`;
  bind_props($$props, { ref });
  pop();
}
function calculateAriaValues({ layout, panesArray, pivotIndices }) {
  let currentMinSize = 0;
  let currentMaxSize = 100;
  let totalMinSize = 0;
  let totalMaxSize = 0;
  const firstIndex = pivotIndices[0];
  for (let i = 0; i < panesArray.length; i++) {
    const constraints = panesArray[i].constraints;
    const { maxSize = 100, minSize = 0 } = constraints;
    if (i === firstIndex) {
      currentMinSize = minSize;
      currentMaxSize = maxSize;
    } else {
      totalMinSize += minSize;
      totalMaxSize += maxSize;
    }
  }
  const valueMax = Math.min(currentMaxSize, 100 - totalMinSize);
  const valueMin = Math.max(currentMinSize, 100 - totalMaxSize);
  const valueNow = layout[firstIndex];
  return {
    valueMax,
    valueMin,
    valueNow
  };
}
function assert(expectedCondition, message = "Assertion failed!") {
  if (!expectedCondition) {
    console.error(message);
    throw new Error(message);
  }
}
const LOCAL_STORAGE_DEBOUNCE_INTERVAL = 100;
const PRECISION = 10;
function areNumbersAlmostEqual(actual, expected, fractionDigits = PRECISION) {
  return compareNumbersWithTolerance(actual, expected, fractionDigits) === 0;
}
function compareNumbersWithTolerance(actual, expected, fractionDigits = PRECISION) {
  const roundedActual = roundTo(actual, fractionDigits);
  const roundedExpected = roundTo(expected, fractionDigits);
  return Math.sign(roundedActual - roundedExpected);
}
function areArraysEqual(arrA, arrB) {
  if (arrA.length !== arrB.length)
    return false;
  for (let index = 0; index < arrA.length; index++) {
    if (arrA[index] !== arrB[index])
      return false;
  }
  return true;
}
function roundTo(value, decimals) {
  return Number.parseFloat(value.toFixed(decimals));
}
const isBrowser = typeof document !== "undefined";
function isHTMLElement(element2) {
  return element2 instanceof HTMLElement;
}
function isKeyDown(event) {
  return event.type === "keydown";
}
function isMouseEvent(event) {
  return event.type.startsWith("mouse");
}
function isTouchEvent(event) {
  return event.type.startsWith("touch");
}
function resizePane({ paneConstraints: paneConstraintsArray, paneIndex, initialSize }) {
  const paneConstraints = paneConstraintsArray[paneIndex];
  assert(paneConstraints != null, "Pane constraints should not be null.");
  const { collapsedSize = 0, collapsible, maxSize = 100, minSize = 0 } = paneConstraints;
  let newSize = initialSize;
  if (compareNumbersWithTolerance(newSize, minSize) < 0) {
    newSize = getAdjustedSizeForCollapsible(newSize, collapsible, collapsedSize, minSize);
  }
  newSize = Math.min(maxSize, newSize);
  return Number.parseFloat(newSize.toFixed(PRECISION));
}
function getAdjustedSizeForCollapsible(size, collapsible, collapsedSize, minSize) {
  if (!collapsible)
    return minSize;
  const halfwayPoint = (collapsedSize + minSize) / 2;
  return compareNumbersWithTolerance(size, halfwayPoint) < 0 ? collapsedSize : minSize;
}
function noop() {
}
function updateResizeHandleAriaValues({ groupId, layout, panesArray }) {
  const resizeHandleElements = getResizeHandleElementsForGroup(groupId);
  for (let index = 0; index < panesArray.length - 1; index++) {
    const { valueMax, valueMin, valueNow } = calculateAriaValues({
      layout,
      panesArray,
      pivotIndices: [index, index + 1]
    });
    const resizeHandleEl = resizeHandleElements[index];
    if (isHTMLElement(resizeHandleEl)) {
      const paneData = panesArray[index];
      resizeHandleEl.setAttribute("aria-controls", paneData.opts.id.current);
      resizeHandleEl.setAttribute("aria-valuemax", `${Math.round(valueMax)}`);
      resizeHandleEl.setAttribute("aria-valuemin", `${Math.round(valueMin)}`);
      resizeHandleEl.setAttribute("aria-valuenow", valueNow != null ? `${Math.round(valueNow)}` : "");
    }
  }
  return () => {
    resizeHandleElements.forEach((resizeHandleElement) => {
      resizeHandleElement.removeAttribute("aria-controls");
      resizeHandleElement.removeAttribute("aria-valuemax");
      resizeHandleElement.removeAttribute("aria-valuemin");
      resizeHandleElement.removeAttribute("aria-valuenow");
    });
  };
}
function getResizeHandleElementsForGroup(groupId) {
  if (!isBrowser)
    return [];
  return Array.from(document.querySelectorAll(`[data-pane-resizer-id][data-pane-group-id="${groupId}"]`));
}
function getResizeHandleElementIndex(groupId, id) {
  if (!isBrowser)
    return null;
  const handles = getResizeHandleElementsForGroup(groupId);
  const index = handles.findIndex((handle) => handle.getAttribute("data-pane-resizer-id") === id);
  return index ?? null;
}
function getPivotIndices(groupId, dragHandleId) {
  const index = getResizeHandleElementIndex(groupId, dragHandleId);
  return index != null ? [index, index + 1] : [-1, -1];
}
function paneDataHelper(panesArray, pane, layout) {
  const paneConstraintsArray = panesArray.map((paneData) => paneData.constraints);
  const paneIndex = findPaneDataIndex(panesArray, pane);
  const paneConstraints = paneConstraintsArray[paneIndex];
  const isLastPane = paneIndex === panesArray.length - 1;
  const pivotIndices = isLastPane ? [paneIndex - 1, paneIndex] : [paneIndex, paneIndex + 1];
  const paneSize = layout[paneIndex];
  return {
    ...paneConstraints,
    paneSize,
    pivotIndices
  };
}
function findPaneDataIndex(panesArray, pane) {
  return panesArray.findIndex((prevPaneData) => prevPaneData.opts.id.current === pane.opts.id.current);
}
function callPaneCallbacks(panesArray, layout, paneIdToLastNotifiedSizeMap) {
  for (let index = 0; index < layout.length; index++) {
    const size = layout[index];
    const paneData = panesArray[index];
    assert(paneData);
    const { collapsedSize = 0, collapsible } = paneData.constraints;
    const lastNotifiedSize = paneIdToLastNotifiedSizeMap[paneData.opts.id.current];
    if (!(lastNotifiedSize == null || size !== lastNotifiedSize))
      continue;
    paneIdToLastNotifiedSizeMap[paneData.opts.id.current] = size;
    const { onCollapse, onExpand, onResize } = paneData.callbacks;
    onResize?.(size, lastNotifiedSize);
    if (collapsible && (onCollapse || onExpand)) {
      if (onExpand && (lastNotifiedSize == null || lastNotifiedSize === collapsedSize) && size !== collapsedSize) {
        onExpand();
      }
      if (onCollapse && (lastNotifiedSize == null || lastNotifiedSize !== collapsedSize) && size === collapsedSize) {
        onCollapse();
      }
    }
  }
}
function getUnsafeDefaultLayout({ panesArray }) {
  const layout = Array(panesArray.length);
  const paneConstraintsArray = panesArray.map((paneData) => paneData.constraints);
  let numPanesWithSizes = 0;
  let remainingSize = 100;
  for (let index = 0; index < panesArray.length; index++) {
    const paneConstraints = paneConstraintsArray[index];
    assert(paneConstraints);
    const { defaultSize } = paneConstraints;
    if (defaultSize != null) {
      numPanesWithSizes++;
      layout[index] = defaultSize;
      remainingSize -= defaultSize;
    }
  }
  for (let index = 0; index < panesArray.length; index++) {
    const paneConstraints = paneConstraintsArray[index];
    assert(paneConstraints);
    const { defaultSize } = paneConstraints;
    if (defaultSize != null) {
      continue;
    }
    const numRemainingPanes = panesArray.length - numPanesWithSizes;
    const size = remainingSize / numRemainingPanes;
    numPanesWithSizes++;
    layout[index] = size;
    remainingSize -= size;
  }
  return layout;
}
function validatePaneGroupLayout({ layout: prevLayout, paneConstraints }) {
  const nextLayout = [...prevLayout];
  const nextLayoutTotalSize = nextLayout.reduce((accumulated, current) => accumulated + current, 0);
  if (nextLayout.length !== paneConstraints.length) {
    throw new Error(`Invalid ${paneConstraints.length} pane layout: ${nextLayout.map((size) => `${size}%`).join(", ")}`);
  } else if (!areNumbersAlmostEqual(nextLayoutTotalSize, 100)) {
    for (let index = 0; index < paneConstraints.length; index++) {
      const unsafeSize = nextLayout[index];
      assert(unsafeSize != null);
      const safeSize = 100 / nextLayoutTotalSize * unsafeSize;
      nextLayout[index] = safeSize;
    }
  }
  let remainingSize = 0;
  for (let index = 0; index < paneConstraints.length; index++) {
    const unsafeSize = nextLayout[index];
    assert(unsafeSize != null);
    const safeSize = resizePane({
      paneConstraints,
      paneIndex: index,
      initialSize: unsafeSize
    });
    if (unsafeSize !== safeSize) {
      remainingSize += unsafeSize - safeSize;
      nextLayout[index] = safeSize;
    }
  }
  if (!areNumbersAlmostEqual(remainingSize, 0)) {
    for (let index = 0; index < paneConstraints.length; index++) {
      const prevSize = nextLayout[index];
      assert(prevSize != null);
      const unsafeSize = prevSize + remainingSize;
      const safeSize = resizePane({
        paneConstraints,
        paneIndex: index,
        initialSize: unsafeSize
      });
      if (prevSize !== safeSize) {
        remainingSize -= safeSize - prevSize;
        nextLayout[index] = safeSize;
        if (areNumbersAlmostEqual(remainingSize, 0)) {
          break;
        }
      }
    }
  }
  return nextLayout;
}
function getPaneGroupElement(id) {
  if (!isBrowser)
    return null;
  const element2 = document.querySelector(`[data-pane-group][data-pane-group-id="${id}"]`);
  if (element2) {
    return element2;
  }
  return null;
}
function getResizeHandleElement(id) {
  if (!isBrowser)
    return null;
  const element2 = document.querySelector(`[data-pane-resizer-id="${id}"]`);
  if (element2) {
    return element2;
  }
  return null;
}
function getDragOffsetPercentage(e, dragHandleId, dir, initialDragState) {
  const isHorizontal = dir === "horizontal";
  const handleElement = getResizeHandleElement(dragHandleId);
  assert(handleElement);
  const groupId = handleElement.getAttribute("data-pane-group-id");
  assert(groupId);
  const { initialCursorPosition } = initialDragState;
  const cursorPosition = getResizeEventCursorPosition(dir, e);
  const groupElement = getPaneGroupElement(groupId);
  assert(groupElement);
  const groupRect = groupElement.getBoundingClientRect();
  const groupSizeInPixels = isHorizontal ? groupRect.width : groupRect.height;
  const offsetPixels = cursorPosition - initialCursorPosition;
  const offsetPercentage = offsetPixels / groupSizeInPixels * 100;
  return offsetPercentage;
}
function getDeltaPercentage(e, dragHandleId, dir, initialDragState, keyboardResizeBy) {
  if (isKeyDown(e)) {
    const isHorizontal = dir === "horizontal";
    let delta = 0;
    if (e.shiftKey) {
      delta = 100;
    } else if (keyboardResizeBy != null) {
      delta = keyboardResizeBy;
    } else {
      delta = 10;
    }
    let movement = 0;
    switch (e.key) {
      case "ArrowDown":
        movement = isHorizontal ? 0 : delta;
        break;
      case "ArrowLeft":
        movement = isHorizontal ? -delta : 0;
        break;
      case "ArrowRight":
        movement = isHorizontal ? delta : 0;
        break;
      case "ArrowUp":
        movement = isHorizontal ? 0 : -delta;
        break;
      case "End":
        movement = 100;
        break;
      case "Home":
        movement = -100;
        break;
    }
    return movement;
  } else {
    if (initialDragState == null)
      return 0;
    return getDragOffsetPercentage(e, dragHandleId, dir, initialDragState);
  }
}
function getResizeEventCursorPosition(dir, e) {
  const isHorizontal = dir === "horizontal";
  if (isMouseEvent(e)) {
    return isHorizontal ? e.clientX : e.clientY;
  } else if (isTouchEvent(e)) {
    const firstTouch = e.touches[0];
    assert(firstTouch);
    return isHorizontal ? firstTouch.screenX : firstTouch.screenY;
  } else {
    throw new Error(`Unsupported event type "${e.type}"`);
  }
}
function getResizeHandlePaneIds(groupId, handleId, panesArray) {
  const handle = getResizeHandleElement(handleId);
  const handles = getResizeHandleElementsForGroup(groupId);
  const index = handle ? handles.indexOf(handle) : -1;
  const idBefore = panesArray[index]?.opts.id.current ?? null;
  const idAfter = panesArray[index + 1]?.opts.id.current ?? null;
  return [idBefore, idAfter];
}
let count = 0;
function useId(prefix = "paneforge") {
  count++;
  return `${prefix}-${count}`;
}
const defaultWindow = void 0;
function getActiveElement(document2) {
  let activeElement = document2.activeElement;
  while (activeElement?.shadowRoot) {
    const node = activeElement.shadowRoot.activeElement;
    if (node === activeElement)
      break;
    else
      activeElement = node;
  }
  return activeElement;
}
class ActiveElement {
  #document;
  #subscribe;
  constructor(options = {}) {
    const {
      window: window2 = defaultWindow,
      document: document2 = window2?.document
    } = options;
    if (window2 === void 0) return;
    this.#document = document2;
    this.#subscribe = createSubscriber();
  }
  get current() {
    this.#subscribe?.();
    if (!this.#document) return null;
    return getActiveElement(this.#document);
  }
}
new ActiveElement();
function runWatcher(sources, flush, effect, options = {}) {
  const { lazy = false } = options;
}
function watch(sources, effect, options) {
  runWatcher(sources, "post", effect, options);
}
function watchPre(sources, effect, options) {
  runWatcher(sources, "pre", effect, options);
}
watch.pre = watchPre;
class Context {
  #name;
  #key;
  /**
   * @param name The name of the context.
   * This is used for generating the context key and error messages.
   */
  constructor(name) {
    this.#name = name;
    this.#key = Symbol(name);
  }
  /**
   * The key used to get and set the context.
   *
   * It is not recommended to use this value directly.
   * Instead, use the methods provided by this class.
   */
  get key() {
    return this.#key;
  }
  /**
   * Checks whether this has been set in the context of a parent component.
   *
   * Must be called during component initialisation.
   */
  exists() {
    return hasContext(this.#key);
  }
  /**
   * Retrieves the context that belongs to the closest parent component.
   *
   * Must be called during component initialisation.
   *
   * @throws An error if the context does not exist.
   */
  get() {
    const context = getContext(this.#key);
    if (context === void 0) {
      throw new Error(`Context "${this.#name}" not found`);
    }
    return context;
  }
  /**
   * Retrieves the context that belongs to the closest parent component,
   * or the given fallback value if the context does not exist.
   *
   * Must be called during component initialisation.
   */
  getOr(fallback) {
    const context = getContext(this.#key);
    if (context === void 0) {
      return fallback;
    }
    return context;
  }
  /**
   * Associates the given value with the current component and returns it.
   *
   * Must be called during component initialisation.
   */
  set(context) {
    return setContext(this.#key, context);
  }
}
function adjustLayoutByDelta({ delta, layout: prevLayout, paneConstraints: paneConstraintsArray, pivotIndices, trigger }) {
  if (areNumbersAlmostEqual(delta, 0))
    return prevLayout;
  const nextLayout = [...prevLayout];
  const [firstPivotIndex, secondPivotIndex] = pivotIndices;
  let deltaApplied = 0;
  {
    if (trigger === "keyboard") {
      {
        const index = delta < 0 ? secondPivotIndex : firstPivotIndex;
        const paneConstraints = paneConstraintsArray[index];
        assert(paneConstraints);
        if (paneConstraints.collapsible) {
          const prevSize = prevLayout[index];
          assert(prevSize != null);
          const paneConstraints2 = paneConstraintsArray[index];
          assert(paneConstraints2);
          const { collapsedSize = 0, minSize = 0 } = paneConstraints2;
          if (areNumbersAlmostEqual(prevSize, collapsedSize)) {
            const localDelta = minSize - prevSize;
            if (compareNumbersWithTolerance(localDelta, Math.abs(delta)) > 0) {
              delta = delta < 0 ? 0 - localDelta : localDelta;
            }
          }
        }
      }
      {
        const index = delta < 0 ? firstPivotIndex : secondPivotIndex;
        const paneConstraints = paneConstraintsArray[index];
        assert(paneConstraints);
        const { collapsible } = paneConstraints;
        if (collapsible) {
          const prevSize = prevLayout[index];
          assert(prevSize != null);
          const paneConstraints2 = paneConstraintsArray[index];
          assert(paneConstraints2);
          const { collapsedSize = 0, minSize = 0 } = paneConstraints2;
          if (areNumbersAlmostEqual(prevSize, minSize)) {
            const localDelta = prevSize - collapsedSize;
            if (compareNumbersWithTolerance(localDelta, Math.abs(delta)) > 0) {
              delta = delta < 0 ? 0 - localDelta : localDelta;
            }
          }
        }
      }
    }
  }
  {
    const increment = delta < 0 ? 1 : -1;
    let index = delta < 0 ? secondPivotIndex : firstPivotIndex;
    let maxAvailableDelta = 0;
    while (true) {
      const prevSize = prevLayout[index];
      assert(prevSize != null);
      const maxSafeSize = resizePane({
        paneConstraints: paneConstraintsArray,
        paneIndex: index,
        initialSize: 100
      });
      const delta2 = maxSafeSize - prevSize;
      maxAvailableDelta += delta2;
      index += increment;
      if (index < 0 || index >= paneConstraintsArray.length) {
        break;
      }
    }
    const minAbsDelta = Math.min(Math.abs(delta), Math.abs(maxAvailableDelta));
    delta = delta < 0 ? 0 - minAbsDelta : minAbsDelta;
  }
  {
    const pivotIndex = delta < 0 ? firstPivotIndex : secondPivotIndex;
    let index = pivotIndex;
    while (index >= 0 && index < paneConstraintsArray.length) {
      const deltaRemaining = Math.abs(delta) - Math.abs(deltaApplied);
      const prevSize = prevLayout[index];
      assert(prevSize != null);
      const unsafeSize = prevSize - deltaRemaining;
      const safeSize = resizePane({
        paneConstraints: paneConstraintsArray,
        paneIndex: index,
        initialSize: unsafeSize
      });
      if (!areNumbersAlmostEqual(prevSize, safeSize)) {
        deltaApplied += prevSize - safeSize;
        nextLayout[index] = safeSize;
        if (deltaApplied.toPrecision(3).localeCompare(Math.abs(delta).toPrecision(3), void 0, {
          numeric: true
        }) >= 0) {
          break;
        }
      }
      if (delta < 0) {
        index--;
      } else {
        index++;
      }
    }
  }
  if (areNumbersAlmostEqual(deltaApplied, 0)) {
    return prevLayout;
  }
  {
    const pivotIndex = delta < 0 ? secondPivotIndex : firstPivotIndex;
    const prevSize = prevLayout[pivotIndex];
    assert(prevSize != null);
    const unsafeSize = prevSize + deltaApplied;
    const safeSize = resizePane({
      paneConstraints: paneConstraintsArray,
      paneIndex: pivotIndex,
      initialSize: unsafeSize
    });
    nextLayout[pivotIndex] = safeSize;
    if (!areNumbersAlmostEqual(safeSize, unsafeSize)) {
      let deltaRemaining = unsafeSize - safeSize;
      const pivotIndex2 = delta < 0 ? secondPivotIndex : firstPivotIndex;
      let index = pivotIndex2;
      while (index >= 0 && index < paneConstraintsArray.length) {
        const prevSize2 = nextLayout[index];
        assert(prevSize2 != null);
        const unsafeSize2 = prevSize2 + deltaRemaining;
        const safeSize2 = resizePane({
          paneConstraints: paneConstraintsArray,
          paneIndex: index,
          initialSize: unsafeSize2
        });
        if (!areNumbersAlmostEqual(prevSize2, safeSize2)) {
          deltaRemaining -= safeSize2 - prevSize2;
          nextLayout[index] = safeSize2;
        }
        if (areNumbersAlmostEqual(deltaRemaining, 0))
          break;
        delta > 0 ? index-- : index++;
      }
    }
  }
  const totalSize = nextLayout.reduce((total, size) => size + total, 0);
  if (!areNumbersAlmostEqual(totalSize, 100))
    return prevLayout;
  return nextLayout;
}
let currentState = null;
let element = null;
function getCursorStyle(state) {
  switch (state) {
    case "horizontal":
      return "ew-resize";
    case "horizontal-max":
      return "w-resize";
    case "horizontal-min":
      return "e-resize";
    case "vertical":
      return "ns-resize";
    case "vertical-max":
      return "n-resize";
    case "vertical-min":
      return "s-resize";
  }
}
function resetGlobalCursorStyle() {
  if (element === null)
    return;
  document.head.removeChild(element);
  currentState = null;
  element = null;
}
function setGlobalCursorStyle(state) {
  if (currentState === state)
    return;
  currentState = state;
  const style = getCursorStyle(state);
  if (element === null) {
    element = document.createElement("style");
    document.head.appendChild(element);
  }
  element.innerHTML = `*{cursor: ${style}!important;}`;
}
function computePaneFlexBoxStyle({ defaultSize, dragState, layout, panesArray, paneIndex, precision = 3 }) {
  const size = layout[paneIndex];
  let flexGrow;
  if (size == null) {
    flexGrow = defaultSize ?? "1";
  } else if (panesArray.length === 1) {
    flexGrow = "1";
  } else {
    flexGrow = size.toPrecision(precision);
  }
  return {
    flexBasis: 0,
    flexGrow,
    flexShrink: 1,
    // Without this, pane sizes may be unintentionally overridden by their content
    overflow: "hidden",
    // Disable pointer events inside of a pane during resize
    // This avoid edge cases like nested iframes
    pointerEvents: dragState !== null ? "none" : void 0
  };
}
function initializeStorage(storageObject) {
  try {
    if (typeof localStorage === "undefined") {
      throw new TypeError("localStorage is not supported in this environment");
    }
    storageObject.getItem = (name) => localStorage.getItem(name);
    storageObject.setItem = (name, value) => localStorage.setItem(name, value);
  } catch (err) {
    console.error(err);
    storageObject.getItem = () => null;
    storageObject.setItem = () => {
    };
  }
}
function getPaneGroupKey(autoSaveId) {
  return `paneforge:${autoSaveId}`;
}
function getPaneKey(panes) {
  const sortedPaneIds = panes.map((pane) => {
    return pane.opts.order.current ? `${pane.opts.order.current}:${JSON.stringify(pane.constraints)}` : JSON.stringify(pane.constraints);
  }).sort().join(",");
  return sortedPaneIds;
}
function loadSerializedPaneGroupState(autoSaveId, storage) {
  try {
    const paneGroupKey = getPaneGroupKey(autoSaveId);
    const serialized = storage.getItem(paneGroupKey);
    const parsed = JSON.parse(serialized || "");
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch {
  }
  return null;
}
function loadPaneGroupState(autoSaveId, panesArray, storage) {
  const state = loadSerializedPaneGroupState(autoSaveId, storage) || {};
  const paneKey = getPaneKey(panesArray);
  return state[paneKey] || null;
}
function savePaneGroupState(autoSaveId, panesArray, paneSizesBeforeCollapse, sizes, storage) {
  const paneGroupKey = getPaneGroupKey(autoSaveId);
  const paneKey = getPaneKey(panesArray);
  const state = loadSerializedPaneGroupState(autoSaveId, storage) || {};
  state[paneKey] = {
    expandToSizes: Object.fromEntries(paneSizesBeforeCollapse.entries()),
    layout: sizes
  };
  try {
    storage.setItem(paneGroupKey, JSON.stringify(state));
  } catch (error) {
    console.error(error);
  }
}
const debounceMap = {};
function debounce(callback, durationMs = 10) {
  let timeoutId = null;
  const callable = (...args) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      callback(...args);
    }, durationMs);
  };
  return callable;
}
function updateStorageValues({ autoSaveId, layout, storage, panesArray, paneSizeBeforeCollapse }) {
  if (layout.length === 0 || layout.length !== panesArray.length)
    return;
  let debouncedSave = debounceMap[autoSaveId];
  if (debouncedSave == null) {
    debouncedSave = debounce(savePaneGroupState, LOCAL_STORAGE_DEBOUNCE_INTERVAL);
    debounceMap[autoSaveId] = debouncedSave;
  }
  const clonedPanesArray = [...panesArray];
  const clonedPaneSizesBeforeCollapse = new Map(paneSizeBeforeCollapse);
  debouncedSave(autoSaveId, clonedPanesArray, clonedPaneSizesBeforeCollapse, layout, storage);
}
const defaultStorage = {
  getItem: (name) => {
    initializeStorage(defaultStorage);
    return defaultStorage.getItem(name);
  },
  setItem: (name, value) => {
    initializeStorage(defaultStorage);
    defaultStorage.setItem(name, value);
  }
};
class PaneGroupState {
  opts;
  dragState = null;
  layout = [];
  panesArray = [];
  panesArrayChanged = false;
  paneIdToLastNotifiedSizeMap = {};
  paneSizeBeforeCollapseMap = /* @__PURE__ */ new Map();
  prevDelta = 0;
  constructor(opts) {
    this.opts = opts;
    useRefById(opts);
    watch(
      [
        () => this.opts.id.current,
        () => this.layout,
        () => this.panesArray
      ],
      () => {
        return updateResizeHandleAriaValues({
          groupId: this.opts.id.current,
          layout: this.layout,
          panesArray: this.panesArray
        });
      }
    );
    watch(
      [
        () => this.opts.autoSaveId.current,
        () => this.layout,
        () => this.opts.storage.current
      ],
      () => {
        if (!this.opts.autoSaveId.current) return;
        updateStorageValues({
          autoSaveId: this.opts.autoSaveId.current,
          layout: this.layout,
          storage: this.opts.storage.current,
          panesArray: this.panesArray,
          paneSizeBeforeCollapse: this.paneSizeBeforeCollapseMap
        });
      }
    );
    watch(() => this.panesArrayChanged, () => {
      if (!this.panesArrayChanged) return;
      this.panesArrayChanged = false;
      const prevLayout = this.layout;
      let unsafeLayout = null;
      if (this.opts.autoSaveId.current) {
        const state = loadPaneGroupState(this.opts.autoSaveId.current, this.panesArray, this.opts.storage.current);
        if (state) {
          this.paneSizeBeforeCollapseMap = new Map(Object.entries(state.expandToSizes));
          unsafeLayout = state.layout;
        }
      }
      if (unsafeLayout == null) {
        unsafeLayout = getUnsafeDefaultLayout({ panesArray: this.panesArray });
      }
      const nextLayout = validatePaneGroupLayout({
        layout: unsafeLayout,
        paneConstraints: this.panesArray.map((paneData) => paneData.constraints)
      });
      if (areArraysEqual(prevLayout, nextLayout)) return;
      this.layout = nextLayout;
      this.opts.onLayout.current?.(nextLayout);
      callPaneCallbacks(this.panesArray, nextLayout, this.paneIdToLastNotifiedSizeMap);
    });
  }
  setLayout = (newLayout) => {
    this.layout = newLayout;
  };
  registerResizeHandle = (dragHandleId) => {
    return (e) => {
      e.preventDefault();
      const direction = this.opts.direction.current;
      const dragState = this.dragState;
      const groupId = this.opts.id.current;
      const keyboardResizeBy = this.opts.keyboardResizeBy.current;
      const prevLayout = this.layout;
      const paneDataArray = this.panesArray;
      const { initialLayout } = dragState ?? {};
      const pivotIndices = getPivotIndices(groupId, dragHandleId);
      let delta = getDeltaPercentage(e, dragHandleId, direction, dragState, keyboardResizeBy);
      if (delta === 0) return;
      const isHorizontal = direction === "horizontal";
      if (document.dir === "rtl" && isHorizontal) {
        delta = -delta;
      }
      const paneConstraints = paneDataArray.map((paneData) => paneData.constraints);
      const nextLayout = adjustLayoutByDelta({
        delta,
        layout: initialLayout ?? prevLayout,
        paneConstraints,
        pivotIndices,
        trigger: isKeyDown(e) ? "keyboard" : "mouse-or-touch"
      });
      const layoutChanged = !areArraysEqual(prevLayout, nextLayout);
      if (isMouseEvent(e) || isTouchEvent(e)) {
        const prevDelta = this.prevDelta;
        if (prevDelta !== delta) {
          this.prevDelta = delta;
          if (!layoutChanged) {
            if (isHorizontal) {
              setGlobalCursorStyle(delta < 0 ? "horizontal-min" : "horizontal-max");
            } else {
              setGlobalCursorStyle(delta < 0 ? "vertical-min" : "vertical-max");
            }
          } else {
            setGlobalCursorStyle(isHorizontal ? "horizontal" : "vertical");
          }
        }
      }
      if (layoutChanged) {
        this.setLayout(nextLayout);
        this.opts.onLayout.current?.(nextLayout);
        callPaneCallbacks(paneDataArray, nextLayout, this.paneIdToLastNotifiedSizeMap);
      }
    };
  };
  resizePane = (paneState, unsafePaneSize) => {
    const prevLayout = this.layout;
    const panesArray = this.panesArray;
    const paneConstraintsArr = panesArray.map((paneData) => paneData.constraints);
    const { paneSize, pivotIndices } = paneDataHelper(panesArray, paneState, prevLayout);
    assert(paneSize != null);
    const isLastPane = findPaneDataIndex(panesArray, paneState) === panesArray.length - 1;
    const delta = isLastPane ? paneSize - unsafePaneSize : unsafePaneSize - paneSize;
    const nextLayout = adjustLayoutByDelta({
      delta,
      layout: prevLayout,
      paneConstraints: paneConstraintsArr,
      pivotIndices,
      trigger: "imperative-api"
    });
    if (areArraysEqual(prevLayout, nextLayout)) return;
    this.setLayout(nextLayout);
    this.opts.onLayout.current?.(nextLayout);
    callPaneCallbacks(panesArray, nextLayout, this.paneIdToLastNotifiedSizeMap);
  };
  startDragging = (dragHandleId, e) => {
    const direction = this.opts.direction.current;
    const layout = this.layout;
    const handleElement = getResizeHandleElement(dragHandleId);
    assert(handleElement);
    const initialCursorPosition = getResizeEventCursorPosition(direction, e);
    this.dragState = {
      dragHandleId,
      dragHandleRect: handleElement.getBoundingClientRect(),
      initialCursorPosition,
      initialLayout: layout
    };
  };
  stopDragging = () => {
    resetGlobalCursorStyle();
    this.dragState = null;
  };
  isPaneCollapsed = (pane) => {
    const paneDataArray = this.panesArray;
    const layout = this.layout;
    const { collapsedSize = 0, collapsible, paneSize } = paneDataHelper(paneDataArray, pane, layout);
    return collapsible === true && paneSize === collapsedSize;
  };
  expandPane = (pane) => {
    const prevLayout = this.layout;
    const paneDataArray = this.panesArray;
    if (!pane.constraints.collapsible) return;
    const paneConstraintsArray = paneDataArray.map((paneData) => paneData.constraints);
    const {
      collapsedSize = 0,
      paneSize,
      minSize = 0,
      pivotIndices
    } = paneDataHelper(paneDataArray, pane, prevLayout);
    if (paneSize !== collapsedSize) return;
    const prevPaneSize = this.paneSizeBeforeCollapseMap.get(pane.opts.id.current);
    const baseSize = prevPaneSize != null && prevPaneSize >= minSize ? prevPaneSize : minSize;
    const isLastPane = findPaneDataIndex(paneDataArray, pane) === paneDataArray.length - 1;
    const delta = isLastPane ? paneSize - baseSize : baseSize - paneSize;
    const nextLayout = adjustLayoutByDelta({
      delta,
      layout: prevLayout,
      paneConstraints: paneConstraintsArray,
      pivotIndices,
      trigger: "imperative-api"
    });
    if (areArraysEqual(prevLayout, nextLayout)) return;
    this.setLayout(nextLayout);
    this.opts.onLayout.current?.(nextLayout);
    callPaneCallbacks(paneDataArray, nextLayout, this.paneIdToLastNotifiedSizeMap);
  };
  collapsePane = (pane) => {
    const prevLayout = this.layout;
    const paneDataArray = this.panesArray;
    if (!pane.constraints.collapsible) return;
    const paneConstraintsArray = paneDataArray.map((paneData) => paneData.constraints);
    const { collapsedSize = 0, paneSize, pivotIndices } = paneDataHelper(paneDataArray, pane, prevLayout);
    assert(paneSize != null);
    if (paneSize === collapsedSize) return;
    this.paneSizeBeforeCollapseMap.set(pane.opts.id.current, paneSize);
    const isLastPane = findPaneDataIndex(paneDataArray, pane) === paneDataArray.length - 1;
    const delta = isLastPane ? paneSize - collapsedSize : collapsedSize - paneSize;
    const nextLayout = adjustLayoutByDelta({
      delta,
      layout: prevLayout,
      paneConstraints: paneConstraintsArray,
      pivotIndices,
      trigger: "imperative-api"
    });
    if (areArraysEqual(prevLayout, nextLayout)) return;
    this.layout = nextLayout;
    this.opts.onLayout.current?.(nextLayout);
    callPaneCallbacks(paneDataArray, nextLayout, this.paneIdToLastNotifiedSizeMap);
  };
  getPaneSize = (pane) => {
    return paneDataHelper(this.panesArray, pane, this.layout).paneSize;
  };
  getPaneStyle = (pane, defaultSize) => {
    const paneDataArray = this.panesArray;
    const layout = this.layout;
    const dragState = this.dragState;
    const paneIndex = findPaneDataIndex(paneDataArray, pane);
    return computePaneFlexBoxStyle({
      defaultSize,
      dragState,
      layout,
      panesArray: paneDataArray,
      paneIndex
    });
  };
  isPaneExpanded = (pane) => {
    const { collapsedSize = 0, collapsible, paneSize } = paneDataHelper(this.panesArray, pane, this.layout);
    return !collapsible || paneSize > collapsedSize;
  };
  registerPane = (pane) => {
    const newPaneDataArray = [...this.panesArray, pane];
    newPaneDataArray.sort((paneA, paneB) => {
      const orderA = paneA.opts.order.current;
      const orderB = paneB.opts.order.current;
      if (orderA == null && orderB == null) {
        return 0;
      } else if (orderA == null) {
        return -1;
      } else if (orderB == null) {
        return 1;
      } else {
        return orderA - orderB;
      }
    });
    this.panesArray = newPaneDataArray;
    this.panesArrayChanged = true;
    return () => {
      const paneDataArray = [...this.panesArray];
      const index = findPaneDataIndex(this.panesArray, pane);
      if (index < 0) return;
      paneDataArray.splice(index, 1);
      this.panesArray = paneDataArray;
      delete this.paneIdToLastNotifiedSizeMap[pane.opts.id.current];
      this.panesArrayChanged = true;
    };
  };
  #setResizeHandlerEventListeners = () => {
    const groupId = this.opts.id.current;
    const handles = getResizeHandleElementsForGroup(groupId);
    const paneDataArray = this.panesArray;
    const unsubHandlers = handles.map((handle) => {
      const handleId = handle.getAttribute("data-pane-resizer-id");
      if (!handleId) return noop;
      const [idBefore, idAfter] = getResizeHandlePaneIds(groupId, handleId, paneDataArray);
      if (idBefore == null || idAfter == null) return noop;
      const onKeydown = (e) => {
        if (e.defaultPrevented || e.key !== "Enter") return;
        e.preventDefault();
        const paneDataArray2 = this.panesArray;
        const index = paneDataArray2.findIndex((paneData2) => paneData2.opts.id.current === idBefore);
        if (index < 0) return;
        const paneData = paneDataArray2[index];
        assert(paneData);
        const layout = this.layout;
        const size = layout[index];
        const { collapsedSize = 0, collapsible, minSize = 0 } = paneData.constraints;
        if (!(size != null && collapsible)) return;
        const nextLayout = adjustLayoutByDelta({
          delta: areNumbersAlmostEqual(size, collapsedSize) ? minSize - size : collapsedSize - size,
          layout,
          paneConstraints: paneDataArray2.map((paneData2) => paneData2.constraints),
          pivotIndices: getPivotIndices(groupId, handleId),
          trigger: "keyboard"
        });
        if (layout !== nextLayout) {
          this.layout = nextLayout;
        }
      };
      const unsubListener = addEventListener(handle, "keydown", onKeydown);
      return () => {
        unsubListener();
      };
    });
    return () => {
      for (const unsub of unsubHandlers) {
        unsub();
      }
    };
  };
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-pane-group": "",
    "data-direction": this.opts.direction.current,
    "data-pane-group-id": this.opts.id.current,
    style: {
      display: "flex",
      flexDirection: this.opts.direction.current === "horizontal" ? "row" : "column",
      height: "100%",
      overflow: "hidden",
      width: "100%"
    }
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
const resizeKeys = [
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home"
];
class PaneResizerState {
  opts;
  group;
  #isDragging = derived(() => this.group.dragState?.dragHandleId === this.opts.id.current);
  #isFocused = false;
  resizeHandler = null;
  constructor(opts, group) {
    this.opts = opts;
    this.group = group;
    useRefById(opts);
  }
  #startDragging = (e) => {
    e.preventDefault();
    if (this.opts.disabled.current) return;
    this.group.startDragging(this.opts.id.current, e);
    this.opts.onDraggingChange.current(true);
  };
  #stopDraggingAndBlur = () => {
    const node = this.opts.ref.current;
    if (!node) return;
    node.blur();
    this.group.stopDragging();
    this.opts.onDraggingChange.current(false);
  };
  #onkeydown = (e) => {
    if (this.opts.disabled.current || !this.resizeHandler || e.defaultPrevented) return;
    if (resizeKeys.includes(e.key)) {
      e.preventDefault();
      this.resizeHandler(e);
      return;
    }
    if (e.key !== "F6") return;
    e.preventDefault();
    const handles = getResizeHandleElementsForGroup(this.group.opts.id.current);
    const index = getResizeHandleElementIndex(this.group.opts.id.current, this.opts.id.current);
    if (index === null) return;
    let nextIndex = 0;
    if (e.shiftKey) {
      if (index > 0) {
        nextIndex = index - 1;
      } else {
        nextIndex = handles.length - 1;
      }
    } else {
      if (index + 1 < handles.length) {
        nextIndex = index + 1;
      } else {
        nextIndex = 0;
      }
    }
    const nextHandle = handles[nextIndex];
    nextHandle.focus();
  };
  #onblur = () => {
    this.#isFocused = false;
  };
  #onfocus = () => {
    this.#isFocused = true;
  };
  #onmousedown = (e) => {
    this.#startDragging(e);
  };
  #onmouseup = () => {
    this.#stopDraggingAndBlur();
  };
  #ontouchcancel = () => {
    this.#stopDraggingAndBlur();
  };
  #ontouchend = () => {
    this.#stopDraggingAndBlur();
  };
  #ontouchstart = (e) => {
    this.#startDragging(e);
  };
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "separator",
    "data-direction": this.group.opts.direction.current,
    "data-pane-group-id": this.group.opts.id.current,
    "data-active": this.#isDragging() ? "pointer" : this.#isFocused ? "keyboard" : void 0,
    "data-enabled": !this.opts.disabled.current,
    "data-pane-resizer-id": this.opts.id.current,
    "data-pane-resizer": "",
    tabIndex: this.opts.tabIndex.current,
    style: {
      cursor: getCursorStyle(this.group.opts.direction.current),
      touchAction: "none",
      userSelect: "none",
      "-webkit-user-select": "none",
      "-webkit-touch-callout": "none"
    },
    onkeydown: this.#onkeydown,
    onblur: this.#onblur,
    onfocus: this.#onfocus,
    onmousedown: this.#onmousedown,
    onmouseup: this.#onmouseup,
    ontouchcancel: this.#ontouchcancel,
    ontouchend: this.#ontouchend,
    ontouchstart: this.#ontouchstart
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class PaneState {
  opts;
  group;
  #paneTransitionState = "";
  #callbacks = derived(() => ({
    onCollapse: this.opts.onCollapse.current,
    onExpand: this.opts.onExpand.current,
    onResize: this.opts.onResize.current
  }));
  get callbacks() {
    return this.#callbacks();
  }
  set callbacks($$value) {
    return this.#callbacks($$value);
  }
  #constraints = derived(() => ({
    collapsedSize: this.opts.collapsedSize.current,
    collapsible: this.opts.collapsible.current,
    defaultSize: this.opts.defaultSize.current,
    maxSize: this.opts.maxSize.current,
    minSize: this.opts.minSize.current
  }));
  get constraints() {
    return this.#constraints();
  }
  set constraints($$value) {
    return this.#constraints($$value);
  }
  #handleTransition = (state) => {
    this.#paneTransitionState = state;
    afterTick(() => {
      if (this.opts.ref.current) {
        const element2 = this.opts.ref.current;
        const computedStyle = getComputedStyle(element2);
        const hasTransition = computedStyle.transitionDuration !== "0s";
        if (!hasTransition) {
          this.#paneTransitionState = "";
          return;
        }
        const handleTransitionEnd = (event) => {
          if (event.propertyName === "flex-grow") {
            this.#paneTransitionState = "";
            element2.removeEventListener("transitionend", handleTransitionEnd);
          }
        };
        element2.addEventListener("transitionend", handleTransitionEnd);
      } else {
        this.#paneTransitionState = "";
      }
    });
  };
  pane = {
    collapse: () => {
      this.#handleTransition("collapsing");
      this.group.collapsePane(this);
    },
    expand: () => {
      this.#handleTransition("expanding");
      this.group.expandPane(this);
    },
    getSize: () => this.group.getPaneSize(this),
    isCollapsed: () => this.group.isPaneCollapsed(this),
    isExpanded: () => this.group.isPaneExpanded(this),
    resize: (size) => this.group.resizePane(this, size),
    getId: () => this.opts.id.current
  };
  constructor(opts, group) {
    this.opts = opts;
    this.group = group;
    useRefById(opts);
    watch(() => snapshot(this.constraints), () => {
      this.group.panesArrayChanged = true;
    });
  }
  #isCollapsed = derived(() => this.group.isPaneCollapsed(this));
  #paneState = derived(() => this.#paneTransitionState !== "" ? this.#paneTransitionState : this.#isCollapsed() ? "collapsed" : "expanded");
  #props = derived(() => ({
    id: this.opts.id.current,
    style: this.group.getPaneStyle(this, this.opts.defaultSize.current),
    "data-pane": "",
    "data-pane-id": this.opts.id.current,
    "data-pane-group-id": this.group.opts.id.current,
    "data-collapsed": this.#isCollapsed() ? "" : void 0,
    "data-expanded": this.#isCollapsed() ? void 0 : "",
    "data-pane-state": this.#paneState()
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
const PaneGroupContext = new Context("PaneGroup");
function usePaneGroup(props) {
  return PaneGroupContext.set(new PaneGroupState(props));
}
function usePaneResizer(props) {
  return new PaneResizerState(props, PaneGroupContext.get());
}
function usePane(props) {
  return new PaneState(props, PaneGroupContext.get());
}
function Pane_group($$payload, $$props) {
  push();
  let {
    autoSaveId = null,
    direction,
    id = useId(),
    keyboardResizeBy = null,
    onLayoutChange = noop,
    storage = defaultStorage,
    ref = null,
    child,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const paneGroupState = usePaneGroup({
    id: box.with(() => id ?? useId()),
    ref: box.with(() => ref, (v) => ref = v),
    autoSaveId: box.with(() => autoSaveId),
    direction: box.with(() => direction),
    keyboardResizeBy: box.with(() => keyboardResizeBy),
    onLayout: box.with(() => onLayoutChange),
    storage: box.with(() => storage)
  });
  const getLayout = () => paneGroupState.layout;
  const setLayout = paneGroupState.setLayout;
  const getId = () => paneGroupState.opts.id.current;
  const mergedProps = mergeProps(restProps, paneGroupState.props);
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
  bind_props($$props, { ref, getLayout, setLayout, getId });
  pop();
}
function Pane($$payload, $$props) {
  push();
  let {
    id = useId(),
    ref = null,
    collapsedSize,
    collapsible,
    defaultSize,
    maxSize,
    minSize,
    onCollapse = noop,
    onExpand = noop,
    onResize = noop,
    order,
    child,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const paneState = usePane({
    id: box.with(() => id),
    ref: box.with(() => ref, (v) => ref = v),
    collapsedSize: box.with(() => collapsedSize),
    collapsible: box.with(() => collapsible),
    defaultSize: box.with(() => defaultSize),
    maxSize: box.with(() => maxSize),
    minSize: box.with(() => minSize),
    onCollapse: box.with(() => onCollapse),
    onExpand: box.with(() => onExpand),
    onResize: box.with(() => onResize),
    order: box.with(() => order)
  });
  const collapse = paneState.pane.collapse;
  const expand = paneState.pane.expand;
  const getSize = paneState.pane.getSize;
  const isCollapsed = paneState.pane.isCollapsed;
  const isExpanded = paneState.pane.isExpanded;
  const resize = paneState.pane.resize;
  const getId = paneState.pane.getId;
  const mergedProps = mergeProps(restProps, paneState.props);
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
  bind_props($$props, {
    ref,
    collapse,
    expand,
    getSize,
    isCollapsed,
    isExpanded,
    resize,
    getId
  });
  pop();
}
function Pane_resizer($$payload, $$props) {
  push();
  let {
    id = useId(),
    ref = null,
    disabled = false,
    onDraggingChange = noop,
    tabindex = 0,
    child,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const resizerState = usePaneResizer({
    id: box.with(() => id),
    ref: box.with(() => ref, (v) => ref = v),
    disabled: box.with(() => disabled),
    onDraggingChange: box.with(() => onDraggingChange),
    tabIndex: box.with(() => tabindex)
  });
  const mergedProps = mergeProps(restProps, resizerState.props);
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
function Resizable_handle($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    withHandle = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Pane_resizer($$payload2, spread_props([
      {
        "data-slot": "resizable-handle",
        class: cn("bg-border focus-visible:ring-ring focus-visible:outline-hidden relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 data-[direction=vertical]:h-px data-[direction=vertical]:w-full data-[direction=vertical]:after:left-0 data-[direction=vertical]:after:h-1 data-[direction=vertical]:after:w-full data-[direction=vertical]:after:-translate-y-1/2 data-[direction=vertical]:after:translate-x-0 [&[data-direction=vertical]>div]:rotate-90", className)
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
          if (withHandle) {
            $$payload3.out += "<!--[-->";
            $$payload3.out += `<div class="bg-border rounded-xs z-10 flex h-4 w-3 items-center justify-center border">`;
            Grip_vertical($$payload3, { class: "size-2.5" });
            $$payload3.out += `<!----></div>`;
          } else {
            $$payload3.out += "<!--[!-->";
          }
          $$payload3.out += `<!--]-->`;
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
function Resizable_pane_group($$payload, $$props) {
  push();
  let {
    ref = null,
    this: paneGroup = void 0,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<!---->`;
  Pane_group($$payload, spread_props([
    {
      "data-slot": "resizable-pane-group",
      class: cn("flex h-full w-full data-[direction=vertical]:flex-col", className)
    },
    restProps
  ]));
  $$payload.out += `<!---->`;
  bind_props($$props, { ref, this: paneGroup });
  pop();
}
class TemplateAPIService extends BaseAPIService {
  /**
   * Get all templates (local and remote)
   */
  async getAll() {
    const res = await this.api.get("/templates");
    return res.data;
  }
  /**
   * Get only local templates
   */
  async getLocal() {
    const res = await this.api.get("/templates?type=local");
    return res.data;
  }
  /**
   * Get only remote templates
   */
  async getRemote() {
    const res = await this.api.get("/templates?type=remote");
    return res.data;
  }
  /**
   * Get template content by ID
   */
  async getContent(id) {
    const res = await this.api.get(`/templates/${encodeURIComponent(id)}/content`);
    return res.data;
  }
  /**
   * Download and save a remote template locally
   */
  async download(id, localName) {
    const res = await this.api.post(`/templates/${encodeURIComponent(id)}/download`, {
      localName
    });
    return res.data;
  }
  /**
   * Create a new local template
   */
  async create(name, content, description, envContent) {
    const res = await this.api.post("/templates", {
      name,
      content,
      description,
      envContent
    });
    return res.data;
  }
  /**
   * Update an existing local template
   */
  async update(id, name, content, description, envContent) {
    const res = await this.api.put(`/templates/${encodeURIComponent(id)}`, {
      name,
      content,
      description,
      envContent
    });
    return res.data;
  }
  /**
   * Delete a local template
   */
  async delete(id) {
    const res = await this.api.delete(`/templates/${encodeURIComponent(id)}`);
    return res.data;
  }
  /**
   * Get template statistics
   */
  async getStats() {
    const res = await this.api.get("/templates/stats");
    return res.data;
  }
}
function Template_selection_dialog($$payload, $$props) {
  push();
  let { open = void 0, templates, onSelect } = $$props;
  const templateAPI = new TemplateAPIService();
  let loadingStates = /* @__PURE__ */ new Map();
  async function handleSelect(template) {
    loadingStates.set(template.id, true);
    loadingStates = new Map(loadingStates);
    try {
      let finalTemplate = template;
      if (template.isRemote) {
        const templateContent = await templateAPI.getContent(template.id);
        if (!templateContent.content) {
          toast.error("Failed to load template content");
          return;
        }
        finalTemplate = {
          ...template,
          content: templateContent.content,
          envContent: templateContent.envContent || template.envContent
        };
      }
      onSelect(finalTemplate);
      open = false;
      toast.success(`Template "${template.name}" loaded successfully!`);
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Failed to load template content");
    } finally {
      loadingStates.delete(template.id);
      loadingStates = new Map(loadingStates);
    }
  }
  async function handleDownload(template) {
    if (!template.isRemote) return;
    const templateId = template.id;
    loadingStates.set(`download-${templateId}`, true);
    loadingStates = new Map(loadingStates);
    try {
      const result = await templateAPI.download(templateId);
      if (result.success) {
        toast.success(`Template "${template.name}" downloaded successfully!`);
      } else {
        toast.error(result.message || "Failed to download template");
      }
    } catch (error) {
      console.error("Error downloading template:", error);
      let errorMessage = "Failed to download template";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "message" in error) {
        errorMessage = String(error.message);
      }
      toast.error(errorMessage);
    } finally {
      loadingStates.delete(`download-${templateId}`);
      loadingStates = new Map(loadingStates);
    }
  }
  const localTemplates = templates.filter((t) => !t.isRemote);
  const remoteTemplates = templates.filter((t) => t.isRemote);
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Root($$payload2, {
      get open() {
        return open;
      },
      set open($$value) {
        open = $$value;
        $$settled = false;
      },
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Dialog_content($$payload3, {
          class: "sm:max-w-[900px] max-h-screen overflow-y-auto",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  class: "flex items-center gap-2",
                  children: ($$payload6) => {
                    File_text($$payload6, { class: "size-5" });
                    $$payload6.out += `<!----> Choose a Template`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Select a Docker Compose template to get started quickly, or download remote templates for local use.`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <div class="space-y-6 py-4">`;
            if (templates.length === 0) {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<div class="text-center py-8 text-muted-foreground">`;
              File_text($$payload4, { class: "size-12 mx-auto mb-4 opacity-50" });
              $$payload4.out += `<!----> <p class="mb-2">No templates available</p> <p class="text-sm">Configure remote registries in <a href="/settings/templates" class="text-primary hover:underline">Template Settings</a> to access community templates</p></div>`;
            } else {
              $$payload4.out += "<!--[!-->";
              if (localTemplates.length > 0) {
                $$payload4.out += "<!--[-->";
                const each_array = ensure_array_like(localTemplates);
                $$payload4.out += `<div><h3 class="text-lg font-semibold mb-3 flex items-center gap-2">`;
                Folder_open($$payload4, { class: "size-5 text-blue-500" });
                $$payload4.out += `<!----> Local Templates (${escape_html(localTemplates.length)})</h3> <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><!--[-->`;
                for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                  let template = each_array[$$index];
                  Card($$payload4, {
                    class: "cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/20",
                    children: ($$payload5) => {
                      $$payload5.out += `<div class="p-4"><div class="flex items-start justify-between mb-2"><h4 class="font-semibold truncate pr-2">${escape_html(template.name)}</h4> <div class="flex gap-1 ml-2 flex-shrink-0">`;
                      Badge($$payload5, {
                        variant: "outline",
                        class: "text-xs",
                        children: ($$payload6) => {
                          Folder_open($$payload6, { class: "size-3 mr-1" });
                          $$payload6.out += `<!----> Local`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload5.out += `<!----> `;
                      if (template.envContent) {
                        $$payload5.out += "<!--[-->";
                        Badge($$payload5, {
                          variant: "secondary",
                          class: "text-xs",
                          children: ($$payload6) => {
                            Settings($$payload6, { class: "size-3 mr-1" });
                            $$payload6.out += `<!----> ENV`;
                          },
                          $$slots: { default: true }
                        });
                      } else {
                        $$payload5.out += "<!--[!-->";
                      }
                      $$payload5.out += `<!--]--></div></div> <p class="text-sm text-muted-foreground mb-3 line-clamp-2 svelte-1b0ih1q">${escape_html(template.description)}</p> <div class="flex justify-between items-center"><div class="text-xs text-muted-foreground">${escape_html(template.envContent ? "Includes environment variables" : "Ready to use")}</div> `;
                      Button($$payload5, {
                        size: "sm",
                        onclick: () => handleSelect(template),
                        disabled: loadingStates.get(template.id),
                        children: ($$payload6) => {
                          if (loadingStates.get(template.id)) {
                            $$payload6.out += "<!--[-->";
                            Loader_circle($$payload6, { class: "size-3 animate-spin mr-1" });
                            $$payload6.out += `<!----> Loading...`;
                          } else {
                            $$payload6.out += "<!--[!-->";
                            $$payload6.out += `Use Template`;
                          }
                          $$payload6.out += `<!--]-->`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload5.out += `<!----></div></div>`;
                    },
                    $$slots: { default: true }
                  });
                }
                $$payload4.out += `<!--]--></div></div>`;
              } else {
                $$payload4.out += "<!--[!-->";
              }
              $$payload4.out += `<!--]--> `;
              if (remoteTemplates.length > 0) {
                $$payload4.out += "<!--[-->";
                const each_array_1 = ensure_array_like(remoteTemplates);
                $$payload4.out += `<div><h3 class="text-lg font-semibold mb-3 flex items-center gap-2">`;
                Globe($$payload4, { class: "size-5 text-green-500" });
                $$payload4.out += `<!----> Remote Templates (${escape_html(remoteTemplates.length)})</h3> <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><!--[-->`;
                for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                  let template = each_array_1[$$index_1];
                  Card($$payload4, {
                    class: "hover:bg-muted/50 transition-colors border-2 hover:border-primary/20",
                    children: ($$payload5) => {
                      $$payload5.out += `<div class="p-4"><div class="flex items-start justify-between mb-2"><h4 class="font-semibold truncate pr-2">${escape_html(template.name)}</h4> <div class="flex gap-1 ml-2 flex-shrink-0">`;
                      Badge($$payload5, {
                        variant: "secondary",
                        class: "text-xs",
                        children: ($$payload6) => {
                          Globe($$payload6, { class: "size-3 mr-1" });
                          $$payload6.out += `<!----> ${escape_html(template.metadata?.registry || "Remote")}`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload5.out += `<!----> `;
                      if (template.metadata?.envUrl) {
                        $$payload5.out += "<!--[-->";
                        Badge($$payload5, {
                          variant: "secondary",
                          class: "text-xs",
                          children: ($$payload6) => {
                            Settings($$payload6, { class: "size-3 mr-1" });
                            $$payload6.out += `<!----> ENV`;
                          },
                          $$slots: { default: true }
                        });
                      } else {
                        $$payload5.out += "<!--[!-->";
                      }
                      $$payload5.out += `<!--]--></div></div> <p class="text-sm text-muted-foreground mb-2 line-clamp-2 svelte-1b0ih1q">${escape_html(template.description)}</p> `;
                      if (template.metadata?.author) {
                        $$payload5.out += "<!--[-->";
                        $$payload5.out += `<p class="text-xs text-muted-foreground mb-3">by ${escape_html(template.metadata.author)}</p>`;
                      } else {
                        $$payload5.out += "<!--[!-->";
                      }
                      $$payload5.out += `<!--]--> <div class="flex justify-between items-center gap-2"><div class="text-xs text-muted-foreground flex-1">`;
                      if (template.metadata?.version) {
                        $$payload5.out += "<!--[-->";
                        Badge($$payload5, {
                          variant: "outline",
                          class: "text-xs",
                          children: ($$payload6) => {
                            $$payload6.out += `<!---->v${escape_html(template.metadata.version)}`;
                          },
                          $$slots: { default: true }
                        });
                      } else {
                        $$payload5.out += "<!--[!-->";
                      }
                      $$payload5.out += `<!--]--></div> <div class="flex gap-2">`;
                      Button($$payload5, {
                        variant: "outline",
                        size: "sm",
                        onclick: () => handleDownload(template),
                        disabled: loadingStates.get(`download-${template.id}`),
                        children: ($$payload6) => {
                          if (loadingStates.get(`download-${template.id}`)) {
                            $$payload6.out += "<!--[-->";
                            Loader_circle($$payload6, { class: "size-3 animate-spin mr-1" });
                            $$payload6.out += `<!----> Downloading...`;
                          } else {
                            $$payload6.out += "<!--[!-->";
                            Download($$payload6, { class: "size-3 mr-1" });
                            $$payload6.out += `<!----> Download`;
                          }
                          $$payload6.out += `<!--]-->`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload5.out += `<!----> `;
                      Button($$payload5, {
                        size: "sm",
                        onclick: () => handleSelect(template),
                        disabled: loadingStates.get(template.id),
                        children: ($$payload6) => {
                          if (loadingStates.get(template.id)) {
                            $$payload6.out += "<!--[-->";
                            Loader_circle($$payload6, { class: "size-3 animate-spin mr-1" });
                            $$payload6.out += `<!----> Loading...`;
                          } else {
                            $$payload6.out += "<!--[!-->";
                            $$payload6.out += `Use Now`;
                          }
                          $$payload6.out += `<!--]-->`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload5.out += `<!----></div></div></div>`;
                    },
                    $$slots: { default: true }
                  });
                }
                $$payload4.out += `<!--]--></div></div>`;
              } else {
                $$payload4.out += "<!--[!-->";
              }
              $$payload4.out += `<!--]-->`;
            }
            $$payload4.out += `<!--]--></div> <!---->`;
            Dialog_footer($$payload4, {
              children: ($$payload5) => {
                Button($$payload5, {
                  variant: "outline",
                  onclick: () => open = false,
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Cancel`;
                  },
                  $$slots: { default: true }
                });
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!---->`;
          },
          $$slots: { default: true }
        });
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
  bind_props($$props, { open });
  pop();
}
function Dropdown_button($$payload, $$props) {
  push();
  let {
    class: className,
    ref = null,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<div${spread_attributes(
    {
      "data-slot": "dropdown-button",
      class: clsx$1(cn("flex", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></div>`;
  bind_props($$props, { ref });
  pop();
}
function Dropdown_button_main($$payload, $$props) {
  push();
  let {
    class: className,
    variant = "default",
    size = "default",
    ref = null,
    type = "button",
    disabled,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<button${spread_attributes(
    {
      "data-slot": "dropdown-button-main",
      class: clsx$1(cn(buttonVariants({ variant, size }), "rounded-r-none border-r-0", className)),
      type,
      disabled,
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></button>`;
  bind_props($$props, { ref });
  pop();
}
function Dropdown_button_trigger($$payload, $$props) {
  push();
  let {
    class: className,
    variant = "default",
    size = "default",
    ref = null,
    type = "button",
    disabled,
    builders = [],
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<button${spread_attributes(
    {
      "data-slot": "dropdown-button-trigger",
      class: clsx$1(cn(buttonVariants({ variant, size }), "rounded-l-none px-2 border-l border-l-background/20", className)),
      type,
      disabled,
      ...restProps
    },
    null
  )}>`;
  if (children) {
    $$payload.out += "<!--[-->";
    children($$payload);
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    Chevron_down($$payload, { class: "size-4" });
  }
  $$payload.out += `<!--]--></button>`;
  bind_props($$props, { ref });
  pop();
}
function Dropdown_button_content($$payload, $$props) {
  push();
  let {
    ref = null,
    sideOffset = 4,
    portalProps,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Portal($$payload2, spread_props([
      portalProps,
      {
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Dropdown_menu_content($$payload3, spread_props([
            {
              sideOffset,
              class: cn("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-md outline-none", className)
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
          $$payload3.out += `<!---->`;
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
function Dropdown_button_item($$payload, $$props) {
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
    Menu_item($$payload2, spread_props([
      {
        class: cn("data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", className)
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
function Dropdown_button_separator($$payload, $$props) {
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
    Menu_separator($$payload2, spread_props([
      {
        class: cn("bg-muted -mx-1 my-1 h-px", className)
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
const DropdownRoot = Menu;
const DropdownTrigger = Menu_trigger;
function _page($$payload, $$props) {
  push();
  let { data } = $$props;
  const stackApi = new StackAPIService();
  let saving = false;
  let converting = false;
  let showTemplateDialog = false;
  let selectedAgentId = "";
  let name = "";
  let composeContent = defaultComposeTemplate;
  let envContent = data.envTemplate || defaultEnvTemplate;
  let dockerRunCommand = "";
  const onlineAgents = data.agents || [];
  const agentOptions = onlineAgents.map((agent) => ({
    id: agent.id,
    label: `${agent.hostname} (${agent.platform})`,
    disabled: false
  }));
  const selectedAgent = onlineAgents.find((agent) => agent.id === selectedAgentId);
  async function handleSubmit() {
    if (selectedAgentId) {
      await handleDeployToAgent();
    } else {
      await handleCreateStack();
    }
  }
  async function handleCreateStack() {
    handleApiResultWithCallbacks({
      result: await tryCatch(stackApi.create(name, composeContent, envContent)),
      message: "Failed to Create Stack",
      setLoadingState: (value) => saving = value,
      onSuccess: async () => {
        toast.success(`Stack "${name}" created with environment file.`);
        await invalidateAll();
        goto();
      }
    });
  }
  async function handleDeployToAgent() {
    if (!selectedAgentId) {
      toast.error("Please select an agent for deployment");
      return;
    }
    const agent = onlineAgents.find((agent2) => agent2.id === selectedAgentId);
    if (!agent) {
      toast.error("Selected agent not found or offline");
      return;
    }
    saving = true;
    try {
      const response = await fetch(`/api/agents/${selectedAgentId}/deploy/stack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stackName: name,
          composeContent,
          envContent,
          mode: "compose"
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to deploy Compose Project: ${response.statusText}`);
      }
      const result = await response.json();
      toast.success(`Compose Project "${name}" deployed to agent ${agent.hostname}!`);
      goto(`/agents/${selectedAgentId}`);
    } catch (error) {
      console.error("Deploy error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to deploy Compose Project");
    } finally {
      saving = false;
    }
  }
  function handleDeployButtonClick() {
    handleSubmit();
  }
  function handleAgentSelect(option) {
    selectedAgentId = option.id;
  }
  async function handleConvertDockerRun() {
    if (!dockerRunCommand.trim()) {
      toast.error("Please enter a docker run command");
      return;
    }
    handleApiResultWithCallbacks({
      result: await tryCatch(stackApi.convertDockerRun(dockerRunCommand)),
      message: "Failed to Convert Docker Run Command",
      setLoadingState: (value) => converting = value,
      onSuccess: (data2) => {
        const { dockerCompose, envVars, serviceName } = data2;
        composeContent = dockerCompose;
        if (envVars) {
          envContent = envVars;
        }
        if (serviceName && !name) {
          name = serviceName;
        }
        toast.success("Docker run command converted successfully!");
        dockerRunCommand = "";
      }
    });
  }
  function handleTemplateSelect(template) {
    composeContent = template.content;
    if (template.envContent) {
      envContent = template.envContent;
    }
    if (!name.trim()) {
      name = template.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    }
    toast.success(`Template "${template.name}" loaded successfully!`);
  }
  const exampleCommands = [
    "docker run -d --name nginx -p 8080:80 -v nginx_data:/usr/share/nginx/html nginx:alpine",
    "docker run -d --name postgres -e POSTGRES_DB=mydb -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -v postgres_data:/var/lib/postgresql/data postgres:15",
    "docker run -d --name redis -p 6379:6379 --restart unless-stopped redis:alpine"
  ];
  function useExample(command) {
    dockerRunCommand = command;
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div class="space-y-6 pb-8"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><!---->`;
    Breadcrumb($$payload2, {
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Breadcrumb_list($$payload3, {
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Breadcrumb_item($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Breadcrumb_link($$payload5, {
                  href: "/",
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Dashboard`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Breadcrumb_separator($$payload4, {});
            $$payload4.out += `<!----> <!---->`;
            Breadcrumb_item($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Breadcrumb_link($$payload5, {
                  href: "/compose",
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Compose`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Breadcrumb_separator($$payload4, {});
            $$payload4.out += `<!----> <!---->`;
            Breadcrumb_item($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Breadcrumb_page($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->New Project`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <h1 class="text-2xl font-bold tracking-tight mt-2">Create New Compose Project</h1></div></div> `;
    Dropdown_card($$payload2, {
      id: "docker-run-converter",
      title: "Docker Run to Compose Converter",
      description: "Convert existing docker run commands to Docker Compose format",
      icon: Terminal,
      children: ($$payload3) => {
        const each_array = ensure_array_like(exampleCommands);
        $$payload3.out += `<div class="space-y-4"><div class="space-y-2">`;
        Label($$payload3, {
          for: "dockerRunCommand",
          children: ($$payload4) => {
            $$payload4.out += `<!---->Docker Run Command`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> `;
        Textarea($$payload3, {
          id: "dockerRunCommand",
          placeholder: "docker run -d --name my-app -p 8080:80 nginx:alpine",
          rows: 3,
          disabled: converting,
          class: "font-mono text-sm",
          get value() {
            return dockerRunCommand;
          },
          set value($$value) {
            dockerRunCommand = $$value;
            $$settled = false;
          }
        });
        $$payload3.out += `<!----></div> <div class="flex items-center gap-2">`;
        Button($$payload3, {
          type: "button",
          disabled: !dockerRunCommand.trim() || converting,
          size: "sm",
          onclick: handleConvertDockerRun,
          children: ($$payload4) => {
            if (converting) {
              $$payload4.out += "<!--[-->";
              Loader_circle($$payload4, { class: "mr-2 size-4 animate-spin" });
              $$payload4.out += `<!----> Converting...`;
            } else {
              $$payload4.out += "<!--[!-->";
              Wand($$payload4, { class: "mr-2 size-4" });
              $$payload4.out += `<!----> Convert to Compose`;
            }
            $$payload4.out += `<!--]-->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----></div> <div class="space-y-2">`;
        Label($$payload3, {
          class: "text-xs text-muted-foreground",
          children: ($$payload4) => {
            $$payload4.out += `<!---->Example Commands:`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <div class="space-y-1"><!--[-->`;
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let command = each_array[$$index];
          Button($$payload3, {
            type: "button",
            variant: "ghost",
            size: "sm",
            class: "h-auto p-2 text-xs font-mono text-left justify-start w-full",
            onclick: () => useExample(command),
            children: ($$payload4) => {
              Copy($$payload4, { class: "mr-2 size-3" });
              $$payload4.out += `<!----> ${escape_html(command)}`;
            },
            $$slots: { default: true }
          });
        }
        $$payload3.out += `<!--]--></div></div></div>`;
      }
    });
    $$payload2.out += `<!----> <form class="space-y-6"><!---->`;
    Card($$payload2, {
      class: "border shadow-sm",
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_header($$payload3, {
          children: ($$payload4) => {
            $$payload4.out += `<div class="flex items-center justify-between w-full"><div class="flex items-center gap-3"><div class="bg-primary/10 p-2 rounded-full">`;
            File_stack($$payload4, { class: "text-primary size-5" });
            $$payload4.out += `<!----></div> <div><!---->`;
            Card_title($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Compose Project Configuration`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Card_description($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Create a new Docker Compose Project with environment variables`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div></div> <div class="flex items-center gap-2">`;
            Arcane_button($$payload4, {
              action: "template",
              onClick: () => showTemplateDialog = true,
              loading: saving,
              disabled: saving || converting
            });
            $$payload4.out += `<!----> `;
            if (onlineAgents.length > 0) {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<!---->`;
              DropdownRoot($$payload4, {
                children: ($$payload5) => {
                  $$payload5.out += `<!---->`;
                  Dropdown_button($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->`;
                      Dropdown_button_main($$payload6, {
                        variant: "default",
                        disabled: !name || !composeContent || saving,
                        onclick: handleDeployButtonClick,
                        children: ($$payload7) => {
                          if (saving) {
                            $$payload7.out += "<!--[-->";
                            Loader_circle($$payload7, { class: "size-4 mr-2 animate-spin" });
                          } else {
                            $$payload7.out += "<!--[!-->";
                            Send($$payload7, { class: "size-4 mr-2" });
                          }
                          $$payload7.out += `<!--]--> ${escape_html(selectedAgent ? `Deploy to ${selectedAgent.hostname}` : "Deploy Locally")}`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> <!---->`;
                      DropdownTrigger($$payload6, {
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->`;
                          Dropdown_button_trigger($$payload7, {
                            variant: "default",
                            disabled: !name || !composeContent || saving
                          });
                          $$payload7.out += `<!---->`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!---->`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Dropdown_button_content($$payload5, {
                    align: "end",
                    class: "min-w-[200px]",
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->`;
                      Dropdown_button_item($$payload6, {
                        onclick: () => handleAgentSelect({ id: "" }),
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Deploy Locally`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      if (agentOptions.length > 0) {
                        $$payload6.out += "<!--[-->";
                        const each_array_1 = ensure_array_like(agentOptions);
                        $$payload6.out += `<!---->`;
                        Dropdown_button_separator($$payload6, {});
                        $$payload6.out += `<!----> <!--[-->`;
                        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                          let option = each_array_1[$$index_1];
                          $$payload6.out += `<!---->`;
                          Dropdown_button_item($$payload6, {
                            onclick: () => handleAgentSelect(option),
                            children: ($$payload7) => {
                              $$payload7.out += `<!---->${escape_html(option.label)}`;
                            },
                            $$slots: { default: true }
                          });
                          $$payload6.out += `<!---->`;
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
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            } else {
              $$payload4.out += "<!--[!-->";
              Arcane_button($$payload4, {
                action: "create",
                onClick: handleSubmit,
                loading: saving,
                disabled: !name || !composeContent
              });
            }
            $$payload4.out += `<!--]--></div></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card_content($$payload3, {
          children: ($$payload4) => {
            $$payload4.out += `<div class="space-y-4"><div class="grid w-full max-w-sm items-center gap-1.5">`;
            Label($$payload4, {
              for: "name",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Compose Project Name`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Input($$payload4, {
              type: "text",
              id: "name",
              name: "name",
              required: true,
              placeholder: "e.g., my-web-app",
              disabled: saving,
              get value() {
                return name;
              },
              set value($$value) {
                name = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----></div> <!---->`;
            Resizable_pane_group($$payload4, {
              direction: "horizontal",
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Pane($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<div class="space-y-2 mr-3">`;
                    Label($$payload6, {
                      for: "compose-editor",
                      class: "mb-2",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Docker Compose File`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <div class="border rounded-md overflow-hidden mt-2 h-[550px]">`;
                    Yaml_editor($$payload6, {
                      readOnly: saving,
                      get value() {
                        return composeContent;
                      },
                      set value($$value) {
                        composeContent = $$value;
                        $$settled = false;
                      }
                    });
                    $$payload6.out += `<!----></div> <p class="text-xs text-muted-foreground">Enter a valid compose.yaml file or choose from templates using the "Use Template" button above.</p></div>`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Resizable_handle($$payload5, {});
                $$payload5.out += `<!----> <!---->`;
                Pane($$payload5, {
                  defaultSize: 25,
                  children: ($$payload6) => {
                    $$payload6.out += `<div class="space-y-2 ml-3">`;
                    Label($$payload6, {
                      for: "env-editor",
                      class: "mb-2",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Environment Configuration (.env)`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <div class="border rounded-md overflow-hidden mt-2 h-[550px]">`;
                    Env_editor($$payload6, {
                      readOnly: saving,
                      get value() {
                        return envContent;
                      },
                      set value($$value) {
                        envContent = $$value;
                        $$settled = false;
                      }
                    });
                    $$payload6.out += `<!----></div> <p class="text-xs text-muted-foreground">`;
                    if (data.envTemplate) {
                      $$payload6.out += "<!--[-->";
                      $$payload6.out += `Environment variables loaded from template. Modify as needed.`;
                    } else {
                      $$payload6.out += "<!--[!-->";
                      $$payload6.out += `Define environment variables in KEY=value format. These will be saved as a .env file in the stack directory.`;
                    }
                    $$payload6.out += `<!--]--></p></div>`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card_footer($$payload3, {
          class: "flex justify-between",
          children: ($$payload4) => {
            Button($$payload4, {
              variant: "outline",
              type: "button",
              onclick: () => window.history.back(),
              disabled: saving,
              children: ($$payload5) => {
                Arrow_left($$payload5, { class: "mr-2 size-4" });
                $$payload5.out += `<!----> Cancel`;
              },
              $$slots: { default: true }
            });
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></form></div> `;
    Template_selection_dialog($$payload2, {
      templates: data.composeTemplates || [],
      onSelect: handleTemplateSelect,
      get open() {
        return showTemplateDialog;
      },
      set open($$value) {
        showTemplateDialog = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!---->`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
export {
  _page as default
};
