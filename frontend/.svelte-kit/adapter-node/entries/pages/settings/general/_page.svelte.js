import { p as push, j as spread_props, a as pop, u as copy_payload, v as assign_payload, t as bind_props, m as spread_attributes, k as escape_html, d as attr_class, f as clsx, h as head, b as attr } from "../../../../chunks/index3.js";
import { C as Card } from "../../../../chunks/card.js";
import { a as Card_header, b as Card_title, C as Card_content } from "../../../../chunks/card-title.js";
import { C as Card_description } from "../../../../chunks/card-description.js";
import "clsx";
import { I as Input } from "../../../../chunks/input.js";
import { L as Label } from "../../../../chunks/label.js";
import { B as Button } from "../../../../chunks/button.js";
import { a as saveSettingsToServer, s as settingsStore } from "../../../../chunks/settings-store.js";
import { a as toast } from "../../../../chunks/Toaster.svelte_svelte_type_style_lang.js";
import { i as invalidateAll } from "../../../../chunks/client.js";
import { h as handleApiResultWithCallbacks } from "../../../../chunks/api.util.js";
import { t as tryCatch } from "../../../../chunks/try-catch.js";
import { S as Save } from "../../../../chunks/save.js";
import { I as Icon } from "../../../../chunks/Icon.js";
import { R as Refresh_cw } from "../../../../chunks/refresh-cw.js";
function Cog($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      { "d": "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" }
    ],
    [
      "path",
      { "d": "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" }
    ],
    ["path", { "d": "M12 2v2" }],
    ["path", { "d": "M12 22v-2" }],
    ["path", { "d": "m17 20.66-1-1.73" }],
    ["path", { "d": "M11 10.27 7 3.34" }],
    ["path", { "d": "m20.66 17-1.73-1" }],
    ["path", { "d": "m3.34 7 1.73 1" }],
    ["path", { "d": "M14 12h8" }],
    ["path", { "d": "M2 12h2" }],
    ["path", { "d": "m20.66 7-1.73 1" }],
    ["path", { "d": "m3.34 17 1.73-1" }],
    ["path", { "d": "m17 3.34-1 1.73" }],
    ["path", { "d": "m11 13.73-4 6.93" }]
  ];
  Icon($$payload, spread_props([
    { name: "cog" },
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
function Form_input($$payload, $$props) {
  push();
  let {
    input = void 0,
    label,
    description,
    helpText,
    warningText,
    placeholder,
    disabled = false,
    type = "text",
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const id = label?.toLowerCase().replace(/ /g, "-");
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div${spread_attributes({ ...restProps }, null)}>`;
    if (label) {
      $$payload2.out += "<!--[-->";
      Label($$payload2, {
        class: "mb-0",
        for: id,
        children: ($$payload3) => {
          $$payload3.out += `<!---->${escape_html(label)}`;
        },
        $$slots: { default: true }
      });
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> `;
    if (description) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<p class="text-muted-foreground mt-1 text-xs">${escape_html(description)}</p>`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> <div${attr_class(clsx(label || description ? "mt-2" : ""))}>`;
    if (children) {
      $$payload2.out += "<!--[-->";
      children($$payload2);
      $$payload2.out += `<!---->`;
    } else if (input) {
      $$payload2.out += "<!--[1-->";
      Input($$payload2, {
        id,
        placeholder,
        type,
        disabled,
        get value() {
          return input.value;
        },
        set value($$value) {
          input.value = $$value;
          $$settled = false;
        }
      });
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> `;
    if (input?.error) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<p class="mt-1 text-sm text-red-500">${escape_html(input.error)}</p>`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> `;
    if (helpText) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<p class="mt-1 text-xs text-muted-foreground">${escape_html(helpText)}</p>`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> `;
    if (warningText) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<p class="mt-1 text-xs font-bold text-destructive">${escape_html(warningText)}</p>`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--></div></div>`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { input });
  pop();
}
function _page($$payload, $$props) {
  push();
  let { data } = $$props;
  let stacksDirectoryInput = {
    value: "",
    valid: true,
    touched: false,
    error: null,
    errors: []
  };
  let baseServerUrlInput = {
    value: "",
    valid: true,
    touched: false,
    error: null,
    errors: []
  };
  let maturityThresholdInput = {
    value: 30,
    valid: true,
    touched: false,
    error: null,
    errors: []
  };
  let isLoading = { saving: false };
  function onStacksDirectoryChange() {
    stacksDirectoryInput.touched = true;
    settingsStore.update((settings) => ({
      ...settings,
      stacksDirectory: stacksDirectoryInput.value
    }));
  }
  function onBaseServerUrlChange() {
    baseServerUrlInput.touched = true;
    settingsStore.update((settings) => ({
      ...settings,
      baseServerUrl: baseServerUrlInput.value
    }));
  }
  function onMaturityThresholdChange() {
    maturityThresholdInput.touched = true;
    const rawValue = maturityThresholdInput.value;
    const numericValue = parseInt(String(rawValue), 10);
    if (!isNaN(numericValue)) {
      maturityThresholdInput.value = numericValue;
      settingsStore.update((settings) => ({
        ...settings,
        maturityThresholdDays: numericValue
      }));
      maturityThresholdInput.valid = true;
      maturityThresholdInput.error = null;
    } else {
      maturityThresholdInput.valid = false;
      maturityThresholdInput.error = "Please enter a valid whole number.";
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
      $$payload3.title = `<title>General Settings - Arcane</title>`;
    });
    $$payload2.out += `<div class="space-y-6"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><h1 class="text-3xl font-bold tracking-tight">General Settings</h1> <p class="text-sm text-muted-foreground mt-1">Core configuration for how Arcane operates</p></div> `;
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
    $$payload2.out += `<!----></div> <div class="grid auto-cols-auto lg:auto-cols-auto gap-6"><!---->`;
    Card($$payload2, {
      class: "border shadow-sm",
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_header($$payload3, {
          class: "pb-3",
          children: ($$payload4) => {
            $$payload4.out += `<div class="flex items-center gap-2"><div class="bg-primary/10 p-2 rounded-full">`;
            Cog($$payload4, { class: "text-primary size-5" });
            $$payload4.out += `<!----></div> <div><!---->`;
            Card_title($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Core Arcane Configuration`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Card_description($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Essential settings for how Arcane operates.`;
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
            $$payload4.out += `<div class="space-y-6">`;
            Form_input($$payload4, {
              type: "text",
              id: "stacksDirectory",
              label: "Stack Projects Directory",
              placeholder: "data/stacks",
              description: "The primary folder where Arcane will store and manage your Docker Compose stack projects. This path is inside Arcane's container.",
              warningText: "Important: Changing this path will not automatically move existing stack projects.",
              oninput: () => onStacksDirectoryChange(),
              get input() {
                return stacksDirectoryInput;
              },
              set input($$value) {
                stacksDirectoryInput = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----> `;
            Form_input($$payload4, {
              type: "text",
              id: "baseServerUrl",
              label: "Default Service Access URL",
              placeholder: "localhost",
              description: "When Arcane provides links to your services (e.g., web UIs), this URL (like 'localhost' or an IP address) is used as the default. This is primarily for services not on directly accessible networks (e.g., macvlan).",
              oninput: () => onBaseServerUrlChange(),
              get input() {
                return baseServerUrlInput;
              },
              set input($$value) {
                baseServerUrlInput = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----> `;
            Form_input($$payload4, {
              type: "number",
              id: "maturityThresholdDays",
              label: "Image Maturity Threshold (days)",
              placeholder: "30",
              description: "The number of days after an image release before it's considered 'matured'.",
              warningText: "Higher values mean more caution with new images.",
              oninput: () => onMaturityThresholdChange(),
              get input() {
                return maturityThresholdInput;
              },
              set input($$value) {
                maturityThresholdInput = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div> <input type="hidden" id="csrf_token"${attr("value", data.csrf)}/></div>`;
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
