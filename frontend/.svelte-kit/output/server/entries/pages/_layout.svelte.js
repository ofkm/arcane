import { b as attr, a as pop, p as push, h as head, c as hasContext, g as getContext, s as setContext, d as attr_class, e as attr_style, f as clsx, j as spread_props, k as escape_html, l as ensure_array_like, m as spread_attributes, n as stringify, o as derived, q as props_id, t as bind_props, u as copy_payload, v as assign_payload, w as store_get, x as store_mutate, y as unsubscribe_stores } from "../../chunks/index3.js";
/* empty css               */
import "clsx";
import { c as createSubscriber, M as MediaQuery } from "../../chunks/index-server.js";
import { b as box } from "../../chunks/watch.svelte.js";
import "style-to-object";
import { t as toastState, c as cn, L as Loader, S as SonnerState } from "../../chunks/Toaster.svelte_svelte_type_style_lang.js";
import { p as page, n as navigating } from "../../chunks/index6.js";
import { R as Root$2, D as Dialog_content, a as Dialog_header, b as Dialog_title, c as Dialog_footer, d as Dialog_overlay, e as Dialog_content$1, f as Dialog_close, g as Dialog_title$1, h as Dialog_description, i as Dialog } from "../../chunks/index7.js";
import { c as confirmDialogStore } from "../../chunks/index8.js";
import { B as Button, c as cn$1 } from "../../chunks/button.js";
import { L as Label } from "../../chunks/label.js";
import { C as Checkbox } from "../../chunks/checkbox.js";
import { T as Triangle_alert } from "../../chunks/triangle-alert.js";
import { R as Root$3, T as Tooltip_trigger, a as Tooltip_content, P as Provider } from "../../chunks/index9.js";
import { tv } from "tailwind-variants";
import { c as createBitsAttrs, a as attachRef, b as createId, d as box$1, m as mergeProps, w as watch, g as getDataDisabled, e as getDataOpenClosed, f as getAriaExpanded } from "../../chunks/create-id.js";
import { D as DOMContext, a as afterTick, P as Presence_layer, b as Portal } from "../../chunks/scroll-lock.js";
import { X } from "../../chunks/x.js";
import { C as Context$1, S as SPACE, E as ENTER, n as noop } from "../../chunks/noop.js";
import { C as Chevron_right } from "../../chunks/chevron-right.js";
import { R as Root$4, T as Trigger$1, D as Dropdown_menu_content, G as Group } from "../../chunks/index10.js";
import { D as Dropdown_menu_label } from "../../chunks/dropdown-menu-label.js";
import { D as Dropdown_menu_separator } from "../../chunks/dropdown-menu-separator.js";
import { I as Icon } from "../../chunks/Icon.js";
import { S as Separator } from "../../chunks/separator.js";
import { E as External_link } from "../../chunks/external-link.js";
import { C as Container } from "../../chunks/container.js";
import { F as File_stack } from "../../chunks/file-stack.js";
import { N as Network } from "../../chunks/network.js";
import { H as Hard_drive } from "../../chunks/hard-drive.js";
import { L as Layout_template } from "../../chunks/layout-template.js";
import { S as Settings } from "../../chunks/settings.js";
import { D as Database } from "../../chunks/database.js";
import { U as User } from "../../chunks/user.js";
import { S as Shield } from "../../chunks/shield.js";
function html(value) {
  var html2 = String(value ?? "");
  var open = "<!---->";
  return open + html2 + "<!---->";
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
function getStorage(storageType, window2) {
  switch (storageType) {
    case "local":
      return window2.localStorage;
    case "session":
      return window2.sessionStorage;
  }
}
class PersistedState {
  #current;
  #key;
  #serializer;
  #storage;
  #subscribe;
  #version = 0;
  constructor(key, initialValue, options = {}) {
    const {
      storage: storageType = "local",
      serializer = {
        serialize: JSON.stringify,
        deserialize: JSON.parse
      },
      syncTabs = true,
      window: window2 = defaultWindow
    } = options;
    this.#current = initialValue;
    this.#key = key;
    this.#serializer = serializer;
    if (window2 === void 0) return;
    const storage = getStorage(storageType, window2);
    this.#storage = storage;
    const existingValue = storage.getItem(key);
    if (existingValue !== null) {
      this.#current = this.#deserialize(existingValue);
    } else {
      this.#serialize(initialValue);
    }
    if (syncTabs && storageType === "local") {
      this.#subscribe = createSubscriber();
    }
  }
  get current() {
    this.#subscribe?.();
    this.#version;
    const root = this.#deserialize(this.#storage?.getItem(this.#key)) ?? this.#current;
    const proxies = /* @__PURE__ */ new WeakMap();
    const proxy = (value) => {
      if (value === null || value?.constructor.name === "Date" || typeof value !== "object") {
        return value;
      }
      let p = proxies.get(value);
      if (!p) {
        p = new Proxy(value, {
          get: (target, property) => {
            this.#version;
            return proxy(Reflect.get(target, property));
          },
          set: (target, property, value2) => {
            this.#version += 1;
            Reflect.set(target, property, value2);
            this.#serialize(root);
            return true;
          }
        });
        proxies.set(value, p);
      }
      return p;
    };
    return proxy(root);
  }
  set current(newValue) {
    this.#serialize(newValue);
    this.#version += 1;
  }
  #handleStorageEvent = (event) => {
    if (event.key !== this.#key || event.newValue === null) return;
    this.#current = this.#deserialize(event.newValue);
    this.#version += 1;
  };
  #deserialize(value) {
    try {
      return this.#serializer.deserialize(value);
    } catch (error) {
      console.error(`Error when parsing "${value}" from persisted store "${this.#key}"`, error);
      return;
    }
  }
  #serialize(value) {
    try {
      if (value != void 0) {
        this.#storage?.setItem(this.#key, this.#serializer.serialize(value));
      }
    } catch (error) {
      console.error(`Error when writing value from persisted store "${this.#key}" to ${this.#storage}`, error);
    }
  }
}
function sanitizeClassNames(classNames) {
  return classNames.filter((className) => className.length > 0);
}
const noopStorage = {
  getItem: (_key) => null,
  setItem: (_key, _value) => {
  }
};
const isBrowser = typeof document !== "undefined";
const modeStorageKey = box("mode-watcher-mode");
const themeStorageKey = box("mode-watcher-theme");
const modes = ["dark", "light", "system"];
function isValidMode(value) {
  if (typeof value !== "string")
    return false;
  return modes.includes(value);
}
class UserPrefersMode {
  #defaultValue = "system";
  #storage = isBrowser ? localStorage : noopStorage;
  #initialValue = this.#storage.getItem(modeStorageKey.current);
  #value = isValidMode(this.#initialValue) ? this.#initialValue : this.#defaultValue;
  #persisted = this.#makePersisted();
  #makePersisted(value = this.#value) {
    return new PersistedState(modeStorageKey.current, value, {
      serializer: {
        serialize: (v) => v,
        deserialize: (v) => {
          if (isValidMode(v)) return v;
          return this.#defaultValue;
        }
      }
    });
  }
  constructor() {
  }
  get current() {
    return this.#persisted.current;
  }
  set current(newValue) {
    this.#persisted.current = newValue;
  }
}
class SystemPrefersMode {
  #defaultValue = void 0;
  #track = true;
  #current = this.#defaultValue;
  #mediaQueryState = typeof window !== "undefined" && typeof window.matchMedia === "function" ? new MediaQuery("prefers-color-scheme: light") : { current: false };
  query() {
    if (!isBrowser) return;
    this.#current = this.#mediaQueryState.current ? "light" : "dark";
  }
  tracking(active) {
    this.#track = active;
  }
  constructor() {
    this.query = this.query.bind(this);
    this.tracking = this.tracking.bind(this);
  }
  get current() {
    return this.#current;
  }
}
const userPrefersMode = new UserPrefersMode();
const systemPrefersMode = new SystemPrefersMode();
class CustomTheme {
  #storage = isBrowser ? localStorage : noopStorage;
  #initialValue = this.#storage.getItem(themeStorageKey.current);
  #value = this.#initialValue === null || this.#initialValue === void 0 ? "" : this.#initialValue;
  #persisted = this.#makePersisted();
  #makePersisted(value = this.#value) {
    return new PersistedState(themeStorageKey.current, value, {
      serializer: {
        serialize: (v) => {
          if (typeof v !== "string") return "";
          return v;
        },
        deserialize: (v) => v
      }
    });
  }
  constructor() {
  }
  /**
   * The current theme.
   * @returns The current theme.
   */
  get current() {
    return this.#persisted.current;
  }
  /**
   * Set the current theme.
   * @param newValue The new theme to set.
   */
  set current(newValue) {
    this.#persisted.current = newValue;
  }
}
const customTheme = new CustomTheme();
let timeoutAction;
let timeoutEnable;
let hasLoaded = false;
function withoutTransition(action) {
  if (typeof document === "undefined")
    return;
  if (!hasLoaded) {
    hasLoaded = true;
    action();
    return;
  }
  clearTimeout(timeoutAction);
  clearTimeout(timeoutEnable);
  const style = document.createElement("style");
  const css = document.createTextNode(`* {
     -webkit-transition: none !important;
     -moz-transition: none !important;
     -o-transition: none !important;
     -ms-transition: none !important;
     transition: none !important;
  }`);
  style.appendChild(css);
  const disable = () => document.head.appendChild(style);
  const enable = () => document.head.removeChild(style);
  if (typeof window.getComputedStyle !== "undefined") {
    disable();
    action();
    window.getComputedStyle(style).opacity;
    enable();
    return;
  }
  if (typeof window.requestAnimationFrame !== "undefined") {
    disable();
    action();
    window.requestAnimationFrame(enable);
    return;
  }
  disable();
  timeoutAction = window.setTimeout(() => {
    action();
    timeoutEnable = window.setTimeout(enable, 120);
  }, 120);
}
const themeColors = box(void 0);
const disableTransitions = box(true);
const darkClassNames = box([]);
const lightClassNames = box([]);
function createDerivedMode() {
  const current = (() => {
    if (!isBrowser) return void 0;
    const derivedMode2 = userPrefersMode.current === "system" ? systemPrefersMode.current : userPrefersMode.current;
    const sanitizedDarkClassNames = sanitizeClassNames(darkClassNames.current);
    const sanitizedLightClassNames = sanitizeClassNames(lightClassNames.current);
    function update() {
      const htmlEl = document.documentElement;
      const themeColorEl = document.querySelector('meta[name="theme-color"]');
      if (derivedMode2 === "light") {
        if (sanitizedDarkClassNames.length) htmlEl.classList.remove(...sanitizedDarkClassNames);
        if (sanitizedLightClassNames.length) htmlEl.classList.add(...sanitizedLightClassNames);
        htmlEl.style.colorScheme = "light";
        if (themeColorEl && themeColors.current) {
          themeColorEl.setAttribute("content", themeColors.current.light);
        }
      } else {
        if (sanitizedLightClassNames.length) htmlEl.classList.remove(...sanitizedLightClassNames);
        if (sanitizedDarkClassNames.length) htmlEl.classList.add(...sanitizedDarkClassNames);
        htmlEl.style.colorScheme = "dark";
        if (themeColorEl && themeColors.current) {
          themeColorEl.setAttribute("content", themeColors.current.dark);
        }
      }
    }
    if (disableTransitions.current) {
      withoutTransition(update);
    } else {
      update();
    }
    return derivedMode2;
  })();
  return {
    get current() {
      return current;
    }
  };
}
function createDerivedTheme() {
  const current = (() => {
    customTheme.current;
    if (!isBrowser) return void 0;
    function update() {
      const htmlEl = document.documentElement;
      htmlEl.setAttribute("data-theme", customTheme.current);
    }
    if (disableTransitions.current) {
      withoutTransition(update);
    } else {
      update();
    }
    return customTheme.current;
  })();
  return {
    get current() {
      return current;
    }
  };
}
const derivedMode = createDerivedMode();
createDerivedTheme();
function toggleMode() {
  userPrefersMode.current = derivedMode.current === "dark" ? "light" : "dark";
}
function defineConfig(config) {
  return config;
}
function setInitialMode({ defaultMode = "system", themeColors: themeColors2, darkClassNames: darkClassNames2 = ["dark"], lightClassNames: lightClassNames2 = [], defaultTheme = "", modeStorageKey: modeStorageKey2 = "mode-watcher-mode", themeStorageKey: themeStorageKey2 = "mode-watcher-theme" }) {
  const rootEl = document.documentElement;
  const mode = localStorage.getItem(modeStorageKey2) ?? defaultMode;
  const theme = localStorage.getItem(themeStorageKey2) ?? defaultTheme;
  const light = mode === "light" || mode === "system" && window.matchMedia("(prefers-color-scheme: light)").matches;
  if (light) {
    if (darkClassNames2.length)
      rootEl.classList.remove(...darkClassNames2.filter(Boolean));
    if (lightClassNames2.length)
      rootEl.classList.add(...lightClassNames2.filter(Boolean));
  } else {
    if (lightClassNames2.length)
      rootEl.classList.remove(...lightClassNames2.filter(Boolean));
    if (darkClassNames2.length)
      rootEl.classList.add(...darkClassNames2.filter(Boolean));
  }
  rootEl.style.colorScheme = light ? "light" : "dark";
  if (themeColors2) {
    const themeMetaEl = document.querySelector('meta[name="theme-color"]');
    if (themeMetaEl) {
      themeMetaEl.setAttribute("content", mode === "light" ? themeColors2.light : themeColors2.dark);
    }
  }
  if (theme) {
    rootEl.setAttribute("data-theme", theme);
    localStorage.setItem(themeStorageKey2, theme);
  }
  localStorage.setItem(modeStorageKey2, mode);
}
function Mode_watcher_lite($$payload, $$props) {
  push();
  let { themeColors: themeColors2 } = $$props;
  if (themeColors2) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<meta name="theme-color"${attr("content", themeColors2.dark)}/>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function Mode_watcher_full($$payload, $$props) {
  push();
  let { trueNonce = "", initConfig, themeColors: themeColors2 } = $$props;
  head($$payload, ($$payload2) => {
    if (themeColors2) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<meta name="theme-color"${attr("content", themeColors2.dark)}/>`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> ${html(`<script${trueNonce ? ` nonce=${trueNonce}` : ""}>(` + setInitialMode.toString() + `)(` + JSON.stringify(initConfig) + `);<\/script>`)}`;
  });
  pop();
}
function Mode_watcher($$payload, $$props) {
  push();
  let {
    defaultMode = "system",
    themeColors: themeColorsProp,
    disableTransitions: disableTransitionsProp = true,
    darkClassNames: darkClassNamesProp = ["dark"],
    lightClassNames: lightClassNamesProp = [],
    defaultTheme = "",
    nonce = "",
    themeStorageKey: themeStorageKeyProp = "mode-watcher-theme",
    modeStorageKey: modeStorageKeyProp = "mode-watcher-mode",
    disableHeadScriptInjection = false
  } = $$props;
  modeStorageKey.current = modeStorageKeyProp;
  themeStorageKey.current = themeStorageKeyProp;
  darkClassNames.current = darkClassNamesProp;
  lightClassNames.current = lightClassNamesProp;
  disableTransitions.current = disableTransitionsProp;
  themeColors.current = themeColorsProp;
  const initConfig = defineConfig({
    defaultMode,
    themeColors: themeColorsProp,
    darkClassNames: darkClassNamesProp,
    lightClassNames: lightClassNamesProp,
    defaultTheme,
    modeStorageKey: modeStorageKeyProp,
    themeStorageKey: themeStorageKeyProp
  });
  const trueNonce = typeof window === "undefined" ? nonce : "";
  if (disableHeadScriptInjection) {
    $$payload.out += "<!--[-->";
    Mode_watcher_lite($$payload, { themeColors: themeColors.current });
  } else {
    $$payload.out += "<!--[!-->";
    Mode_watcher_full($$payload, {
      trueNonce,
      initConfig,
      themeColors: themeColors.current
    });
  }
  $$payload.out += `<!--]-->`;
  pop();
}
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
const sonnerContext = new Context("<Toaster/>");
function isAction(action) {
  return action.label !== void 0;
}
const TOAST_LIFETIME$1 = 4e3;
const GAP$1 = 14;
const TIME_BEFORE_UNMOUNT = 200;
const DEFAULT_TOAST_CLASSES = {
  toast: "",
  title: "",
  description: "",
  loader: "",
  closeButton: "",
  cancelButton: "",
  actionButton: "",
  action: "",
  warning: "",
  error: "",
  success: "",
  default: "",
  info: "",
  loading: ""
};
function Toast($$payload, $$props) {
  push();
  let {
    toast,
    index,
    expanded,
    invert: invertFromToaster,
    position,
    visibleToasts,
    expandByDefault,
    closeButton: closeButtonFromToaster,
    interacting,
    cancelButtonStyle = "",
    actionButtonStyle = "",
    duration: durationFromToaster,
    descriptionClass = "",
    classes: classesProp,
    unstyled = false,
    loadingIcon,
    successIcon,
    errorIcon,
    warningIcon,
    closeIcon,
    infoIcon,
    defaultRichColors = false,
    swipeDirections: swipeDirectionsProp,
    closeButtonAriaLabel,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const defaultClasses = { ...DEFAULT_TOAST_CLASSES };
  let mounted = false;
  let removed = false;
  let swiping = false;
  let swipeOut = false;
  let isSwiped = false;
  let offsetBeforeRemove = 0;
  let initialHeight = 0;
  toast.duration || durationFromToaster || TOAST_LIFETIME$1;
  let swipeOutDirection = null;
  const isFront = index === 0;
  const isVisible = index + 1 <= visibleToasts;
  const toastType = toast.type;
  const dismissable = toast.dismissable !== false;
  const toastClass = toast.class || "";
  const toastDescriptionClass = toast.descriptionClass || "";
  const heightIndex = toastState.heights.findIndex((height) => height.toastId === toast.id) || 0;
  const closeButton = toast.closeButton ?? closeButtonFromToaster;
  toast.duration ?? durationFromToaster ?? TOAST_LIFETIME$1;
  const coords = position.split("-");
  const toastsHeightBefore = toastState.heights.reduce(
    (prev, curr, reducerIndex) => {
      if (reducerIndex >= heightIndex) return prev;
      return prev + curr.height;
    },
    0
  );
  const invert = toast.invert || invertFromToaster;
  const disabled = toastType === "loading";
  const classes = { ...defaultClasses, ...classesProp };
  toast.title;
  toast.description;
  const offset = Math.round(heightIndex * GAP$1 + toastsHeightBefore);
  function deleteToast() {
    removed = true;
    offsetBeforeRemove = offset;
    toastState.removeHeight(toast.id);
    setTimeout(
      () => {
        toastState.remove(toast.id);
      },
      TIME_BEFORE_UNMOUNT
    );
  }
  toast.promise && toastType === "loading" || toast.duration === Number.POSITIVE_INFINITY;
  const icon = (() => {
    if (toast.icon) return toast.icon;
    if (toastType === "success") return successIcon;
    if (toastType === "error") return errorIcon;
    if (toastType === "warning") return warningIcon;
    if (toastType === "info") return infoIcon;
    if (toastType === "loading") return loadingIcon;
    return null;
  })();
  function LoadingIcon($$payload2) {
    if (loadingIcon) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<div${attr_class(clsx(cn(classes?.loader, toast?.classes?.loader, "sonner-loader")))}${attr("data-visible", toastType === "loading")}>`;
      loadingIcon($$payload2);
      $$payload2.out += `<!----></div>`;
    } else {
      $$payload2.out += "<!--[!-->";
      Loader($$payload2, {
        class: cn(classes?.loader, toast.classes?.loader),
        visible: toastType === "loading"
      });
    }
    $$payload2.out += `<!--]-->`;
  }
  $$payload.out += `<li${attr("tabindex", 0)}${attr_class(clsx(cn(restProps.class, toastClass, classes?.toast, toast?.classes?.toast, classes?.[toastType], toast?.classes?.[toastType])))} data-sonner-toast=""${attr("data-rich-colors", toast.richColors ?? defaultRichColors)}${attr("data-styled", !(toast.component || toast.unstyled || unstyled))}${attr("data-mounted", mounted)}${attr("data-promise", Boolean(toast.promise))}${attr("data-swiped", isSwiped)}${attr("data-removed", removed)}${attr("data-visible", isVisible)}${attr("data-y-position", coords[0])}${attr("data-x-position", coords[1])}${attr("data-index", index)}${attr("data-front", isFront)}${attr("data-swiping", swiping)}${attr("data-dismissable", dismissable)}${attr("data-type", toastType)}${attr("data-invert", invert)}${attr("data-swipe-out", swipeOut)}${attr("data-swipe-direction", swipeOutDirection)}${attr("data-expanded", Boolean(expanded || expandByDefault && mounted))}${attr_style(`${restProps.style} ${toast.style}`, {
    "--index": index,
    "--toasts-before": index,
    "--z-index": toastState.toasts.length - index,
    "--offset": `${removed ? offsetBeforeRemove : offset}px`,
    "--initial-height": expandByDefault ? "auto" : `${initialHeight}px`
  })}>`;
  if (closeButton && !toast.component && toastType !== "loading" && closeIcon !== null) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<button${attr("aria-label", closeButtonAriaLabel)}${attr("data-disabled", disabled)} data-close-button=""${attr_class(clsx(cn(classes?.closeButton, toast?.classes?.closeButton)))}>`;
    closeIcon?.($$payload);
    $$payload.out += `<!----></button>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  if (toast.component) {
    $$payload.out += "<!--[-->";
    const Component = toast.component;
    $$payload.out += `<!---->`;
    Component($$payload, spread_props([
      toast.componentProps,
      { closeToast: deleteToast }
    ]));
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    if ((toastType || toast.icon || toast.promise) && toast.icon !== null && (icon !== null || toast.icon)) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<div data-icon=""${attr_class(clsx(cn(classes?.icon, toast?.classes?.icon)))}>`;
      if (toast.promise || toastType === "loading") {
        $$payload.out += "<!--[-->";
        if (toast.icon) {
          $$payload.out += "<!--[-->";
          $$payload.out += `<!---->`;
          toast.icon($$payload, {});
          $$payload.out += `<!---->`;
        } else {
          $$payload.out += "<!--[!-->";
          LoadingIcon($$payload);
        }
        $$payload.out += `<!--]-->`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--> `;
      if (toast.type !== "loading") {
        $$payload.out += "<!--[-->";
        if (toast.icon) {
          $$payload.out += "<!--[-->";
          $$payload.out += `<!---->`;
          toast.icon($$payload, {});
          $$payload.out += `<!---->`;
        } else if (toastType === "success") {
          $$payload.out += "<!--[1-->";
          successIcon?.($$payload);
          $$payload.out += `<!---->`;
        } else if (toastType === "error") {
          $$payload.out += "<!--[2-->";
          errorIcon?.($$payload);
          $$payload.out += `<!---->`;
        } else if (toastType === "warning") {
          $$payload.out += "<!--[3-->";
          warningIcon?.($$payload);
          $$payload.out += `<!---->`;
        } else if (toastType === "info") {
          $$payload.out += "<!--[4-->";
          infoIcon?.($$payload);
          $$payload.out += `<!---->`;
        } else {
          $$payload.out += "<!--[!-->";
        }
        $$payload.out += `<!--]-->`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--></div>`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--> <div data-content=""><div data-title=""${attr_class(clsx(cn(classes?.title, toast?.classes?.title)))}>`;
    if (toast.title) {
      $$payload.out += "<!--[-->";
      if (typeof toast.title !== "string") {
        $$payload.out += "<!--[-->";
        const Title = toast.title;
        $$payload.out += `<!---->`;
        Title($$payload, spread_props([toast.componentProps]));
        $$payload.out += `<!---->`;
      } else {
        $$payload.out += "<!--[!-->";
        $$payload.out += `${escape_html(toast.title)}`;
      }
      $$payload.out += `<!--]-->`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div> `;
    if (toast.description) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<div data-description=""${attr_class(clsx(cn(descriptionClass, toastDescriptionClass, classes?.description, toast.classes?.description)))}>`;
      if (typeof toast.description !== "string") {
        $$payload.out += "<!--[-->";
        const Description = toast.description;
        $$payload.out += `<!---->`;
        Description($$payload, spread_props([toast.componentProps]));
        $$payload.out += `<!---->`;
      } else {
        $$payload.out += "<!--[!-->";
        $$payload.out += `${escape_html(toast.description)}`;
      }
      $$payload.out += `<!--]--></div>`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div> `;
    if (toast.cancel) {
      $$payload.out += "<!--[-->";
      if (typeof toast.cancel === "function") {
        $$payload.out += "<!--[-->";
        $$payload.out += `<!---->`;
        toast.cancel($$payload, {});
        $$payload.out += `<!---->`;
      } else if (isAction(toast.cancel)) {
        $$payload.out += "<!--[1-->";
        $$payload.out += `<button data-button="" data-cancel=""${attr_style(toast.cancelButtonStyle ?? cancelButtonStyle)}${attr_class(clsx(cn(classes?.cancelButton, toast?.classes?.cancelButton)))}>${escape_html(toast.cancel.label)}</button>`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]-->`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--> `;
    if (toast.action) {
      $$payload.out += "<!--[-->";
      if (typeof toast.action === "function") {
        $$payload.out += "<!--[-->";
        $$payload.out += `<!---->`;
        toast.action($$payload, {});
        $$payload.out += `<!---->`;
      } else if (isAction(toast.action)) {
        $$payload.out += "<!--[1-->";
        $$payload.out += `<button data-button=""${attr_style(toast.actionButtonStyle ?? actionButtonStyle)}${attr_class(clsx(cn(classes?.actionButton, toast?.classes?.actionButton)))}>${escape_html(toast.action.label)}</button>`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]-->`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]-->`;
  }
  $$payload.out += `<!--]--></li>`;
  pop();
}
function SuccessIcon($$payload) {
  $$payload.out += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" height="20" width="20" data-sonner-success-icon=""><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"></path></svg>`;
}
function ErrorIcon($$payload) {
  $$payload.out += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" height="20" width="20" data-sonner-error-icon=""><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path></svg>`;
}
function WarningIcon($$payload) {
  $$payload.out += `<svg viewBox="0 0 64 64" fill="currentColor" height="20" width="20" data-sonner-warning-icon="" xmlns="http://www.w3.org/2000/svg"><path d="M32.427,7.987c2.183,0.124 4,1.165 5.096,3.281l17.936,36.208c1.739,3.66 -0.954,8.585 -5.373,8.656l-36.119,0c-4.022,-0.064 -7.322,-4.631 -5.352,-8.696l18.271,-36.207c0.342,-0.65 0.498,-0.838 0.793,-1.179c1.186,-1.375 2.483,-2.111 4.748,-2.063Zm-0.295,3.997c-0.687,0.034 -1.316,0.419 -1.659,1.017c-6.312,11.979 -12.397,24.081 -18.301,36.267c-0.546,1.225 0.391,2.797 1.762,2.863c12.06,0.195 24.125,0.195 36.185,0c1.325,-0.064 2.321,-1.584 1.769,-2.85c-5.793,-12.184 -11.765,-24.286 -17.966,-36.267c-0.366,-0.651 -0.903,-1.042 -1.79,-1.03Z"></path><path d="M33.631,40.581l-3.348,0l-0.368,-16.449l4.1,0l-0.384,16.449Zm-3.828,5.03c0,-0.609 0.197,-1.113 0.592,-1.514c0.396,-0.4 0.935,-0.601 1.618,-0.601c0.684,0 1.223,0.201 1.618,0.601c0.395,0.401 0.593,0.905 0.593,1.514c0,0.587 -0.193,1.078 -0.577,1.473c-0.385,0.395 -0.929,0.593 -1.634,0.593c-0.705,0 -1.249,-0.198 -1.634,-0.593c-0.384,-0.395 -0.576,-0.886 -0.576,-1.473Z"></path></svg>`;
}
function InfoIcon($$payload) {
  $$payload.out += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" height="20" width="20" data-sonner-info-icon=""><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd"></path></svg>`;
}
function CloseIcon($$payload) {
  $$payload.out += `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-sonner-close-icon=""><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
}
const VISIBLE_TOASTS_AMOUNT = 3;
const VIEWPORT_OFFSET = "24px";
const MOBILE_VIEWPORT_OFFSET = "16px";
const TOAST_LIFETIME = 4e3;
const TOAST_WIDTH = 356;
const GAP = 14;
const DARK = "dark";
const LIGHT = "light";
function getOffsetObject(defaultOffset, mobileOffset) {
  const styles = {};
  [defaultOffset, mobileOffset].forEach((offset, index) => {
    const isMobile = index === 1;
    const prefix = isMobile ? "--mobile-offset" : "--offset";
    const defaultValue = isMobile ? MOBILE_VIEWPORT_OFFSET : VIEWPORT_OFFSET;
    function assignAll(offset2) {
      ["top", "right", "bottom", "left"].forEach((key) => {
        styles[`${prefix}-${key}`] = typeof offset2 === "number" ? `${offset2}px` : offset2;
      });
    }
    if (typeof offset === "number" || typeof offset === "string") {
      assignAll(offset);
    } else if (typeof offset === "object") {
      ["top", "right", "bottom", "left"].forEach((key) => {
        const value = offset[key];
        if (value === void 0) {
          styles[`${prefix}-${key}`] = defaultValue;
        } else {
          styles[`${prefix}-${key}`] = typeof value === "number" ? `${value}px` : value;
        }
      });
    } else {
      assignAll(defaultValue);
    }
  });
  return styles;
}
function Toaster($$payload, $$props) {
  push();
  function getInitialTheme(t) {
    if (t !== "system") return t;
    if (typeof window !== "undefined") {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return DARK;
      }
      return LIGHT;
    }
    return LIGHT;
  }
  function getDocumentDirection() {
    if (typeof window === "undefined") return "ltr";
    if (typeof document === "undefined") return "ltr";
    const dirAttribute = document.documentElement.getAttribute("dir");
    if (dirAttribute === "auto" || !dirAttribute) {
      return window.getComputedStyle(document.documentElement).direction;
    }
    return dirAttribute;
  }
  let {
    invert = false,
    position = "bottom-right",
    hotkey = ["altKey", "KeyT"],
    expand = false,
    closeButton = false,
    offset = VIEWPORT_OFFSET,
    mobileOffset = MOBILE_VIEWPORT_OFFSET,
    theme = "light",
    richColors = false,
    duration = TOAST_LIFETIME,
    visibleToasts = VISIBLE_TOASTS_AMOUNT,
    toastOptions = {},
    dir = getDocumentDirection(),
    gap = GAP,
    loadingIcon: loadingIconProp,
    successIcon: successIconProp,
    errorIcon: errorIconProp,
    warningIcon: warningIconProp,
    closeIcon: closeIconProp,
    infoIcon: infoIconProp,
    containerAriaLabel = "Notifications",
    class: className,
    closeButtonAriaLabel = "Close toast",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const possiblePositions = Array.from(new Set([
    position,
    ...toastState.toasts.filter((toast) => toast.position).map((toast) => toast.position)
  ].filter(Boolean)));
  let expanded = false;
  let interacting = false;
  let actualTheme = getInitialTheme(theme);
  const hotkeyLabel = hotkey.join("+").replace(/Key/g, "").replace(/Digit/g, "");
  sonnerContext.set(new SonnerState());
  $$payload.out += `<section${attr("aria-label", `${stringify(containerAriaLabel)} ${stringify(hotkeyLabel)}`)}${attr("tabindex", -1)} aria-live="polite" aria-relevant="additions text" aria-atomic="false" class="svelte-tppj9g">`;
  if (toastState.toasts.length > 0) {
    $$payload.out += "<!--[-->";
    const each_array = ensure_array_like(possiblePositions);
    $$payload.out += `<!--[-->`;
    for (let index = 0, $$length = each_array.length; index < $$length; index++) {
      let position2 = each_array[index];
      const [y, x] = position2.split("-");
      const offsetObject = getOffsetObject(offset, mobileOffset);
      const each_array_1 = ensure_array_like(toastState.toasts.filter((toast) => !toast.position && index === 0 || toast.position === position2));
      $$payload.out += `<ol${spread_attributes(
        {
          tabindex: -1,
          dir: dir === "auto" ? getDocumentDirection() : dir,
          class: clsx(className),
          "data-sonner-toaster": true,
          "data-sonner-theme": actualTheme,
          "data-y-position": y,
          "data-x-position": x,
          style: restProps.style,
          ...restProps
        },
        "svelte-tppj9g",
        void 0,
        {
          "--front-toast-height": `${toastState.heights[0]?.height}px`,
          "--width": `${TOAST_WIDTH}px`,
          "--gap": `${gap}px`,
          "--offset-top": offsetObject["--offset-top"],
          "--offset-right": offsetObject["--offset-right"],
          "--offset-bottom": offsetObject["--offset-bottom"],
          "--offset-left": offsetObject["--offset-left"],
          "--mobile-offset-top": offsetObject["--mobile-offset-top"],
          "--mobile-offset-right": offsetObject["--mobile-offset-right"],
          "--mobile-offset-bottom": offsetObject["--mobile-offset-bottom"],
          "--mobile-offset-left": offsetObject["--mobile-offset-left"]
        }
      )}><!--[-->`;
      for (let index2 = 0, $$length2 = each_array_1.length; index2 < $$length2; index2++) {
        let toast = each_array_1[index2];
        {
          let successIcon = function($$payload2) {
            if (successIconProp) {
              $$payload2.out += "<!--[-->";
              successIconProp?.($$payload2);
              $$payload2.out += `<!---->`;
            } else if (successIconProp !== null) {
              $$payload2.out += "<!--[1-->";
              SuccessIcon($$payload2);
            } else {
              $$payload2.out += "<!--[!-->";
            }
            $$payload2.out += `<!--]-->`;
          }, errorIcon = function($$payload2) {
            if (errorIconProp) {
              $$payload2.out += "<!--[-->";
              errorIconProp?.($$payload2);
              $$payload2.out += `<!---->`;
            } else if (errorIconProp !== null) {
              $$payload2.out += "<!--[1-->";
              ErrorIcon($$payload2);
            } else {
              $$payload2.out += "<!--[!-->";
            }
            $$payload2.out += `<!--]-->`;
          }, warningIcon = function($$payload2) {
            if (warningIconProp) {
              $$payload2.out += "<!--[-->";
              warningIconProp?.($$payload2);
              $$payload2.out += `<!---->`;
            } else if (warningIconProp !== null) {
              $$payload2.out += "<!--[1-->";
              WarningIcon($$payload2);
            } else {
              $$payload2.out += "<!--[!-->";
            }
            $$payload2.out += `<!--]-->`;
          }, infoIcon = function($$payload2) {
            if (infoIconProp) {
              $$payload2.out += "<!--[-->";
              infoIconProp?.($$payload2);
              $$payload2.out += `<!---->`;
            } else if (infoIconProp !== null) {
              $$payload2.out += "<!--[1-->";
              InfoIcon($$payload2);
            } else {
              $$payload2.out += "<!--[!-->";
            }
            $$payload2.out += `<!--]-->`;
          }, closeIcon = function($$payload2) {
            if (closeIconProp) {
              $$payload2.out += "<!--[-->";
              closeIconProp?.($$payload2);
              $$payload2.out += `<!---->`;
            } else if (closeIconProp !== null) {
              $$payload2.out += "<!--[1-->";
              CloseIcon($$payload2);
            } else {
              $$payload2.out += "<!--[!-->";
            }
            $$payload2.out += `<!--]-->`;
          };
          Toast($$payload, {
            index: index2,
            toast,
            defaultRichColors: richColors,
            duration: toastOptions?.duration ?? duration,
            class: toastOptions?.class ?? "",
            descriptionClass: toastOptions?.descriptionClass || "",
            invert,
            visibleToasts,
            closeButton,
            interacting,
            position: position2,
            style: toastOptions?.style ?? "",
            classes: toastOptions.classes || {},
            unstyled: toastOptions.unstyled ?? false,
            cancelButtonStyle: toastOptions?.cancelButtonStyle ?? "",
            actionButtonStyle: toastOptions?.actionButtonStyle ?? "",
            closeButtonAriaLabel: toastOptions?.closeButtonAriaLabel ?? closeButtonAriaLabel,
            expandByDefault: expand,
            expanded,
            loadingIcon: loadingIconProp,
            successIcon,
            errorIcon,
            warningIcon,
            infoIcon,
            closeIcon,
            $$slots: {
              successIcon: true,
              errorIcon: true,
              warningIcon: true,
              infoIcon: true,
              closeIcon: true
            }
          });
        }
      }
      $$payload.out += `<!--]--></ol>`;
    }
    $$payload.out += `<!--]-->`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></section>`;
  pop();
}
function Sonner_1($$payload, $$props) {
  push();
  let { $$slots, $$events, ...restProps } = $$props;
  Toaster($$payload, spread_props([
    {
      theme: derivedMode.current,
      class: "toaster group",
      toastOptions: {
        classes: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
        }
      }
    },
    restProps
  ]));
  pop();
}
const avatarAttrs = createBitsAttrs({
  component: "avatar",
  parts: ["root", "image", "fallback"]
});
class AvatarRootState {
  opts;
  domContext;
  constructor(opts) {
    this.opts = opts;
    this.domContext = new DOMContext(this.opts.ref);
    this.loadImage = this.loadImage.bind(this);
  }
  loadImage(src, crossorigin, referrerPolicy) {
    if (this.opts.loadingStatus.current === "loaded") return;
    let imageTimerId;
    const image = new Image();
    image.src = src;
    if (crossorigin !== void 0) image.crossOrigin = crossorigin;
    if (referrerPolicy) image.referrerPolicy = referrerPolicy;
    this.opts.loadingStatus.current = "loading";
    image.onload = () => {
      imageTimerId = this.domContext.setTimeout(
        () => {
          this.opts.loadingStatus.current = "loaded";
        },
        this.opts.delayMs.current
      );
    };
    image.onerror = () => {
      this.opts.loadingStatus.current = "error";
    };
    return () => {
      this.domContext.clearTimeout(imageTimerId);
    };
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    [avatarAttrs.root]: "",
    "data-status": this.opts.loadingStatus.current,
    ...attachRef(this.opts.ref)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class AvatarImageState {
  opts;
  root;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    style: {
      display: this.root.opts.loadingStatus.current === "loaded" ? "block" : "none"
    },
    "data-status": this.root.opts.loadingStatus.current,
    [avatarAttrs.image]: "",
    src: this.opts.src.current,
    crossorigin: this.opts.crossOrigin.current,
    referrerpolicy: this.opts.referrerPolicy.current,
    ...attachRef(this.opts.ref)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class AvatarFallbackState {
  opts;
  root;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
  }
  #style = derived(() => this.root.opts.loadingStatus.current === "loaded" ? { display: "none" } : void 0);
  get style() {
    return this.#style();
  }
  set style($$value) {
    return this.#style($$value);
  }
  #props = derived(() => ({
    style: this.style,
    "data-status": this.root.opts.loadingStatus.current,
    [avatarAttrs.fallback]: "",
    ...attachRef(this.opts.ref)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
const AvatarRootContext = new Context$1("Avatar.Root");
function useAvatarRoot(props) {
  return AvatarRootContext.set(new AvatarRootState(props));
}
function useAvatarImage(props) {
  return new AvatarImageState(props, AvatarRootContext.get());
}
function useAvatarFallback(props) {
  return new AvatarFallbackState(props, AvatarRootContext.get());
}
function Avatar$1($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    delayMs = 0,
    loadingStatus = "loading",
    onLoadingStatusChange,
    child,
    children,
    id = createId(uid),
    ref = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const rootState = useAvatarRoot({
    delayMs: box$1.with(() => delayMs),
    loadingStatus: box$1.with(() => loadingStatus, (v) => {
      if (loadingStatus !== v) {
        loadingStatus = v;
        onLoadingStatusChange?.(v);
      }
    }),
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
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
  bind_props($$props, { loadingStatus, ref });
  pop();
}
function Avatar_image$1($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    src,
    child,
    id = createId(uid),
    ref = null,
    crossorigin = void 0,
    referrerpolicy = void 0,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const imageState = useAvatarImage({
    src: box$1.with(() => src),
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    crossOrigin: box$1.with(() => crossorigin),
    referrerPolicy: box$1.with(() => referrerpolicy)
  });
  const mergedProps = mergeProps(restProps, imageState.props);
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { props: mergedProps });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<img${spread_attributes({ ...mergedProps, src }, null)} onload="this.__e=event" onerror="this.__e=event"/>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { ref });
  pop();
}
function Avatar_fallback$1($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    children,
    child,
    id = createId(uid),
    ref = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const fallbackState = useAvatarFallback({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps(restProps, fallbackState.props);
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { props: mergedProps });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<span${spread_attributes({ ...mergedProps }, null)}>`;
    children?.($$payload);
    $$payload.out += `<!----></span>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { ref });
  pop();
}
const collapsibleAttrs = createBitsAttrs({
  component: "collapsible",
  parts: ["root", "content", "trigger"]
});
class CollapsibleRootState {
  opts;
  contentNode = null;
  constructor(opts) {
    this.opts = opts;
    this.toggleOpen = this.toggleOpen.bind(this);
  }
  toggleOpen() {
    this.opts.open.current = !this.opts.open.current;
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-state": getDataOpenClosed(this.opts.open.current),
    "data-disabled": getDataDisabled(this.opts.disabled.current),
    [collapsibleAttrs.root]: "",
    ...attachRef(this.opts.ref)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CollapsibleContentState {
  opts;
  root;
  #originalStyles;
  #isMountAnimationPrevented = false;
  #width = 0;
  #height = 0;
  #present = derived(() => this.opts.forceMount.current || this.root.opts.open.current);
  get present() {
    return this.#present();
  }
  set present($$value) {
    return this.#present($$value);
  }
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.#isMountAnimationPrevented = root.opts.open.current;
    watch(
      [
        () => this.opts.ref.current,
        () => this.present
      ],
      ([node]) => {
        if (!node) return;
        afterTick(() => {
          if (!this.opts.ref.current) return;
          this.#originalStyles = this.#originalStyles || {
            transitionDuration: node.style.transitionDuration,
            animationName: node.style.animationName
          };
          node.style.transitionDuration = "0s";
          node.style.animationName = "none";
          const rect = node.getBoundingClientRect();
          this.#height = rect.height;
          this.#width = rect.width;
          if (!this.#isMountAnimationPrevented) {
            const { animationName, transitionDuration } = this.#originalStyles;
            node.style.transitionDuration = transitionDuration;
            node.style.animationName = animationName;
          }
        });
      }
    );
  }
  #snippetProps = derived(() => ({ open: this.root.opts.open.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    style: {
      "--bits-collapsible-content-height": this.#height ? `${this.#height}px` : void 0,
      "--bits-collapsible-content-width": this.#width ? `${this.#width}px` : void 0
    },
    "data-state": getDataOpenClosed(this.root.opts.open.current),
    "data-disabled": getDataDisabled(this.root.opts.disabled.current),
    [collapsibleAttrs.content]: "",
    ...attachRef(this.opts.ref, (v) => this.root.contentNode = v)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CollapsibleTriggerState {
  opts;
  root;
  #isDisabled = derived(() => this.opts.disabled.current || this.root.opts.disabled.current);
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.onclick = this.onclick.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
  }
  onclick(e) {
    if (this.#isDisabled()) return;
    if (e.button !== 0) return e.preventDefault();
    this.root.toggleOpen();
  }
  onkeydown(e) {
    if (this.#isDisabled()) return;
    if (e.key === SPACE || e.key === ENTER) {
      e.preventDefault();
      this.root.toggleOpen();
    }
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    type: "button",
    disabled: this.#isDisabled(),
    "aria-controls": this.root.contentNode?.id,
    "aria-expanded": getAriaExpanded(this.root.opts.open.current),
    "data-state": getDataOpenClosed(this.root.opts.open.current),
    "data-disabled": getDataDisabled(this.#isDisabled()),
    [collapsibleAttrs.trigger]: "",
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
const CollapsibleRootContext = new Context$1("Collapsible.Root");
function useCollapsibleRoot(props) {
  return CollapsibleRootContext.set(new CollapsibleRootState(props));
}
function useCollapsibleTrigger(props) {
  return new CollapsibleTriggerState(props, CollapsibleRootContext.get());
}
function useCollapsibleContent(props) {
  return new CollapsibleContentState(props, CollapsibleRootContext.get());
}
function Collapsible($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    children,
    child,
    id = createId(uid),
    ref = null,
    open = false,
    disabled = false,
    onOpenChange = noop,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const rootState = useCollapsibleRoot({
    open: box$1.with(() => open, (v) => {
      open = v;
      onOpenChange(v);
    }),
    disabled: box$1.with(() => disabled),
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v)
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
  bind_props($$props, { ref, open });
  pop();
}
function Collapsible_content($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    child,
    ref = null,
    forceMount = false,
    children,
    id = createId(uid),
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const contentState = useCollapsibleContent({
    id: box$1.with(() => id),
    forceMount: box$1.with(() => forceMount),
    ref: box$1.with(() => ref, (v) => ref = v)
  });
  {
    let presence = function($$payload2, { present }) {
      const mergedProps = mergeProps(restProps, contentState.props, {
        hidden: forceMount ? void 0 : !present.current
      });
      if (child) {
        $$payload2.out += "<!--[-->";
        child($$payload2, {
          ...contentState.snippetProps,
          props: mergedProps
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
function Collapsible_trigger($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    children,
    child,
    ref = null,
    id = createId(uid),
    disabled = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const triggerState = useCollapsibleTrigger({
    id: box$1.with(() => id),
    ref: box$1.with(() => ref, (v) => ref = v),
    disabled: box$1.with(() => disabled)
  });
  const mergedProps = mergeProps(restProps, triggerState.props);
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
function Chevrons_up_down($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "m7 15 5 5 5-5" }],
    ["path", { "d": "m7 9 5-5 5 5" }]
  ];
  Icon($$payload, spread_props([
    { name: "chevrons-up-down" },
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
function Computer($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "rect",
      {
        "width": "14",
        "height": "8",
        "x": "5",
        "y": "2",
        "rx": "2"
      }
    ],
    [
      "rect",
      {
        "width": "20",
        "height": "8",
        "x": "2",
        "y": "14",
        "rx": "2"
      }
    ],
    ["path", { "d": "M6 18h2" }],
    ["path", { "d": "M12 18h6" }]
  ];
  Icon($$payload, spread_props([
    { name: "computer" },
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
function House($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
      }
    ],
    [
      "path",
      {
        "d": "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "house" },
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
function Image$1($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "rect",
      {
        "width": "18",
        "height": "18",
        "x": "3",
        "y": "3",
        "rx": "2",
        "ry": "2"
      }
    ],
    ["circle", { "cx": "9", "cy": "9", "r": "2" }],
    [
      "path",
      {
        "d": "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "image" },
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
function Log_out($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "m16 17 5-5-5-5" }],
    ["path", { "d": "M21 12H9" }],
    [
      "path",
      { "d": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "log-out" },
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
function Moon($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      { "d": "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "moon" },
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
function Sun($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "circle",
      { "cx": "12", "cy": "12", "r": "4" }
    ],
    ["path", { "d": "M12 2v2" }],
    ["path", { "d": "M12 20v2" }],
    ["path", { "d": "m4.93 4.93 1.41 1.41" }],
    ["path", { "d": "m17.66 17.66 1.41 1.41" }],
    ["path", { "d": "M2 12h2" }],
    ["path", { "d": "M20 12h2" }],
    ["path", { "d": "m6.34 17.66-1.41 1.41" }],
    ["path", { "d": "m19.07 4.93-1.41 1.41" }]
  ];
  Icon($$payload, spread_props([
    { name: "sun" },
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
function Confirm_dialog($$payload, $$props) {
  push();
  var $$store_subs;
  let checkboxStates = {};
  function handleConfirm() {
    console.log("Final checkbox states before confirm:", checkboxStates);
    store_get($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore).confirm.action(checkboxStates);
    store_mutate($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore, store_get($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore).open = false);
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Root$2($$payload2, {
      get open() {
        return store_get($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore).open;
      },
      set open($$value) {
        store_mutate($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore, store_get($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore).open = $$value);
        $$settled = false;
      },
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Dialog_content($$payload3, {
          class: "max-w-md w-full",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  class: "flex items-center gap-2 text-lg font-semibold",
                  children: ($$payload6) => {
                    Triangle_alert($$payload6, { class: "text-destructive shrink-0 size-5" });
                    $$payload6.out += `<!----> ${escape_html(store_get($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore).title)}`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <div class="mt-2 text-sm text-muted-foreground break-words min-w-0">${escape_html(store_get($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore).message)}</div> `;
            if (store_get($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore).checkboxes && store_get($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore).checkboxes.length > 0) {
              $$payload4.out += "<!--[-->";
              const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore).checkboxes);
              $$payload4.out += `<div class="flex flex-col gap-3 pt-4 pb-2 mt-4 border-t border-border"><!--[-->`;
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let checkbox = each_array[$$index];
                $$payload4.out += `<div class="flex items-center space-x-2">`;
                if (checkboxStates[checkbox.id] !== void 0) {
                  $$payload4.out += "<!--[-->";
                  Checkbox($$payload4, {
                    id: checkbox.id,
                    "aria-labelledby": `${checkbox.id}-label`,
                    get checked() {
                      return checkboxStates[checkbox.id];
                    },
                    set checked($$value) {
                      checkboxStates[checkbox.id] = $$value;
                      $$settled = false;
                    }
                  });
                } else {
                  $$payload4.out += "<!--[!-->";
                  Checkbox($$payload4, {
                    id: checkbox.id,
                    checked: false,
                    onchange: (e) => checkboxStates[checkbox.id] = true,
                    "aria-labelledby": `${checkbox.id}-label`
                  });
                }
                $$payload4.out += `<!--]--> `;
                Label($$payload4, {
                  id: `${checkbox.id}-label`,
                  for: checkbox.id,
                  class: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                  children: ($$payload5) => {
                    $$payload5.out += `<!---->${escape_html(checkbox.label)}`;
                  },
                  $$slots: { default: true }
                });
                $$payload4.out += `<!----></div>`;
              }
              $$payload4.out += `<!--]--></div>`;
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]--> <!---->`;
            Dialog_footer($$payload4, {
              class: "mt-6",
              children: ($$payload5) => {
                $$payload5.out += `<div class="flex justify-end gap-2">`;
                Button($$payload5, {
                  class: "arcane-button-cancel",
                  variant: "outline",
                  onclick: () => store_mutate($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore, store_get($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore).open = false),
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Cancel`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> `;
                Button($$payload5, {
                  class: "arcane-button-create",
                  variant: store_get($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore).confirm.destructive ? "destructive" : "default",
                  onclick: handleConfirm,
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->${escape_html(store_get($$store_subs ??= {}, "$confirmDialogStore", confirmDialogStore).confirm.label)}`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----></div>`;
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
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
const MOBILE_BREAKPOINT = 768;
class IsMobile extends MediaQuery {
  constructor() {
    super(`max-width: ${MOBILE_BREAKPOINT - 1}px`);
  }
}
const SIDEBAR_COOKIE_NAME = "sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
class SidebarState {
  props;
  #open = derived(() => this.props.open());
  get open() {
    return this.#open();
  }
  set open($$value) {
    return this.#open($$value);
  }
  openMobile = false;
  setOpen;
  #isMobile;
  #state = derived(() => this.open ? "expanded" : "collapsed");
  get state() {
    return this.#state();
  }
  set state($$value) {
    return this.#state($$value);
  }
  constructor(props) {
    this.setOpen = props.setOpen;
    this.#isMobile = new IsMobile();
    this.props = props;
  }
  // Convenience getter for checking if the sidebar is mobile
  // without this, we would need to use `sidebar.isMobile.current` everywhere
  get isMobile() {
    return this.#isMobile.current;
  }
  // Event handler to apply to the `<svelte:window>`
  handleShortcutKeydown = (e) => {
    if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.toggle();
    }
  };
  setOpenMobile = (value) => {
    this.openMobile = value;
  };
  toggle = () => {
    return this.#isMobile.current ? this.openMobile = !this.openMobile : this.setOpen(!this.open);
  };
}
const SYMBOL_KEY = "scn-sidebar";
function setSidebar(props) {
  return setContext(Symbol.for(SYMBOL_KEY), new SidebarState(props));
}
function useSidebar() {
  return getContext(Symbol.for(SYMBOL_KEY));
}
function Sidebar_content($$payload, $$props) {
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
      "data-slot": "sidebar-content",
      "data-sidebar": "content",
      class: clsx(cn$1("flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></div>`;
  bind_props($$props, { ref });
  pop();
}
function Sidebar_footer($$payload, $$props) {
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
      "data-slot": "sidebar-footer",
      "data-sidebar": "footer",
      class: clsx(cn$1("flex flex-col gap-2 p-2", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></div>`;
  bind_props($$props, { ref });
  pop();
}
function Sidebar_group_label($$payload, $$props) {
  push();
  let {
    ref = null,
    children,
    child,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const mergedProps = {
    class: cn$1("text-sidebar-foreground/70 ring-sidebar-ring outline-hidden flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0", "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0", className),
    "data-slot": "sidebar-group-label",
    "data-sidebar": "group-label",
    ...restProps
  };
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
function Sidebar_group($$payload, $$props) {
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
      "data-slot": "sidebar-group",
      "data-sidebar": "group",
      class: clsx(cn$1("relative flex w-full min-w-0 flex-col p-2", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></div>`;
  bind_props($$props, { ref });
  pop();
}
function Sidebar_header($$payload, $$props) {
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
      "data-slot": "sidebar-header",
      "data-sidebar": "header",
      class: clsx(cn$1("flex flex-col gap-2 p-2", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></div>`;
  bind_props($$props, { ref });
  pop();
}
const sidebarMenuButtonVariants = tv({
  base: "peer/menu-button outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground group-has-data-[sidebar=menu-action]/menu-item:pr-8 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-[width,height,padding] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:font-medium [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  variants: {
    variant: {
      default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      outline: "bg-background hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shadow-[0_0_0_1px_var(--sidebar-border)] hover:shadow-[0_0_0_1px_var(--sidebar-accent)]"
    },
    size: {
      default: "h-8 text-sm",
      sm: "h-7 text-xs",
      lg: "group-data-[collapsible=icon]:p-0! h-12 text-sm"
    }
  },
  defaultVariants: { variant: "default", size: "default" }
});
function Sidebar_menu_button($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    child,
    variant = "default",
    size = "default",
    isActive = false,
    tooltipContent,
    tooltipContentProps,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const sidebar = useSidebar();
  const buttonProps = {
    class: cn$1(sidebarMenuButtonVariants({ variant, size }), className),
    "data-slot": "sidebar-menu-button",
    "data-sidebar": "menu-button",
    "data-size": size,
    "data-active": isActive,
    ...restProps
  };
  function Button2($$payload2, { props }) {
    const mergedProps = mergeProps(buttonProps, props);
    if (child) {
      $$payload2.out += "<!--[-->";
      child($$payload2, { props: mergedProps });
      $$payload2.out += `<!---->`;
    } else {
      $$payload2.out += "<!--[!-->";
      $$payload2.out += `<button${spread_attributes({ ...mergedProps }, null)}>`;
      children?.($$payload2);
      $$payload2.out += `<!----></button>`;
    }
    $$payload2.out += `<!--]-->`;
  }
  if (!tooltipContent) {
    $$payload.out += "<!--[-->";
    Button2($$payload, {});
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<!---->`;
    Root$3($$payload, {
      children: ($$payload2) => {
        $$payload2.out += `<!---->`;
        {
          let child2 = function($$payload3, { props }) {
            Button2($$payload3, { props });
          };
          Tooltip_trigger($$payload2, { child: child2, $$slots: { child: true } });
        }
        $$payload2.out += `<!----> <!---->`;
        Tooltip_content($$payload2, spread_props([
          {
            side: "right",
            align: "center",
            hidden: sidebar.state !== "collapsed" || sidebar.isMobile
          },
          tooltipContentProps,
          {
            children: ($$payload3) => {
              if (typeof tooltipContent === "string") {
                $$payload3.out += "<!--[-->";
                $$payload3.out += `${escape_html(tooltipContent)}`;
              } else if (tooltipContent) {
                $$payload3.out += "<!--[1-->";
                tooltipContent($$payload3);
                $$payload3.out += `<!---->`;
              } else {
                $$payload3.out += "<!--[!-->";
              }
              $$payload3.out += `<!--]-->`;
            },
            $$slots: { default: true }
          }
        ]));
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!---->`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { ref });
  pop();
}
function Sidebar_menu_item($$payload, $$props) {
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
      "data-slot": "sidebar-menu-item",
      "data-sidebar": "menu-item",
      class: clsx(cn$1("group/menu-item relative", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></li>`;
  bind_props($$props, { ref });
  pop();
}
function Sidebar_menu_sub_button($$payload, $$props) {
  push();
  let {
    ref = null,
    children,
    child,
    class: className,
    size = "md",
    isActive = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const mergedProps = {
    class: cn$1("text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground outline-hidden flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0", "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground", size === "sm" && "text-xs", size === "md" && "text-sm", "group-data-[collapsible=icon]:hidden", className),
    "data-slot": "sidebar-menu-sub-button",
    "data-sidebar": "menu-sub-button",
    "data-size": size,
    "data-active": isActive,
    ...restProps
  };
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { props: mergedProps });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<a${spread_attributes({ ...mergedProps }, null)}>`;
    children?.($$payload);
    $$payload.out += `<!----></a>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { ref });
  pop();
}
function Sidebar_menu_sub_item($$payload, $$props) {
  push();
  let {
    ref = null,
    children,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out += `<li${spread_attributes(
    {
      "data-slot": "sidebar-menu-sub-item",
      "data-sidebar": "menu-sub-item",
      class: clsx(cn$1("group/menu-sub-item relative", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></li>`;
  bind_props($$props, { ref });
  pop();
}
function Sidebar_menu_sub($$payload, $$props) {
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
      "data-slot": "sidebar-menu-sub",
      "data-sidebar": "menu-sub",
      class: clsx(cn$1("border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5", "group-data-[collapsible=icon]:hidden", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></ul>`;
  bind_props($$props, { ref });
  pop();
}
function Sidebar_menu($$payload, $$props) {
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
      "data-slot": "sidebar-menu",
      "data-sidebar": "menu",
      class: clsx(cn$1("flex w-full min-w-0 flex-col gap-1", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></ul>`;
  bind_props($$props, { ref });
  pop();
}
function Sidebar_provider($$payload, $$props) {
  push();
  let {
    ref = null,
    open = true,
    onOpenChange = () => {
    },
    class: className,
    style,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  setSidebar({
    open: () => open,
    setOpen: (value) => {
      open = value;
      onOpenChange(value);
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    }
  });
  $$payload.out += `<!---->`;
  Provider($$payload, {
    delayDuration: 0,
    children: ($$payload2) => {
      $$payload2.out += `<div${spread_attributes(
        {
          "data-slot": "sidebar-wrapper",
          style: `--sidebar-width: ${stringify(SIDEBAR_WIDTH)}; --sidebar-width-icon: ${stringify(SIDEBAR_WIDTH_ICON)}; ${stringify(style)}`,
          class: clsx(cn$1("group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full", className)),
          ...restProps
        },
        null
      )}>`;
      children?.($$payload2);
      $$payload2.out += `<!----></div>`;
    }
  });
  $$payload.out += `<!---->`;
  bind_props($$props, { ref, open });
  pop();
}
function Sidebar_rail($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  useSidebar();
  $$payload.out += `<button${spread_attributes(
    {
      "data-sidebar": "rail",
      "data-slot": "sidebar-rail",
      "aria-label": "Toggle Sidebar",
      tabindex: -1,
      title: "Toggle Sidebar",
      class: clsx(cn$1("hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex", "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize", "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize", "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full", "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2", "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></button>`;
  bind_props($$props, { ref });
  pop();
}
function Sheet_overlay($$payload, $$props) {
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
    Dialog_overlay($$payload2, spread_props([
      {
        "data-slot": "sheet-overlay",
        class: cn$1("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50", className)
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
  bind_props($$props, { ref, class: className });
  pop();
}
const sheetVariants = tv({
  base: "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  variants: {
    side: {
      top: "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
      bottom: "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
      left: "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
      right: "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm"
    }
  },
  defaultVariants: { side: "right" }
});
function Sheet_content($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    side = "right",
    portalProps,
    children,
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
          Sheet_overlay($$payload3, {});
          $$payload3.out += `<!----> <!---->`;
          Dialog_content$1($$payload3, spread_props([
            {
              "data-slot": "sheet-content",
              class: cn$1(sheetVariants({ side }), className)
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
                $$payload4.out += `<!----> <!---->`;
                Dialog_close($$payload4, {
                  class: "ring-offset-background focus-visible:ring-ring rounded-xs focus-visible:outline-hidden absolute right-4 top-4 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none",
                  children: ($$payload5) => {
                    X($$payload5, { class: "size-4" });
                    $$payload5.out += `<!----> <span class="sr-only">Close</span>`;
                  },
                  $$slots: { default: true }
                });
                $$payload4.out += `<!---->`;
              },
              $$slots: { default: true }
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
function Sheet_header($$payload, $$props) {
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
      "data-slot": "sheet-header",
      class: clsx(cn$1("flex flex-col gap-1.5 p-4", className)),
      ...restProps
    },
    null
  )}>`;
  children?.($$payload);
  $$payload.out += `<!----></div>`;
  bind_props($$props, { ref });
  pop();
}
function Sheet_title($$payload, $$props) {
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
    Dialog_title$1($$payload2, spread_props([
      {
        "data-slot": "sheet-title",
        class: cn$1("text-foreground font-semibold", className)
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
function Sheet_description($$payload, $$props) {
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
    Dialog_description($$payload2, spread_props([
      {
        "data-slot": "sheet-description",
        class: cn$1("text-muted-foreground text-sm", className)
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
const Root$1 = Dialog;
function Sidebar($$payload, $$props) {
  push();
  let {
    ref = null,
    side = "left",
    variant = "sidebar",
    collapsible = "offcanvas",
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const sidebar = useSidebar();
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    if (collapsible === "none") {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<div${spread_attributes(
        {
          class: clsx(cn$1("bg-sidebar text-sidebar-foreground w-(--sidebar-width) flex h-full flex-col", className)),
          ...restProps
        },
        null
      )}>`;
      children?.($$payload2);
      $$payload2.out += `<!----></div>`;
    } else if (sidebar.isMobile) {
      $$payload2.out += "<!--[1-->";
      var bind_get = () => sidebar.openMobile;
      var bind_set = (v) => sidebar.setOpenMobile(v);
      $$payload2.out += `<!---->`;
      Root$1($$payload2, spread_props([
        {
          get open() {
            return bind_get();
          },
          set open($$value) {
            bind_set($$value);
          }
        },
        restProps,
        {
          children: ($$payload3) => {
            $$payload3.out += `<!---->`;
            Sheet_content($$payload3, {
              "data-sidebar": "sidebar",
              "data-slot": "sidebar",
              "data-mobile": "true",
              class: "bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden",
              style: `--sidebar-width: ${stringify(SIDEBAR_WIDTH_MOBILE)};`,
              side,
              children: ($$payload4) => {
                $$payload4.out += `<!---->`;
                Sheet_header($$payload4, {
                  class: "sr-only",
                  children: ($$payload5) => {
                    $$payload5.out += `<!---->`;
                    Sheet_title($$payload5, {
                      children: ($$payload6) => {
                        $$payload6.out += `<!---->Sidebar`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload5.out += `<!----> <!---->`;
                    Sheet_description($$payload5, {
                      children: ($$payload6) => {
                        $$payload6.out += `<!---->Displays the mobile sidebar.`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload5.out += `<!---->`;
                  },
                  $$slots: { default: true }
                });
                $$payload4.out += `<!----> <div class="flex h-full w-full flex-col">`;
                children?.($$payload4);
                $$payload4.out += `<!----></div>`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        }
      ]));
      $$payload2.out += `<!---->`;
    } else {
      $$payload2.out += "<!--[!-->";
      $$payload2.out += `<div class="text-sidebar-foreground group peer hidden md:block"${attr("data-state", sidebar.state)}${attr("data-collapsible", sidebar.state === "collapsed" ? collapsible : "")}${attr("data-variant", variant)}${attr("data-side", side)} data-slot="sidebar"><div data-slot="sidebar-gap"${attr_class(clsx(cn$1("w-(--sidebar-width) relative bg-transparent transition-[width] duration-200 ease-linear", "group-data-[collapsible=offcanvas]:w-0", "group-data-[side=right]:rotate-180", variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)")))}></div> <div${spread_attributes(
        {
          "data-slot": "sidebar-container",
          class: clsx(cn$1(
            "w-(--sidebar-width) fixed inset-y-0 z-10 hidden h-svh transition-[left,right,width] duration-200 ease-linear md:flex",
            side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
            // Adjust the padding for floating and inset variants.
            variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
            className
          )),
          ...restProps
        },
        null
      )}><div data-sidebar="sidebar" data-slot="sidebar-inner" class="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm">`;
      children?.($$payload2);
      $$payload2.out += `<!----></div></div></div>`;
    }
    $$payload2.out += `<!--]-->`;
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
const Root = Collapsible;
const Trigger = Collapsible_trigger;
const Content = Collapsible_content;
function Sidebar_itemgroup($$payload, $$props) {
  push();
  let { items, label } = $$props;
  function isActiveItem(url) {
    return page.url.pathname === url || page.url.pathname.startsWith(url) && url !== "/";
  }
  function hasActiveChild(items2) {
    return items2?.some((child) => isActiveItem(child.url)) ?? false;
  }
  const enhancedItems = items.map((item) => {
    const isItemActive = isActiveItem(item.url);
    const hasActiveSubItem = hasActiveChild(item.items);
    const isActive = isItemActive || hasActiveSubItem;
    return {
      ...item,
      isActive,
      items: item.items?.map((subItem) => ({
        ...subItem,
        isActive: isActiveItem(subItem.url)
      }))
    };
  });
  $$payload.out += `<!---->`;
  Sidebar_group($$payload, {
    children: ($$payload2) => {
      $$payload2.out += `<!---->`;
      Sidebar_group_label($$payload2, {
        children: ($$payload3) => {
          $$payload3.out += `<!---->${escape_html(label)}`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> <!---->`;
      Sidebar_menu($$payload2, {
        children: ($$payload3) => {
          const each_array = ensure_array_like(enhancedItems);
          $$payload3.out += `<!--[-->`;
          for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
            let item = each_array[$$index_1];
            if ((item.items?.length ?? 0) > 0) {
              $$payload3.out += "<!--[-->";
              $$payload3.out += `<!---->`;
              {
                let child = function($$payload4, { props }) {
                  $$payload4.out += `<!---->`;
                  Sidebar_menu_item($$payload4, spread_props([
                    props,
                    {
                      children: ($$payload5) => {
                        $$payload5.out += `<!---->`;
                        {
                          let child2 = function($$payload6, { props: props2 }) {
                            const Icon2 = item.icon;
                            $$payload6.out += `<!---->`;
                            Sidebar_menu_button($$payload6, spread_props([
                              props2,
                              {
                                tooltipContent: item.title,
                                isActive: item.isActive,
                                children: ($$payload7) => {
                                  if (item.icon) {
                                    $$payload7.out += "<!--[-->";
                                    $$payload7.out += `<!---->`;
                                    Icon2($$payload7, {});
                                    $$payload7.out += `<!---->`;
                                  } else {
                                    $$payload7.out += "<!--[!-->";
                                  }
                                  $$payload7.out += `<!--]--> <span>${escape_html(item.title)}</span> `;
                                  Chevron_right($$payload7, {
                                    class: "ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                                  });
                                  $$payload7.out += `<!---->`;
                                },
                                $$slots: { default: true }
                              }
                            ]));
                            $$payload6.out += `<!---->`;
                          };
                          Trigger($$payload5, { child: child2, $$slots: { child: true } });
                        }
                        $$payload5.out += `<!----> <!---->`;
                        Content($$payload5, {
                          children: ($$payload6) => {
                            $$payload6.out += `<!---->`;
                            Sidebar_menu_sub($$payload6, {
                              children: ($$payload7) => {
                                const each_array_1 = ensure_array_like(item.items ?? []);
                                $$payload7.out += `<!--[-->`;
                                for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
                                  let subItem = each_array_1[$$index];
                                  $$payload7.out += `<!---->`;
                                  Sidebar_menu_sub_item($$payload7, {
                                    children: ($$payload8) => {
                                      $$payload8.out += `<!---->`;
                                      {
                                        let child2 = function($$payload9, { props: props2 }) {
                                          const SubIcon = subItem.icon;
                                          $$payload9.out += `<a${spread_attributes({ href: subItem.url, ...props2 }, null)}>`;
                                          if (subItem.icon) {
                                            $$payload9.out += "<!--[-->";
                                            $$payload9.out += `<!---->`;
                                            SubIcon($$payload9, {});
                                            $$payload9.out += `<!---->`;
                                          } else {
                                            $$payload9.out += "<!--[!-->";
                                          }
                                          $$payload9.out += `<!--]--> <span>${escape_html(subItem.title)}</span></a>`;
                                        };
                                        Sidebar_menu_sub_button($$payload8, {
                                          isActive: subItem.isActive,
                                          child: child2,
                                          $$slots: { child: true }
                                        });
                                      }
                                      $$payload8.out += `<!---->`;
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$payload7.out += `<!---->`;
                                }
                                $$payload7.out += `<!--]-->`;
                              },
                              $$slots: { default: true }
                            });
                            $$payload6.out += `<!---->`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload5.out += `<!---->`;
                      },
                      $$slots: { default: true }
                    }
                  ]));
                  $$payload4.out += `<!---->`;
                };
                Root($$payload3, {
                  open: item.isActive,
                  class: "group/collapsible",
                  child,
                  $$slots: { child: true }
                });
              }
              $$payload3.out += `<!---->`;
            } else {
              $$payload3.out += "<!--[!-->";
              $$payload3.out += `<!---->`;
              Sidebar_menu_item($$payload3, {
                children: ($$payload4) => {
                  $$payload4.out += `<!---->`;
                  {
                    let child = function($$payload5, { props }) {
                      const Icon2 = item.icon;
                      $$payload5.out += `<a${spread_attributes({ href: item.url, ...props }, null)}>`;
                      if (item.icon) {
                        $$payload5.out += "<!--[-->";
                        $$payload5.out += `<!---->`;
                        Icon2($$payload5, {});
                        $$payload5.out += `<!---->`;
                      } else {
                        $$payload5.out += "<!--[!-->";
                      }
                      $$payload5.out += `<!--]--> <span>${escape_html(item.title)}</span></a>`;
                    };
                    Sidebar_menu_button($$payload4, {
                      isActive: item.isActive,
                      tooltipContent: item.title,
                      child,
                      $$slots: { child: true }
                    });
                  }
                  $$payload4.out += `<!---->`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!---->`;
            }
            $$payload3.out += `<!--]-->`;
          }
          $$payload3.out += `<!--]-->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!---->`;
  pop();
}
function Avatar($$payload, $$props) {
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
    Avatar$1($$payload2, spread_props([
      {
        "data-slot": "avatar",
        class: cn$1("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)
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
function Avatar_image($$payload, $$props) {
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
    Avatar_image$1($$payload2, spread_props([
      {
        "data-slot": "avatar-image",
        class: cn$1("aspect-square size-full", className)
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
function Avatar_fallback($$payload, $$props) {
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
    Avatar_fallback$1($$payload2, spread_props([
      {
        "data-slot": "avatar-fallback",
        class: cn$1("bg-muted flex size-full items-center justify-center rounded-full", className)
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
function Sidebar_user($$payload, $$props) {
  push();
  let { user, isCollapsed } = $$props;
  const sidebar = useSidebar();
  let gravatarUrl = "";
  $$payload.out += `<!---->`;
  Sidebar_menu($$payload, {
    children: ($$payload2) => {
      $$payload2.out += `<!---->`;
      Sidebar_menu_item($$payload2, {
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Root$4($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->`;
              {
                let child = function($$payload5, { props }) {
                  $$payload5.out += `<!---->`;
                  Sidebar_menu_button($$payload5, spread_props([
                    {
                      size: "lg",
                      class: "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    },
                    props,
                    {
                      children: ($$payload6) => {
                        if (user && user.displayName) {
                          $$payload6.out += "<!--[-->";
                          $$payload6.out += `<!---->`;
                          Avatar($$payload6, {
                            class: "size-8 rounded-lg",
                            children: ($$payload7) => {
                              $$payload7.out += `<!---->`;
                              Avatar_image($$payload7, { src: gravatarUrl, alt: user.displayName });
                              $$payload7.out += `<!----> <!---->`;
                              Avatar_fallback($$payload7, {
                                class: "rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-primary border border-primary/20",
                                children: ($$payload8) => {
                                  $$payload8.out += `<!---->${escape_html(user.displayName?.charAt(0).toUpperCase())}`;
                                },
                                $$slots: { default: true }
                              });
                              $$payload7.out += `<!---->`;
                            },
                            $$slots: { default: true }
                          });
                          $$payload6.out += `<!----> `;
                          if (!isCollapsed) {
                            $$payload6.out += "<!--[-->";
                            $$payload6.out += `<div class="grid flex-1 text-left text-sm leading-tight"><span class="truncate font-medium">${escape_html(user.displayName)}</span> <span class="truncate text-xs">${escape_html(user.email)}</span></div> `;
                            Chevrons_up_down($$payload6, { class: "ml-auto size-4" });
                            $$payload6.out += `<!---->`;
                          } else {
                            $$payload6.out += "<!--[!-->";
                          }
                          $$payload6.out += `<!--]-->`;
                        } else {
                          $$payload6.out += "<!--[!-->";
                        }
                        $$payload6.out += `<!--]-->`;
                      },
                      $$slots: { default: true }
                    }
                  ]));
                  $$payload5.out += `<!---->`;
                };
                Trigger$1($$payload4, { child, $$slots: { child: true } });
              }
              $$payload4.out += `<!----> <!---->`;
              Dropdown_menu_content($$payload4, {
                class: "w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg",
                side: sidebar.isMobile ? "bottom" : "right",
                align: "end",
                sideOffset: 4,
                children: ($$payload5) => {
                  $$payload5.out += `<!---->`;
                  Dropdown_menu_label($$payload5, {
                    class: "p-0 font-normal",
                    children: ($$payload6) => {
                      $$payload6.out += `<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm"><!---->`;
                      Avatar($$payload6, {
                        class: "size-8 rounded-lg",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->`;
                          Avatar_image($$payload7, { src: gravatarUrl, alt: user.displayName });
                          $$payload7.out += `<!----> <!---->`;
                          Avatar_fallback($$payload7, {
                            class: "rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-primary border border-primary/20",
                            children: ($$payload8) => {
                              $$payload8.out += `<!---->${escape_html(user.displayName?.charAt(0).toUpperCase())}`;
                            },
                            $$slots: { default: true }
                          });
                          $$payload7.out += `<!---->`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> <div class="grid flex-1 text-left text-sm leading-tight"><span class="truncate font-medium">${escape_html(user.displayName)}</span> <span class="truncate text-xs">${escape_html(user.email)}</span></div></div>`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Dropdown_menu_separator($$payload5, {});
                  $$payload5.out += `<!----> <!---->`;
                  Group($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->`;
                      Button($$payload6, {
                        variant: "ghost",
                        class: cn$1("w-full flex items-center text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-gradient-to-br hover:from-muted/80 hover:to-muted/60 hover:text-foreground rounded-xl mb-1", "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]", isCollapsed ? "justify-center px-2 py-3 h-11" : "justify-start gap-3 px-3 py-2.5 h-11"),
                        title: isCollapsed ? "Toggle theme" : void 0,
                        onclick: toggleMode,
                        children: ($$payload7) => {
                          $$payload7.out += `<div class="p-1 rounded-lg transition-colors duration-200 bg-transparent group-hover:bg-muted-foreground/10">`;
                          if (derivedMode.current === "dark") {
                            $$payload7.out += "<!--[-->";
                            Sun($$payload7, {
                              size: 16,
                              class: "transition-transform duration-200"
                            });
                          } else {
                            $$payload7.out += "<!--[!-->";
                            Moon($$payload7, {
                              size: 16,
                              class: "transition-transform duration-200"
                            });
                          }
                          $$payload7.out += `<!--]--></div> `;
                          if (!isCollapsed) {
                            $$payload7.out += "<!--[-->";
                            $$payload7.out += `<span class="font-medium">Toggle theme</span>`;
                          } else {
                            $$payload7.out += "<!--[!-->";
                          }
                          $$payload7.out += `<!--]-->`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!---->`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Dropdown_menu_separator($$payload5, {});
                  $$payload5.out += `<!----> <form action="/auth/logout" method="POST"><!---->`;
                  Button($$payload5, {
                    variant: "ghost",
                    class: cn$1("w-full flex items-center text-sm font-medium transition-all duration-200 text-muted-foreground rounded-xl", "hover:bg-gradient-to-br hover:from-destructive/10 hover:to-destructive/5 hover:text-destructive hover:shadow-md hover:scale-[1.02] active:scale-[0.98]", isCollapsed ? "justify-center px-2 py-3 h-11" : "justify-start gap-3 px-3 py-2.5 h-11"),
                    title: isCollapsed ? "Logout" : void 0,
                    type: "submit",
                    children: ($$payload6) => {
                      $$payload6.out += `<div class="p-1 rounded-lg transition-colors duration-200 bg-transparent group-hover:bg-destructive/10">`;
                      Log_out($$payload6, {
                        size: 16,
                        class: "transition-transform duration-200"
                      });
                      $$payload6.out += `<!----></div> `;
                      if (!isCollapsed) {
                        $$payload6.out += "<!--[-->";
                        $$payload6.out += `<span class="font-medium">Logout</span>`;
                      } else {
                        $$payload6.out += "<!--[!-->";
                      }
                      $$payload6.out += `<!--]-->`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----></form>`;
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
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!---->`;
  pop();
}
function Sidebar_logo($$payload, $$props) {
  push();
  let { isCollapsed, versionInformation } = $$props;
  $$payload.out += `<div${attr_class(clsx(cn$1("flex items-center h-16 transition-all duration-300 border-b border-border/30", isCollapsed ? "justify-center px-2" : "gap-3 px-6")))}><div class="shrink-0 flex items-center justify-center relative"><div${attr_class(clsx(cn$1("rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center font-semibold border border-primary/20 transition-all duration-300", isCollapsed ? "size-8" : "size-10")))}><img src="/img/arcane.svg" alt="Arcane"${attr_class(clsx(cn$1("transition-all duration-300 drop-shadow-sm", isCollapsed ? "size-5" : "size-7")))}${attr("width", isCollapsed ? "20" : "28")}${attr("height", isCollapsed ? "20" : "28")}/></div> <div${attr_class(clsx(cn$1("absolute inset-0 bg-primary/10 rounded-full blur-xl opacity-60 transition-all duration-300", isCollapsed ? "scale-75" : "scale-100")))}></div></div> `;
  if (!isCollapsed) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="flex flex-col justify-center min-w-0"><span class="text-lg font-bold tracking-tight leading-none bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Arcane</span> <span class="text-xs text-muted-foreground/80 font-medium">v${escape_html(versionInformation?.currentVersion)}</span></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div>`;
  pop();
}
function Sidebar_updatebanner($$payload, $$props) {
  push();
  let {
    isCollapsed,
    versionInformation,
    updateAvailable = false
  } = $$props;
  const sidebar = useSidebar();
  if (updateAvailable) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div${attr_class(clsx(cn$1("pb-2", isCollapsed ? "px-1" : "px-4")))}><!---->`;
    Separator($$payload, { class: "mb-3 opacity-30" });
    $$payload.out += `<!----> `;
    if (!isCollapsed) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<div class="transition-all rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:shadow-md hover:scale-[1.02] hover:from-blue-500/15 hover:to-blue-600/10 p-3"><a${attr("href", versionInformation?.releaseUrl)} target="_blank" rel="noopener noreferrer" class="flex items-center justify-between text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200 group"><div class="flex flex-col gap-1"><span class="text-sm font-semibold">Update available</span> <span class="text-xs text-blue-500/80">v${escape_html(versionInformation?.newestVersion)}</span></div> `;
      External_link($$payload, {
        size: 16,
        class: "transition-transform duration-200 group-hover:scale-110"
      });
      $$payload.out += `<!----></a></div>`;
    } else {
      $$payload.out += "<!--[!-->";
      $$payload.out += `<div class="flex justify-center"><!---->`;
      Root$3($$payload, {
        children: ($$payload2) => {
          $$payload2.out += `<!---->`;
          {
            let child = function($$payload3, { props }) {
              $$payload3.out += `<div${spread_attributes(
                {
                  class: "w-8 h-8 transition-all rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:shadow-md hover:scale-[1.02] hover:from-blue-500/15 hover:to-blue-600/10 flex items-center justify-center",
                  ...props
                },
                null
              )}><a${attr("href", versionInformation?.releaseUrl)} target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 hover:scale-110 flex items-center justify-center w-full h-full">`;
              External_link($$payload3, { size: 14 });
              $$payload3.out += `<!----></a></div>`;
            };
            Tooltip_trigger($$payload2, { child, $$slots: { child: true } });
          }
          $$payload2.out += `<!----> <!---->`;
          Tooltip_content($$payload2, {
            side: "right",
            align: "center",
            hidden: sidebar.state !== "collapsed" || sidebar.isMobile,
            children: ($$payload3) => {
              $$payload3.out += `<!---->Update available: v${escape_html(versionInformation?.newestVersion)}`;
            },
            $$slots: { default: true }
          });
          $$payload2.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload.out += `<!----></div>`;
    }
    $$payload.out += `<!--]--></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
const staticData = {
  settingsItems: [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      items: [
        {
          title: "General",
          url: "/settings/general",
          icon: Settings
        },
        {
          title: "Docker",
          url: "/settings/docker",
          icon: Database
        },
        {
          title: "Users",
          url: "/settings/users",
          icon: User
        },
        {
          title: "Security",
          url: "/settings/security",
          icon: Shield
        },
        {
          title: "Agents (Preview)",
          url: "/agents",
          icon: Computer
        }
      ]
    }
  ],
  customizationItems: [
    {
      title: "Templates",
      url: "/settings/templates",
      icon: Layout_template
    }
  ],
  managementItems: [
    { title: "Dashboard", url: "/", icon: House },
    {
      title: "Containers",
      url: "/containers",
      icon: Container
    },
    {
      title: "Compose Projects",
      url: "/compose",
      icon: File_stack
    },
    {
      title: "Images",
      url: "/images",
      icon: Image$1
    },
    {
      title: "Networks",
      url: "/networks",
      icon: Network
    },
    {
      title: "Volumes",
      url: "/volumes",
      icon: Hard_drive
    }
  ]
};
function Sidebar_1($$payload, $$props) {
  push();
  let {
    ref = null,
    collapsible = "icon",
    user,
    versionInformation,
    hasLocalDocker,
    agents,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const sidebar = useSidebar();
  const isCollapsed = sidebar.state === "collapsed";
  $$payload.out += `<!---->`;
  Sidebar($$payload, spread_props([
    { collapsible },
    restProps,
    {
      children: ($$payload2) => {
        $$payload2.out += `<!---->`;
        Sidebar_header($$payload2, {
          children: ($$payload3) => {
            Sidebar_logo($$payload3, { isCollapsed, versionInformation });
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!----> <!---->`;
        Sidebar_content($$payload2, {
          children: ($$payload3) => {
            Sidebar_itemgroup($$payload3, {
              label: "Management",
              items: staticData.managementItems
            });
            $$payload3.out += `<!----> `;
            Sidebar_itemgroup($$payload3, {
              label: "Customization",
              items: staticData.customizationItems
            });
            $$payload3.out += `<!----> `;
            Sidebar_itemgroup($$payload3, {
              label: "Administration",
              items: staticData.settingsItems
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!----> <!---->`;
        Sidebar_footer($$payload2, {
          children: ($$payload3) => {
            Sidebar_updatebanner($$payload3, {
              isCollapsed,
              versionInformation,
              updateAvailable: versionInformation.updateAvailable
            });
            $$payload3.out += `<!----> `;
            if (user) {
              $$payload3.out += "<!--[-->";
              Sidebar_user($$payload3, { isCollapsed, user });
            } else {
              $$payload3.out += "<!--[!-->";
            }
            $$payload3.out += `<!--]-->`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!----> <!---->`;
        Sidebar_rail($$payload2, {});
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    }
  ]));
  $$payload.out += `<!---->`;
  bind_props($$props, { ref });
  pop();
}
function _layout($$payload, $$props) {
  push();
  let { children, data } = $$props;
  const versionInformation = data.versionInformation;
  const user = data.user;
  const agents = data.agents;
  const isNavigating = navigating.type !== null;
  const isAuthenticated = !!user;
  const isOnboardingPage = page.url.pathname.startsWith("/onboarding");
  const isLoginPage = page.url.pathname === "/login" || page.url.pathname.startsWith("/auth/login") || page.url.pathname === "/auth" || page.url.pathname.includes("/login");
  const showSidebar = isAuthenticated && !isOnboardingPage && !isLoginPage;
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Arcane</title>`;
  });
  Mode_watcher($$payload, {});
  $$payload.out += `<!----> `;
  Sonner_1($$payload, { richColors: true });
  $$payload.out += `<!----> `;
  Confirm_dialog($$payload);
  $$payload.out += `<!----> `;
  if (isNavigating) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="fixed top-0 left-0 right-0 z-50 h-2"><div class="h-full bg-primary animate-pulse"></div></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <div class="flex min-h-screen bg-background">`;
  if (showSidebar) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<!---->`;
    Sidebar_provider($$payload, {
      children: ($$payload2) => {
        Sidebar_1($$payload2, {
          hasLocalDocker: data.hasLocalDocker || false,
          agents: agents || [],
          versionInformation,
          user
        });
        $$payload2.out += `<!----> <main class="flex-1"><section class="p-6">`;
        children($$payload2);
        $$payload2.out += `<!----></section></main>`;
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<main class="flex-1">`;
    children($$payload);
    $$payload.out += `<!----></main>`;
  }
  $$payload.out += `<!--]--></div>`;
  pop();
}
export {
  _layout as default
};
