import { o as derived, p as push, j as spread_props, a as pop, q as props_id, m as spread_attributes, t as bind_props, u as copy_payload, v as assign_payload, k as escape_html, h as head, x as store_mutate, w as store_get, b as attr, y as unsubscribe_stores } from "../../../../chunks/index3.js";
import { C as Card } from "../../../../chunks/card.js";
import { a as Card_header, b as Card_title, C as Card_content } from "../../../../chunks/card-title.js";
import { C as Card_description } from "../../../../chunks/card-description.js";
import "clsx";
import { I as Input } from "../../../../chunks/input.js";
import { S as Switch } from "../../../../chunks/switch.js";
import { c as cn, B as Button } from "../../../../chunks/button.js";
import { w as watch, c as createBitsAttrs, a as attachRef, g as getDataDisabled, h as getAriaRequired, i as getAriaChecked, b as createId, d as box, m as mergeProps } from "../../../../chunks/create-id.js";
import "style-to-object";
import { C as Context, S as SPACE, n as noop } from "../../../../chunks/noop.js";
import { u as useRovingFocus } from "../../../../chunks/use-roving-focus.svelte.js";
import { H as Hidden_input } from "../../../../chunks/hidden-input.js";
import { I as Icon } from "../../../../chunks/Icon.js";
import { L as Label } from "../../../../chunks/label.js";
import { s as settingsStore, a as saveSettingsToServer } from "../../../../chunks/settings-store.js";
import { U as Universal_table, T as Table_cell, E as Ellipsis } from "../../../../chunks/universal-table.js";
import { R as Root$1, T as Trigger, D as Dropdown_menu_content } from "../../../../chunks/index10.js";
import { R as Root, D as Dialog_content, a as Dialog_header, b as Dialog_title, c as Dialog_footer } from "../../../../chunks/index7.js";
import { D as Dialog_description } from "../../../../chunks/dialog-description.js";
import { L as Loader_circle } from "../../../../chunks/loader-circle.js";
import { o as openConfirmDialog } from "../../../../chunks/index8.js";
import { a as toast } from "../../../../chunks/Toaster.svelte_svelte_type_style_lang.js";
import { i as invalidateAll } from "../../../../chunks/client.js";
import { h as handleApiResultWithCallbacks } from "../../../../chunks/api.util.js";
import { t as tryCatch } from "../../../../chunks/try-catch.js";
import { S as Save } from "../../../../chunks/save.js";
import { S as Server } from "../../../../chunks/server.js";
import { K as Key } from "../../../../chunks/key.js";
import { P as Plus } from "../../../../chunks/plus.js";
import { D as Dropdown_menu_item } from "../../../../chunks/dropdown-menu-item.js";
import { P as Pencil } from "../../../../chunks/pencil.js";
import { T as Trash_2 } from "../../../../chunks/trash-2.js";
import { R as Refresh_cw } from "../../../../chunks/refresh-cw.js";
const radioGroupAttrs = createBitsAttrs({
  component: "radio-group",
  parts: ["root", "item"]
});
class RadioGroupRootState {
  opts;
  #hasValue = derived(() => this.opts.value.current !== "");
  get hasValue() {
    return this.#hasValue();
  }
  set hasValue($$value) {
    return this.#hasValue($$value);
  }
  rovingFocusGroup;
  constructor(opts) {
    this.opts = opts;
    this.rovingFocusGroup = useRovingFocus({
      rootNode: this.opts.ref,
      candidateAttr: radioGroupAttrs.item,
      loop: this.opts.loop,
      orientation: this.opts.orientation
    });
  }
  isChecked(value) {
    return this.opts.value.current === value;
  }
  setValue(value) {
    this.opts.value.current = value;
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "radiogroup",
    "aria-required": getAriaRequired(this.opts.required.current),
    "data-disabled": getDataDisabled(this.opts.disabled.current),
    "data-orientation": this.opts.orientation.current,
    [radioGroupAttrs.root]: "",
    ...attachRef(this.opts.ref)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class RadioGroupItemState {
  opts;
  root;
  #checked = derived(() => this.root.opts.value.current === this.opts.value.current);
  get checked() {
    return this.#checked();
  }
  set checked($$value) {
    return this.#checked($$value);
  }
  #isDisabled = derived(() => this.opts.disabled.current || this.root.opts.disabled.current);
  #isChecked = derived(() => this.root.isChecked(this.opts.value.current));
  #tabIndex = -1;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    if (this.opts.value.current === this.root.opts.value.current) {
      this.root.rovingFocusGroup.setCurrentTabStopId(this.opts.id.current);
      this.#tabIndex = 0;
    } else if (!this.root.opts.value.current) {
      this.#tabIndex = 0;
    }
    watch(
      [
        () => this.opts.value.current,
        () => this.root.opts.value.current
      ],
      () => {
        if (this.opts.value.current === this.root.opts.value.current) {
          this.root.rovingFocusGroup.setCurrentTabStopId(this.opts.id.current);
          this.#tabIndex = 0;
        }
      }
    );
    this.onclick = this.onclick.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
    this.onfocus = this.onfocus.bind(this);
  }
  onclick(_) {
    if (this.opts.disabled.current) return;
    this.root.setValue(this.opts.value.current);
  }
  onfocus(_) {
    if (!this.root.hasValue) return;
    this.root.setValue(this.opts.value.current);
  }
  onkeydown(e) {
    if (this.#isDisabled()) return;
    if (e.key === SPACE) {
      e.preventDefault();
      this.root.setValue(this.opts.value.current);
      return;
    }
    this.root.rovingFocusGroup.handleKeydown(this.opts.ref.current, e, true);
  }
  #snippetProps = derived(() => ({ checked: this.#isChecked() }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    disabled: this.#isDisabled() ? true : void 0,
    "data-value": this.opts.value.current,
    "data-orientation": this.root.opts.orientation.current,
    "data-disabled": getDataDisabled(this.#isDisabled()),
    "data-state": this.#isChecked() ? "checked" : "unchecked",
    "aria-checked": getAriaChecked(this.#isChecked(), false),
    [radioGroupAttrs.item]: "",
    type: "button",
    role: "radio",
    tabindex: this.#tabIndex,
    //
    onkeydown: this.onkeydown,
    onfocus: this.onfocus,
    onclick: this.onclick,
    ...attachRef(this.opts.ref)
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class RadioGroupInputState {
  root;
  #shouldRender = derived(() => this.root.opts.name.current !== void 0);
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  #props = derived(() => ({
    name: this.root.opts.name.current,
    value: this.root.opts.value.current,
    required: this.root.opts.required.current,
    disabled: this.root.opts.disabled.current
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
  constructor(root) {
    this.root = root;
  }
}
const RadioGroupRootContext = new Context("RadioGroup.Root");
function useRadioGroupRoot(props) {
  return RadioGroupRootContext.set(new RadioGroupRootState(props));
}
function useRadioGroupItem(props) {
  return new RadioGroupItemState(props, RadioGroupRootContext.get());
}
function useRadioGroupInput() {
  return new RadioGroupInputState(RadioGroupRootContext.get());
}
function Radio_group_input($$payload, $$props) {
  push();
  const inputState = useRadioGroupInput();
  if (inputState.shouldRender) {
    $$payload.out += "<!--[-->";
    Hidden_input($$payload, spread_props([inputState.props]));
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
function Radio_group$1($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    disabled = false,
    children,
    child,
    value = "",
    ref = null,
    orientation = "vertical",
    loop = true,
    name = void 0,
    required = false,
    id = createId(uid),
    onValueChange = noop,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const rootState = useRadioGroupRoot({
    orientation: box.with(() => orientation),
    disabled: box.with(() => disabled),
    loop: box.with(() => loop),
    name: box.with(() => name),
    required: box.with(() => required),
    id: box.with(() => id),
    value: box.with(() => value, (v) => {
      if (v === value) return;
      value = v;
      onValueChange?.(v);
    }),
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
  $$payload.out += `<!--]--> `;
  Radio_group_input($$payload);
  $$payload.out += `<!---->`;
  bind_props($$props, { value, ref });
  pop();
}
function Radio_group_item$1($$payload, $$props) {
  push();
  const uid = props_id($$payload);
  let {
    id = createId(uid),
    children,
    child,
    value,
    disabled = false,
    ref = null,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const itemState = useRadioGroupItem({
    value: box.with(() => value),
    disabled: box.with(() => disabled ?? false),
    id: box.with(() => id),
    ref: box.with(() => ref, (v) => ref = v)
  });
  const mergedProps = mergeProps(restProps, itemState.props);
  if (child) {
    $$payload.out += "<!--[-->";
    child($$payload, { props: mergedProps, ...itemState.snippetProps });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<button${spread_attributes({ ...mergedProps }, null)}>`;
    children?.($$payload, itemState.snippetProps);
    $$payload.out += `<!----></button>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { ref });
  pop();
}
function Circle($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "circle",
      { "cx": "12", "cy": "12", "r": "10" }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "circle" },
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
function Image_minus($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"
      }
    ],
    [
      "line",
      {
        "x1": "16",
        "x2": "22",
        "y1": "5",
        "y2": "5"
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
    { name: "image-minus" },
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
function Radio_group($$payload, $$props) {
  push();
  let {
    ref = null,
    class: className,
    value = "",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Radio_group$1($$payload2, spread_props([
      { class: cn("grid gap-2", className) },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        },
        get value() {
          return value;
        },
        set value($$value) {
          value = $$value;
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
  bind_props($$props, { ref, value });
  pop();
}
function Radio_group_item($$payload, $$props) {
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
    {
      let children = function($$payload3, { checked }) {
        $$payload3.out += `<div class="flex items-center justify-center">`;
        if (checked) {
          $$payload3.out += "<!--[-->";
          Circle($$payload3, { class: "size-2.5 fill-current text-current" });
        } else {
          $$payload3.out += "<!--[!-->";
        }
        $$payload3.out += `<!--]--></div>`;
      };
      Radio_group_item$1($$payload2, spread_props([
        {
          class: cn("border-primary text-primary ring-offset-background focus-visible:ring-ring aspect-square size-4 rounded-full border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)
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
  bind_props($$props, { ref });
  pop();
}
function Registry_form_dialog($$payload, $$props) {
  push();
  let {
    open = false,
    credentialToEdit = void 0,
    onSubmit,
    isLoading
  } = $$props;
  let internalCredential = { url: "", username: "", password: "" };
  function handleOpenChange(newOpenState) {
    open = newOpenState;
    if (!newOpenState) {
      credentialToEdit = null;
    }
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Root($$payload2, {
      onOpenChange: handleOpenChange,
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
          class: "sm:max-w-[425px]",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->${escape_html("Add")} Docker Registry`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->${escape_html("Enter the details for the new Docker registry.")}`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <form class="grid gap-4 py-4"><div class="grid grid-cols-3 items-center gap-4">`;
            Label($$payload4, {
              for: "registry-url",
              class: "text-right",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Registry URL`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Input($$payload4, {
              id: "registry-url",
              class: "col-span-2",
              placeholder: "e.g., docker.io, ghcr.io",
              required: true,
              get value() {
                return internalCredential.url;
              },
              set value($$value) {
                internalCredential.url = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----></div> <div class="grid grid-cols-3 items-center gap-4">`;
            Label($$payload4, {
              for: "registry-username",
              class: "text-right",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Username`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Input($$payload4, {
              id: "registry-username",
              class: "col-span-2",
              placeholder: "Your registry username",
              get value() {
                return internalCredential.username;
              },
              set value($$value) {
                internalCredential.username = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----></div> <div class="grid grid-cols-3 items-center gap-4">`;
            Label($$payload4, {
              for: "registry-password",
              class: "text-right",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Password/Token`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Input($$payload4, {
              type: "password",
              id: "registry-password",
              class: "col-span-2",
              placeholder: "Your registry password or token",
              get value() {
                return internalCredential.password;
              },
              set value($$value) {
                internalCredential.password = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----></div> <p class="text-xs text-muted-foreground col-span-full text-center px-4">For Docker Hub, if URL is empty or 'docker.io', it defaults to Docker Hub. For others like GHCR, provide the full URL.</p> <!---->`;
            Dialog_footer($$payload4, {
              children: ($$payload5) => {
                Button($$payload5, {
                  type: "button",
                  class: "arcane-button-cancel",
                  variant: "outline",
                  onclick: () => open = false,
                  disabled: isLoading,
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Cancel`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> `;
                Button($$payload5, {
                  type: "submit",
                  class: "arcane-button-create",
                  disabled: isLoading,
                  children: ($$payload6) => {
                    if (isLoading) {
                      $$payload6.out += "<!--[-->";
                      Loader_circle($$payload6, { class: "mr-2 animate-spin size-4" });
                    } else {
                      $$payload6.out += "<!--[!-->";
                    }
                    $$payload6.out += `<!--]--> ${escape_html("Add Registry")}`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></form>`;
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
  bind_props($$props, { open, credentialToEdit });
  pop();
}
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  let isRegistryDialogOpen = false;
  let registryToEdit = null;
  let isLoadingRegistryAction = false;
  let isLoading = { saving: false };
  function openCreateRegistryDialog() {
    registryToEdit = null;
    isRegistryDialogOpen = true;
  }
  function openEditRegistryDialog(credential, index) {
    registryToEdit = { ...credential, originalIndex: index };
    isRegistryDialogOpen = true;
  }
  async function handleRegistryDialogSubmit(eventDetail) {
    const { credential, isEditMode, originalIndex } = eventDetail;
    isLoadingRegistryAction = true;
    try {
      settingsStore.update((current) => {
        const updatedCredentials = [...current.registryCredentials || []];
        if (isEditMode && originalIndex !== void 0) {
          updatedCredentials[originalIndex] = credential;
        } else {
          updatedCredentials.push(credential);
        }
        return {
          ...current,
          registryCredentials: updatedCredentials
        };
      });
      const savedToServer = await saveSettingsToServer();
      if (savedToServer) {
        toast.success(isEditMode ? "Registry Credential Updated Successfully" : "Registry Credential Added Successfully");
      } else {
        toast.error("Failed to save registry settings to server.");
      }
    } catch (error) {
      console.error("Error handling registry dialog submit:", error);
      toast.error("An error occurred while saving registry settings.");
    } finally {
      isRegistryDialogOpen = false;
      isLoadingRegistryAction = false;
    }
  }
  function confirmRemoveRegistry(index) {
    const registryUrl = store_get($$store_subs ??= {}, "$settingsStore", settingsStore).registryCredentials?.[index]?.url || `Registry #${index + 1}`;
    openConfirmDialog({
      title: "Remove Registry",
      message: `Are you sure you want to remove the registry "${registryUrl}"? This action cannot be undone.`,
      confirm: {
        label: "Remove",
        destructive: true,
        action: async () => {
          await removeRegistry(index);
        }
      }
    });
  }
  async function removeRegistry(index) {
    isLoadingRegistryAction = true;
    try {
      settingsStore.update((current) => ({
        ...current,
        registryCredentials: (current.registryCredentials || []).filter((_, i) => i !== index)
      }));
      const savedToServer = await saveSettingsToServer();
      if (savedToServer) {
        toast.success("Registry Credential Removed Successfully");
      } else {
        toast.error("Failed to update registry settings on server.");
      }
    } catch (error) {
      console.error("Error removing registry:", error);
      toast.error("An error occurred while removing the registry.");
    } finally {
      isLoadingRegistryAction = false;
    }
  }
  async function saveSettings() {
    if (isLoading.saving) return;
    isLoading.saving = true;
    handleApiResultWithCallbacks({
      result: await tryCatch(saveSettingsToServer()),
      message: "Error Saving Settings",
      setLoadingState: (value) => isLoading.saving = value,
      onSuccess: async () => {
        toast.success(`Settings Saved Successfully`);
        await invalidateAll();
      }
    });
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    head($$payload2, ($$payload3) => {
      $$payload3.title = `<title>Docker Settings - Arcane</title>`;
    });
    Registry_form_dialog($$payload2, {
      onSubmit: handleRegistryDialogSubmit,
      isLoading: isLoadingRegistryAction,
      get open() {
        return isRegistryDialogOpen;
      },
      set open($$value) {
        isRegistryDialogOpen = $$value;
        $$settled = false;
      },
      get credentialToEdit() {
        return registryToEdit;
      },
      set credentialToEdit($$value) {
        registryToEdit = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----> <div class="space-y-6"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><h1 class="text-3xl font-bold tracking-tight">Docker Settings</h1> <p class="text-sm text-muted-foreground mt-1">Configure Docker connection, registries, and automation</p></div> `;
    Button($$payload2, {
      onclick: saveSettings,
      disabled: isLoading.saving,
      class: "h-10 arcane-button-save",
      children: ($$payload3) => {
        if (isLoading.saving) {
          $$payload3.out += "<!--[-->";
          Refresh_cw($$payload3, { class: "animate-spin size-4" });
          $$payload3.out += `<!----> Saving...`;
        } else {
          $$payload3.out += "<!--[!-->";
          Save($$payload3, { class: "size-4" });
          $$payload3.out += `<!----> Save Settings`;
        }
        $$payload3.out += `<!--]-->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><!---->`;
    Card($$payload2, {
      class: "border shadow-sm",
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_header($$payload3, {
          class: "pb-3",
          children: ($$payload4) => {
            $$payload4.out += `<div class="flex items-center gap-2"><div class="bg-blue-500/10 p-2 rounded-full">`;
            Server($$payload4, { class: "text-blue-500 size-5" });
            $$payload4.out += `<!----></div> <div><!---->`;
            Card_title($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Docker Settings`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Card_description($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Configure Docker connection and registry credentials`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card_content($$payload3, {
          children: ($$payload4) => {
            $$payload4.out += `<div class="space-y-4"><div class="space-y-2"><label for="dockerHost" class="text-sm font-medium block mb-1.5">Docker Host</label> `;
            Input($$payload4, {
              type: "text",
              id: "dockerHost",
              name: "dockerHost",
              placeholder: "unix:///var/run/docker.sock",
              required: true,
              get value() {
                return store_get($$store_subs ??= {}, "$settingsStore", settingsStore).dockerHost;
              },
              set value($$value) {
                store_mutate($$store_subs ??= {}, "$settingsStore", settingsStore, store_get($$store_subs ??= {}, "$settingsStore", settingsStore).dockerHost = $$value);
                $$settled = false;
              }
            });
            $$payload4.out += `<!----> <p class="text-xs text-muted-foreground">For local Docker: unix:///var/run/docker.sock (Unix)</p></div> <div class="pt-4 border-t mt-4"><div class="flex items-center justify-between gap-2 mb-3"><div class="flex items-center gap-2"><div class="bg-green-500/10 p-2 rounded-full">`;
            Key($$payload4, { class: "text-green-500 size-5" });
            $$payload4.out += `<!----></div> <div><h3 class="font-medium">Docker Registry Credentials</h3> <p class="text-sm text-muted-foreground">Configure access to private Docker registries</p></div></div> `;
            Button($$payload4, {
              onclick: openCreateRegistryDialog,
              class: "arcane-button-save",
              children: ($$payload5) => {
                Plus($$payload5, { class: "size-4" });
                $$payload5.out += `<!----> Add Registry`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div> <div class="space-y-2">`;
            if (!store_get($$store_subs ??= {}, "$settingsStore", settingsStore).registryCredentials || store_get($$store_subs ??= {}, "$settingsStore", settingsStore).registryCredentials.length === 0) {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<div class="text-center py-8 text-muted-foreground italic border rounded-md">No registry credentials configured yet.</div>`;
            } else {
              $$payload4.out += "<!--[!-->";
              {
                let rows = function($$payload5, { item, index }) {
                  if (typeof index === "number") {
                    $$payload5.out += "<!--[-->";
                    $$payload5.out += `<!---->`;
                    Table_cell($$payload5, {
                      class: "font-medium",
                      children: ($$payload6) => {
                        $$payload6.out += `<!---->${escape_html(item.url || "Default (Docker Hub)")}`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload5.out += `<!----> <!---->`;
                    Table_cell($$payload5, {
                      children: ($$payload6) => {
                        $$payload6.out += `<!---->${escape_html(item.username || "-")}`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload5.out += `<!----> <!---->`;
                    Table_cell($$payload5, {
                      class: "text-right",
                      children: ($$payload6) => {
                        $$payload6.out += `<!---->`;
                        Root$1($$payload6, {
                          children: ($$payload7) => {
                            $$payload7.out += `<!---->`;
                            Trigger($$payload7, {
                              children: ($$payload8) => {
                                Button($$payload8, {
                                  variant: "ghost",
                                  size: "icon",
                                  class: "size-8",
                                  children: ($$payload9) => {
                                    Ellipsis($$payload9, { class: "size-4" });
                                    $$payload9.out += `<!----> <span class="sr-only">Open menu</span>`;
                                  },
                                  $$slots: { default: true }
                                });
                              },
                              $$slots: { default: true }
                            });
                            $$payload7.out += `<!----> <!---->`;
                            Dropdown_menu_content($$payload7, {
                              align: "end",
                              children: ($$payload8) => {
                                $$payload8.out += `<!---->`;
                                Dropdown_menu_item($$payload8, {
                                  onclick: () => openEditRegistryDialog(item, index),
                                  children: ($$payload9) => {
                                    Pencil($$payload9, { class: "mr-2 size-4" });
                                    $$payload9.out += `<!----> Edit`;
                                  },
                                  $$slots: { default: true }
                                });
                                $$payload8.out += `<!----> <!---->`;
                                Dropdown_menu_item($$payload8, {
                                  onclick: () => confirmRemoveRegistry(index),
                                  class: "text-red-500 focus:text-red-700! focus:bg-destructive/10",
                                  children: ($$payload9) => {
                                    Trash_2($$payload9, { class: "mr-2 size-4" });
                                    $$payload9.out += `<!----> Remove`;
                                  },
                                  $$slots: { default: true }
                                });
                                $$payload8.out += `<!---->`;
                              },
                              $$slots: { default: true }
                            });
                            $$payload7.out += `<!---->`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload6.out += `<!---->`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload5.out += `<!---->`;
                  } else {
                    $$payload5.out += "<!--[!-->";
                  }
                  $$payload5.out += `<!--]-->`;
                };
                Universal_table($$payload4, {
                  data: store_get($$store_subs ??= {}, "$settingsStore", settingsStore).registryCredentials,
                  columns: [
                    { accessorKey: "url", header: "Registry URL" },
                    { accessorKey: "username", header: "Username" },
                    {
                      accessorKey: "actions",
                      header: " ",
                      enableSorting: false
                    }
                  ],
                  features: {
                    sorting: true,
                    filtering: false,
                    selection: false
                  },
                  pagination: { pageSize: 5, pageSizeOptions: [5] },
                  sort: { defaultSort: { id: "url", desc: false } },
                  display: {
                    noResultsMessage: "No registry credentials found."
                  },
                  rows,
                  $$slots: { rows: true }
                });
              }
            }
            $$payload4.out += `<!--]--></div></div></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <div class="space-y-6"><!---->`;
    Card($$payload2, {
      class: "border shadow-sm",
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_header($$payload3, {
          class: "pb-3",
          children: ($$payload4) => {
            $$payload4.out += `<div class="flex items-center gap-2"><div class="bg-amber-500/10 p-2 rounded-full">`;
            Refresh_cw($$payload4, { class: "text-amber-500 size-5" });
            $$payload4.out += `<!----></div> <div><!---->`;
            Card_title($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Image Polling`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Card_description($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Control container image polling`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card_content($$payload3, {
          class: "space-y-6",
          children: ($$payload4) => {
            $$payload4.out += `<div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30"><div class="space-y-0.5"><label for="pollingEnabledSwitch" class="text-base font-medium">Check for New Images</label> <p class="text-sm text-muted-foreground">Periodically check for newer versions of container images</p></div> `;
            Switch($$payload4, {
              id: "pollingEnabledSwitch",
              name: "pollingEnabled",
              checked: store_get($$store_subs ??= {}, "$settingsStore", settingsStore).pollingEnabled,
              onCheckedChange: (checked) => {
                settingsStore.update((current) => ({ ...current, pollingEnabled: checked }));
              }
            });
            $$payload4.out += `<!----></div> `;
            if (store_get($$store_subs ??= {}, "$settingsStore", settingsStore).pollingEnabled) {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<div class="space-y-2 px-1"><label for="pollingInterval" class="text-sm font-medium">Polling Interval (minutes)</label> `;
              Input($$payload4, {
                id: "pollingInterval",
                type: "number",
                value: store_get($$store_subs ??= {}, "$settingsStore", settingsStore).pollingInterval,
                oninput: (e) => settingsStore.update((cur) => ({ ...cur, pollingInterval: +e.target.value })),
                min: "5",
                max: "60"
              });
              $$payload4.out += `<!----> <p class="text-xs text-muted-foreground">Set between 5-60 minutes.</p></div> <div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30"><div class="space-y-0.5">`;
              Label($$payload4, {
                for: "autoUpdateSwitch",
                class: "text-base font-medium",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Auto Update Containers`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> <p class="text-sm text-muted-foreground">Automatically update containers when newer images are available</p></div> `;
              Switch($$payload4, {
                id: "autoUpdateSwitch",
                checked: store_get($$store_subs ??= {}, "$settingsStore", settingsStore).autoUpdate,
                onCheckedChange: (checked) => {
                  settingsStore.update((current) => ({ ...current, autoUpdate: checked }));
                }
              });
              $$payload4.out += `<!----></div> `;
              if (store_get($$store_subs ??= {}, "$settingsStore", settingsStore).autoUpdate) {
                $$payload4.out += "<!--[-->";
                $$payload4.out += `<div class="space-y-2 mt-4">`;
                Label($$payload4, {
                  for: "autoUpdateInterval",
                  class: "text-base font-medium",
                  children: ($$payload5) => {
                    $$payload5.out += `<!---->Auto-update check interval (minutes)`;
                  },
                  $$slots: { default: true }
                });
                $$payload4.out += `<!----> `;
                Input($$payload4, {
                  id: "autoUpdateInterval",
                  type: "number",
                  value: store_get($$store_subs ??= {}, "$settingsStore", settingsStore).autoUpdateInterval,
                  oninput: (e) => settingsStore.update((cur) => ({ ...cur, autoUpdateInterval: +e.target.value })),
                  min: "5",
                  max: "1440"
                });
                $$payload4.out += `<!----> <p class="text-sm text-muted-foreground">How often Arcane will check for container and stack updates (minimum 5 minutes, maximum 24 hours)</p></div>`;
              } else {
                $$payload4.out += "<!--[!-->";
              }
              $$payload4.out += `<!--]-->`;
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]-->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <!---->`;
    Card($$payload2, {
      class: "border shadow-sm",
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_header($$payload3, {
          class: "pb-3",
          children: ($$payload4) => {
            $$payload4.out += `<div class="flex items-center gap-2"><div class="bg-purple-500/10 p-2 rounded-full">`;
            Image_minus($$payload4, { class: "text-purple-500 size-5" });
            $$payload4.out += `<!----></div> <div><!---->`;
            Card_title($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Image Pruning`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Card_description($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Configure image prune behavior`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card_content($$payload3, {
          class: "space-y-4",
          children: ($$payload4) => {
            $$payload4.out += `<div>`;
            Label($$payload4, {
              for: "pruneMode",
              class: "text-base font-medium block mb-2",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Prune Action Behavior`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Radio_group($$payload4, {
              value: store_get($$store_subs ??= {}, "$settingsStore", settingsStore).pruneMode,
              onValueChange: (val) => {
                settingsStore.update((current) => ({ ...current, pruneMode: val }));
              },
              class: "flex flex-col space-y-1",
              id: "pruneMode",
              children: ($$payload5) => {
                $$payload5.out += `<div class="flex items-center space-x-2"><!---->`;
                Radio_group_item($$payload5, { value: "all", id: "prune-all" });
                $$payload5.out += `<!----> `;
                Label($$payload5, {
                  for: "prune-all",
                  class: "font-normal",
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->All Unused Images (like \`docker image prune -a\`)`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----></div> <div class="flex items-center space-x-2"><!---->`;
                Radio_group_item($$payload5, { value: "dangling", id: "prune-dangling" });
                $$payload5.out += `<!----> `;
                Label($$payload5, {
                  for: "prune-dangling",
                  class: "font-normal",
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Dangling Images Only (like \`docker image prune\`)`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----></div>`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <p class="text-xs text-muted-foreground mt-2">Select which images are removed by the "Prune Unused" action on the Images page.</p></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div></div> <input type="hidden" id="csrf_token"${attr("value", data.csrf)}/></div>`;
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
export {
  _page as default
};
