import { p as push, v as store_get, c as copy_payload, d as assign_payload, x as unsubscribe_stores, a as pop, h as head, t as escape_html, j as ensure_array_like } from './index3-DI1Ivwzg.js';
import { B as Button } from './button-CUTwDrbo.js';
import { I as Input } from './input-Bs5Bjqyo.js';
import { L as Label } from './label-DF0BU6VF.js';
import { C as Card } from './card-BHGzpLb_.js';
import { B as Badge } from './badge-Pb9wGjGi.js';
import { A as Alert } from './alert-BRXlGSSu.js';
import { A as Alert_title, a as Alert_description } from './alert-title-Ce5Et4hB.js';
import { S as Separator } from './separator-aTxaolX1.js';
import { s as settingsStore, a as saveSettingsToServer } from './settings-store-Cucc9Cev.js';
import { t as templateRegistryService } from './template-registry-service-CoCZP6pF.js';
import { a as toast } from './Toaster.svelte_svelte_type_style_lang-B5vkOu6x.js';
import { i as invalidateAll } from './client-Cc1XkR80.js';
import { h as handleApiResultWithCallbacks } from './api.util-Ci3Q0GvL.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import { S as Save } from './save-C3QNHVRC.js';
import { F as Folder_open, C as Copy } from './folder-open-Bw4n9F1Z.js';
import { G as Globe } from './globe-CN05eax4.js';
import { F as File_text } from './file-text-C4b752KJ.js';
import { U as Users } from './users-BzqSZjJ1.js';
import { P as Plus } from './plus-HtkF3wKK.js';
import { R as Refresh_cw } from './refresh-cw-CRz8nTZu.js';
import { E as External_link } from './external-link-fiZiqZz7.js';
import { T as Trash_2 } from './trash-2-BUIKTnnR.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import './create-id-DRrkdd12.js';
import './index-server-_G0R5Qhl.js';
import './index2-Da1jJcEh.js';
import './index5-HpJcNJHQ.js';
import './exports-Cv9LZeD1.js';
import './errors.util-g315AnHn.js';
import './Icon-DbVCNmsR.js';

function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  let newRegistryUrl = "";
  let isLoading = {
    saving: false,
    addingRegistry: false,
    refreshing: /* @__PURE__ */ new Set(),
    removing: /* @__PURE__ */ new Set()
  };
  const templateRegistries = store_get($$store_subs ??= {}, "$settingsStore", settingsStore).templateRegistries || [];
  async function saveSettingsAndHandle(successMessage) {
    const result = await tryCatch(saveSettingsToServer());
    if (result.error) {
      toast.error(result.error.message || "Failed to save settings");
      return false;
    } else {
      toast.success(successMessage);
      await invalidateAll();
      return true;
    }
  }
  async function addRegistry() {
    if (!newRegistryUrl.trim()) {
      toast.error("Registry URL is required");
      return;
    }
    if (isLoading.addingRegistry) return;
    isLoading.addingRegistry = true;
    try {
      const testConfig = {
        url: newRegistryUrl.trim(),
        name: "Loading...",
        // Temporary name
        enabled: true
      };
      console.log("Testing registry URL:", testConfig.url);
      const registry = await templateRegistryService.fetchRegistry(testConfig);
      if (!registry) {
        toast.error("Failed to fetch registry or invalid format");
        return;
      }
      const config = {
        url: newRegistryUrl.trim(),
        name: registry.name,
        // Use name from registry JSON
        enabled: true
      };
      console.log("Registry test successful, adding to store with name:", registry.name);
      settingsStore.update((settings) => ({
        ...settings,
        templateRegistries: [...settings.templateRegistries || [], config]
      }));
      const saved = await saveSettingsAndHandle(`Registry "${registry.name}" added and saved successfully`);
      if (saved) {
        newRegistryUrl = "";
      }
    } catch (error) {
      console.error("Error adding registry:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add registry");
    } finally {
      isLoading.addingRegistry = false;
    }
  }
  async function removeRegistry(url) {
    if (isLoading.removing.has(url)) return;
    isLoading.removing.add(url);
    try {
      settingsStore.update((settings) => ({
        ...settings,
        templateRegistries: (settings.templateRegistries || []).filter((r) => r.url !== url)
      }));
      await saveSettingsAndHandle("Registry removed and saved successfully");
    } catch (error) {
      toast.error("Failed to remove registry");
    } finally {
      isLoading.removing.delete(url);
    }
  }
  async function refreshRegistry(url) {
    if (isLoading.refreshing.has(url)) return;
    isLoading.refreshing.add(url);
    try {
      const registries = store_get($$store_subs ??= {}, "$settingsStore", settingsStore).templateRegistries || [];
      const config = registries.find((r) => r.url === url);
      if (!config) {
        toast.error("Registry not found");
        return;
      }
      templateRegistryService.clearCache();
      const registry = await templateRegistryService.fetchRegistry(config);
      if (!registry) {
        toast.error("Failed to refresh registry");
        return;
      }
      settingsStore.update((settings) => ({
        ...settings,
        templateRegistries: (settings.templateRegistries || []).map((r) => r.url === url ? {
          ...r,
          name: registry.name,
          // Update name from registry
          last_updated: (/* @__PURE__ */ new Date()).toISOString()
        } : r)
      }));
      await saveSettingsAndHandle("Registry refreshed and saved successfully");
    } catch (error) {
      toast.error("Failed to refresh registry");
    } finally {
      isLoading.refreshing.delete(url);
    }
  }
  async function saveSettings() {
    if (isLoading.saving) return;
    isLoading.saving = true;
    console.log("Saving settings to server:", store_get($$store_subs ??= {}, "$settingsStore", settingsStore));
    handleApiResultWithCallbacks({
      result: await tryCatch(saveSettingsToServer()),
      message: "Error Saving Settings",
      setLoadingState: (value) => isLoading.saving = value,
      onSuccess: async () => {
        toast.success("Settings saved successfully");
        await invalidateAll();
      }
    });
  }
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy");
    });
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    head($$payload2, ($$payload3) => {
      $$payload3.title = `<title>Template Settings - Arcane</title>`;
    });
    $$payload2.out += `<div class="space-y-6"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><h1 class="text-3xl font-bold tracking-tight">Template Settings</h1> <p class="text-sm text-muted-foreground mt-1">Manage Docker Compose template sources and registries <a href="https://arcane.ofkm.dev/docs/templates/use-templates" class="text-primary hover:underline ml-1">→ Learn more</a></p></div> `;
    Button($$payload2, {
      onclick: saveSettings,
      disabled: isLoading.saving,
      class: "h-10 arcane-button-save",
      variant: "outline",
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
    $$payload2.out += `<!----></div> <div class="grid grid-cols-1 md:grid-cols-3 gap-4">`;
    Card($$payload2, {
      class: "p-4",
      children: ($$payload3) => {
        $$payload3.out += `<div class="flex items-center gap-3">`;
        Folder_open($$payload3, { class: "size-8 text-blue-500" });
        $$payload3.out += `<!----> <div><p class="text-2xl font-bold">${escape_html(data.localTemplateCount)}</p> <p class="text-sm text-muted-foreground">Local Templates</p></div></div>`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Card($$payload2, {
      class: "p-4",
      children: ($$payload3) => {
        $$payload3.out += `<div class="flex items-center gap-3">`;
        Globe($$payload3, { class: "size-8 text-green-500" });
        $$payload3.out += `<!----> <div><p class="text-2xl font-bold">${escape_html(data.remoteTemplateCount)}</p> <p class="text-sm text-muted-foreground">Remote Templates</p></div></div>`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Card($$payload2, {
      class: "p-4",
      children: ($$payload3) => {
        $$payload3.out += `<div class="flex items-center gap-3">`;
        File_text($$payload3, { class: "size-8 text-purple-500" });
        $$payload3.out += `<!----> <div><p class="text-2xl font-bold">${escape_html(templateRegistries.length)}</p> <p class="text-sm text-muted-foreground">Registries</p></div></div>`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div> `;
    Separator($$payload2, {});
    $$payload2.out += `<!----> <div class="space-y-4"><h2 class="text-xl font-semibold">Local Templates</h2> <!---->`;
    Alert($$payload2, {
      children: ($$payload3) => {
        Folder_open($$payload3, { class: "size-4" });
        $$payload3.out += `<!----> <!---->`;
        Alert_title($$payload3, {
          children: ($$payload4) => {
            $$payload4.out += `<!---->Local Template Directory`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Alert_description($$payload3, {
          children: ($$payload4) => {
            $$payload4.out += `<!---->Place your custom Docker Compose templates in the <code class="bg-muted px-1 rounded text-xs">data/templates/compose/</code> directory. Templates should be YAML files with a descriptive filename. You can also include matching <code class="bg-muted px-1 rounded text-xs">.env</code> files for environment variables.`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div> `;
    Separator($$payload2, {});
    $$payload2.out += `<!----> <div class="space-y-4"><div class="flex items-center justify-between"><h2 class="text-xl font-semibold">Remote Template Registries</h2></div> <!---->`;
    Alert($$payload2, {
      children: ($$payload3) => {
        Globe($$payload3, { class: "size-4" });
        $$payload3.out += `<!----> <!---->`;
        Alert_title($$payload3, {
          children: ($$payload4) => {
            $$payload4.out += `<!---->Remote Registries`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Alert_description($$payload3, {
          children: ($$payload4) => {
            $$payload4.out += `<!---->Add remote template registries to access community templates. Registry names are automatically detected from the JSON manifest. Changes are saved automatically.`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <!---->`;
    Alert($$payload2, {
      class: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
      children: ($$payload3) => {
        Users($$payload3, { class: "size-4" });
        $$payload3.out += `<!----> <!---->`;
        Alert_title($$payload3, {
          children: ($$payload4) => {
            $$payload4.out += `<!---->Community Registry`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Alert_description($$payload3, {
          class: "space-y-2",
          children: ($$payload4) => {
            $$payload4.out += `<p>Get started quickly with our community registry containing popular templates:</p> <div class="flex items-center gap-2 mt-2"><code class="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs">https://templates.arcane.ofkm.dev/registry.json</code> `;
            Button($$payload4, {
              size: "sm",
              variant: "outline",
              onclick: () => copyToClipboard("https://templates.arcane.ofkm.dev/registry.json"),
              children: ($$payload5) => {
                Copy($$payload5, { class: "size-3 mr-1" });
                $$payload5.out += `<!----> Copy`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Card($$payload2, {
      class: "p-4",
      children: ($$payload3) => {
        $$payload3.out += `<h3 class="font-medium mb-3">Add Registry</h3> <div class="space-y-3"><div>`;
        Label($$payload3, {
          for: "url",
          children: ($$payload4) => {
            $$payload4.out += `<!---->Registry URL`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> `;
        Input($$payload3, {
          id: "url",
          type: "url",
          placeholder: "https://raw.githubusercontent.com/username/repo/main/registry.json",
          disabled: isLoading.addingRegistry,
          required: true,
          get value() {
            return newRegistryUrl;
          },
          set value($$value) {
            newRegistryUrl = $$value;
            $$settled = false;
          }
        });
        $$payload3.out += `<!----> <p class="text-xs text-muted-foreground mt-1">The registry name will be automatically detected from the JSON file</p></div> `;
        Button($$payload3, {
          onclick: addRegistry,
          disabled: isLoading.addingRegistry || !newRegistryUrl.trim(),
          children: ($$payload4) => {
            Plus($$payload4, { class: "size-4 mr-2" });
            $$payload4.out += `<!----> ${escape_html(isLoading.addingRegistry ? "Testing & Adding..." : "Add Registry")}`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----></div>`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    if (templateRegistries.length > 0) {
      $$payload2.out += "<!--[-->";
      const each_array = ensure_array_like(templateRegistries);
      $$payload2.out += `<div class="space-y-3"><!--[-->`;
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let registry = each_array[$$index];
        Card($$payload2, {
          class: "p-4",
          children: ($$payload3) => {
            $$payload3.out += `<div class="flex items-center justify-between"><div class="flex-1"><div class="flex items-center gap-2 mb-1"><h4 class="font-medium">${escape_html(registry.name)}</h4> `;
            Badge($$payload3, {
              variant: registry.enabled ? "default" : "secondary",
              children: ($$payload4) => {
                $$payload4.out += `<!---->${escape_html(registry.enabled ? "Enabled" : "Disabled")}`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----></div> <p class="text-sm text-muted-foreground break-all">${escape_html(registry.url)}</p> `;
            if (registry.last_updated) {
              $$payload3.out += "<!--[-->";
              $$payload3.out += `<p class="text-xs text-muted-foreground mt-1">Last updated: ${escape_html(new Date(registry.last_updated).toLocaleString())}</p>`;
            } else {
              $$payload3.out += "<!--[!-->";
            }
            $$payload3.out += `<!--]--></div> <div class="flex items-center gap-2">`;
            Button($$payload3, {
              variant: "outline",
              size: "sm",
              onclick: () => refreshRegistry(registry.url),
              disabled: isLoading.refreshing.has(registry.url),
              children: ($$payload4) => {
                Refresh_cw($$payload4, {
                  class: `size-4 ${isLoading.refreshing.has(registry.url) ? "animate-spin" : ""}`
                });
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            Button($$payload3, {
              variant: "outline",
              size: "sm",
              onclick: () => window.open(registry.url, "_blank"),
              children: ($$payload4) => {
                External_link($$payload4, { class: "size-4" });
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> `;
            Button($$payload3, {
              variant: "destructive",
              size: "sm",
              onclick: () => removeRegistry(registry.url),
              disabled: isLoading.removing.has(registry.url),
              children: ($$payload4) => {
                Trash_2($$payload4, { class: "size-4" });
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----></div></div>`;
          },
          $$slots: { default: true }
        });
      }
      $$payload2.out += `<!--]--></div>`;
    } else {
      $$payload2.out += "<!--[!-->";
      $$payload2.out += `<div class="text-center py-6 text-muted-foreground">`;
      Globe($$payload2, { class: "size-12 mx-auto mb-4 opacity-50" });
      $$payload2.out += `<!----> <p class="mb-2">No registries configured</p> <p class="text-sm">Add a remote template registry to access community templates</p></div>`;
    }
    $$payload2.out += `<!--]--></div></div>`;
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

export { _page as default };
//# sourceMappingURL=_page.svelte-CRNe8sOf.js.map
