import { h as head, w as store_get, l as ensure_array_like, d as attr_class, k as escape_html, n as stringify, b as attr, y as unsubscribe_stores, a as pop, p as push } from "../../../../chunks/index3.js";
import { C as Card } from "../../../../chunks/card.js";
import { a as Card_header, b as Card_title, C as Card_content } from "../../../../chunks/card-title.js";
import { C as Card_description } from "../../../../chunks/card-description.js";
import "clsx";
import { B as Button } from "../../../../chunks/button.js";
import { I as Input } from "../../../../chunks/input.js";
import { S as Switch } from "../../../../chunks/switch.js";
import { s as settingsStore, a as saveSettingsToServer } from "../../../../chunks/settings-store.js";
import { a as toast } from "../../../../chunks/Toaster.svelte_svelte_type_style_lang.js";
import { i as invalidateAll } from "../../../../chunks/client.js";
import { h as handleApiResultWithCallbacks } from "../../../../chunks/api.util.js";
import { t as tryCatch } from "../../../../chunks/try-catch.js";
import { S as Save } from "../../../../chunks/save.js";
import { U as Users } from "../../../../chunks/users.js";
import { P as Plus } from "../../../../chunks/plus.js";
import { S as Shield } from "../../../../chunks/shield.js";
import { S as Settings } from "../../../../chunks/settings.js";
import { R as Refresh_cw } from "../../../../chunks/refresh-cw.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  let isLoading = { saving: false };
  const roles = [
    {
      id: 1,
      name: "Admin",
      description: "Full system access",
      permissions: [
        "containers:manage",
        "stacks:manage",
        "volumes:manage",
        "networks:manage",
        "settings:manage",
        "users:manage"
      ]
    },
    {
      id: 2,
      name: "User",
      description: "Container and stack operations",
      permissions: [
        "containers:view",
        "containers:manage",
        "stacks:view",
        "stacks:manage",
        "volumes:view",
        "networks:view"
      ]
    },
    {
      id: 3,
      name: "Viewer",
      description: "Read-only access",
      permissions: [
        "containers:view",
        "stacks:view",
        "volumes:view",
        "networks:view"
      ]
    }
  ];
  const permissionCategories = [
    {
      name: "Containers",
      permissions: [
        "containers:view",
        "containers:manage",
        "containers:deploy"
      ]
    },
    {
      name: "Stacks",
      permissions: [
        "stacks:view",
        "stacks:manage",
        "stacks:deploy"
      ]
    },
    {
      name: "Volumes",
      permissions: [
        "volumes:view",
        "volumes:manage",
        "volumes:create"
      ]
    },
    {
      name: "Networks",
      permissions: [
        "networks:view",
        "networks:manage",
        "networks:create"
      ]
    },
    {
      name: "Settings",
      permissions: ["settings:view", "settings:manage"]
    },
    {
      name: "Users",
      permissions: ["users:view", "users:manage", "users:create"]
    }
  ];
  let selectedRole = roles[0];
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
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>RBAC Settings - Arcane</title>`;
  });
  $$payload.out += `<div class="space-y-6"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><h1 class="text-3xl font-bold tracking-tight">Role-Based Access Control</h1> <p class="text-sm text-muted-foreground mt-1">Manage user roles and permissions</p></div> `;
  Button($$payload, {
    onclick: saveSettings,
    disabled: isLoading.saving,
    class: "h-10 arcane-button-save",
    children: ($$payload2) => {
      if (isLoading.saving) {
        $$payload2.out += "<!--[-->";
        Refresh_cw($$payload2, { class: "animate-spin size-4" });
        $$payload2.out += `<!----> Saving...`;
      } else {
        $$payload2.out += "<!--[!-->";
        Save($$payload2, { class: "size-4" });
        $$payload2.out += `<!----> Save Settings`;
      }
      $$payload2.out += `<!--]-->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----></div> <div class="mb-6"><div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30"><div class="space-y-0.5"><label for="rbacEnabledSwitch" class="text-base font-medium">Enable Role-Based Access Control</label> <p class="text-sm text-muted-foreground">Control user permissions with customizable roles</p></div> `;
  Switch($$payload, {
    id: "rbacEnabledSwitch",
    name: "rbacEnabled",
    checked: store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.rbacEnabled,
    onCheckedChange: (checked) => {
      settingsStore.update((current) => ({
        ...current,
        auth: { ...current.auth, rbacEnabled: checked }
      }));
    }
  });
  $$payload.out += `<!----></div></div> <div class="grid grid-cols-1 lg:grid-cols-3 gap-6"><div class="lg:col-span-1"><!---->`;
  Card($$payload, {
    class: "border shadow-sm h-full",
    children: ($$payload2) => {
      $$payload2.out += `<!---->`;
      Card_header($$payload2, {
        class: "pb-3",
        children: ($$payload3) => {
          $$payload3.out += `<div class="flex items-center justify-between"><div class="flex items-center gap-2"><div class="bg-blue-500/10 p-2 rounded-full">`;
          Users($$payload3, { class: "text-blue-500 size-5" });
          $$payload3.out += `<!----></div> <!---->`;
          Card_title($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->Roles`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----></div> `;
          Button($$payload3, {
            variant: "outline",
            size: "sm",
            children: ($$payload4) => {
              Plus($$payload4, { class: "mr-1 size-4" });
              $$payload4.out += `<!----> Add`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----></div>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> <!---->`;
      Card_content($$payload2, {
        children: ($$payload3) => {
          const each_array = ensure_array_like(roles);
          $$payload3.out += `<div class="space-y-2"><!--[-->`;
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let role = each_array[$$index];
            $$payload3.out += `<button${attr_class(`w-full text-left p-3 rounded-md border transition-colors flex items-center justify-between ${stringify(selectedRole.id === role.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted/50")}`)}><div><div class="font-medium">${escape_html(role.name)}</div> <div${attr_class(`text-xs ${stringify(selectedRole.id === role.id ? "text-primary-foreground/90" : "text-muted-foreground")}`)}>${escape_html(role.description)}</div></div> `;
            Shield($$payload3, { class: "opacity-70 size-4" });
            $$payload3.out += `<!----></button>`;
          }
          $$payload3.out += `<!--]--></div>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----></div> <div class="lg:col-span-2"><!---->`;
  Card($$payload, {
    class: "border shadow-sm",
    children: ($$payload2) => {
      $$payload2.out += `<!---->`;
      Card_header($$payload2, {
        class: "pb-3",
        children: ($$payload3) => {
          $$payload3.out += `<div class="flex items-center justify-between"><div class="flex items-center gap-2"><div class="bg-purple-500/10 p-2 rounded-full">`;
          Settings($$payload3, { class: "text-purple-500 size-5" });
          $$payload3.out += `<!----></div> <div><!---->`;
          Card_title($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->Role: ${escape_html(selectedRole.name)}`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Card_description($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->${escape_html(selectedRole.description)}`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----></div></div> <div class="space-x-2">`;
          Button($$payload3, {
            variant: "outline",
            size: "sm",
            children: ($$payload4) => {
              $$payload4.out += `<!---->Delete`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> `;
          Button($$payload3, {
            size: "sm",
            children: ($$payload4) => {
              $$payload4.out += `<!---->Save Changes`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----></div></div>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> <!---->`;
      Card_content($$payload2, {
        children: ($$payload3) => {
          const each_array_1 = ensure_array_like(permissionCategories);
          $$payload3.out += `<div class="space-y-6"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div class="space-y-2"><label for="roleName" class="text-sm font-medium">Role Name</label> `;
          Input($$payload3, {
            id: "roleName",
            name: "roleName",
            value: selectedRole.name,
            placeholder: "Enter role name"
          });
          $$payload3.out += `<!----></div> <div class="space-y-2"><label for="roleDescription" class="text-sm font-medium">Description</label> `;
          Input($$payload3, {
            id: "roleDescription",
            name: "roleDescription",
            value: selectedRole.description,
            placeholder: "Brief description"
          });
          $$payload3.out += `<!----></div></div> <div><h3 class="text-sm font-medium mb-3">Permissions</h3> <div class="border rounded-md divide-y"><!--[-->`;
          for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
            let category = each_array_1[$$index_2];
            const each_array_2 = ensure_array_like(category.permissions);
            $$payload3.out += `<div class="p-3"><h4 class="font-medium mb-2">${escape_html(category.name)}</h4> <div class="grid grid-cols-1 sm:grid-cols-2 gap-2"><!--[-->`;
            for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
              let permission = each_array_2[$$index_1];
              $$payload3.out += `<label class="flex items-center space-x-2 text-sm"><input type="checkbox" class="rounded border-gray-300 text-primary focus:ring-primary"${attr("checked", selectedRole.permissions.includes(permission), true)}/> <span>${escape_html(permission.split(":")[1])}</span></label>`;
            }
            $$payload3.out += `<!--]--></div></div>`;
          }
          $$payload3.out += `<!--]--></div></div></div>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----></div></div> <input type="hidden" id="csrf_token"${attr("value", data.csrf)}/></div>`;
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
