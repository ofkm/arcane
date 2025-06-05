import { p as push, c as copy_payload, d as assign_payload, a as pop, h as head, f as attr, v as store_get, t as escape_html, x as unsubscribe_stores } from './index3-DI1Ivwzg.js';
import { p as public_env } from './shared-server-DIsQ43MR.js';
import { C as Card } from './card-BHGzpLb_.js';
import { a as Card_header, C as Card_content, b as Card_title } from './card-title-Cbe9TU5i.js';
import { C as Card_description } from './card-description-D9_vEbkT.js';
import { B as Button } from './button-CUTwDrbo.js';
import { I as Input } from './input-Bs5Bjqyo.js';
import { S as Switch } from './switch-D8BK2W40.js';
import { a as saveSettingsToServer, s as settingsStore } from './settings-store-Cucc9Cev.js';
import { R as Root, D as Dialog_content, a as Dialog_header, g as Dialog_title, b as Dialog_footer } from './index7-tn3QlYte.js';
import { L as Label } from './label-DF0BU6VF.js';
import { a as toast } from './Toaster.svelte_svelte_type_style_lang-B5vkOu6x.js';
import { i as invalidateAll } from './client-Cc1XkR80.js';
import { h as handleApiResultWithCallbacks } from './api.util-Ci3Q0GvL.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import { S as Save } from './save-C3QNHVRC.js';
import { L as Lock } from './lock-B9QDNHSu.js';
import { T as Triangle_alert } from './triangle-alert-DaMn4J5b.js';
import { I as Info } from './info-B15Zc6Uj.js';
import { D as Dialog_description } from './dialog-description-R10GNeQ8.js';
import { K as Key } from './key-CSQPCTBC.js';
import { R as Refresh_cw } from './refresh-cw-CRz8nTZu.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import './create-id-DRrkdd12.js';
import './index-server-_G0R5Qhl.js';
import './noop-BrWcRgZY.js';
import './hidden-input-BsZkZal-.js';
import './index2-Da1jJcEh.js';
import './scroll-lock-C_EWKkAl.js';
import './events-CVA3EDdV.js';
import './use-id-BSIc2y_F.js';
import './x-BTRU5OLu.js';
import './Icon-DbVCNmsR.js';
import './exports-Cv9LZeD1.js';
import './errors.util-g315AnHn.js';

function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  const isOidcForcedByPublicEnv = public_env.PUBLIC_OIDC_ENABLED === "true";
  let showOidcConfigDialog = false;
  let oidcConfigForm = {
    clientId: data.settings?.auth?.oidc?.clientId || "",
    clientSecret: "",
    redirectUri: data.settings?.auth?.oidc?.redirectUri || "http://localhost:3000/auth/oidc/callback",
    authorizationEndpoint: data.settings?.auth?.oidc?.authorizationEndpoint || "",
    tokenEndpoint: data.settings?.auth?.oidc?.tokenEndpoint || "",
    userinfoEndpoint: data.settings?.auth?.oidc?.userinfoEndpoint || "",
    scopes: data.settings?.auth?.oidc?.scopes || "openid email profile"
  };
  let isLoading = { saving: false };
  let isOidcViewMode = data.oidcEnvVarsConfigured;
  let oidcConfiguredViaAppSettings = !!(data.settings?.auth?.oidc?.clientId && data.settings?.auth?.oidc?.redirectUri && data.settings?.auth?.oidc?.authorizationEndpoint && data.settings?.auth?.oidc?.tokenEndpoint);
  function handleOidcSwitchChange(checked) {
    settingsStore.update((current) => ({
      ...current,
      auth: { ...current.auth || {}, oidcEnabled: checked }
    }));
    if (checked && !data.oidcEnvVarsConfigured) {
      showOidcConfigDialog = true;
    }
  }
  function openOidcDialog() {
    showOidcConfigDialog = true;
  }
  async function handleSaveOidcConfig() {
    try {
      settingsStore.update((current) => {
        const existingAuth = { ...current.auth || {} };
        const newOidcConfig = {
          clientId: oidcConfigForm.clientId,
          clientSecret: oidcConfigForm.clientSecret,
          redirectUri: oidcConfigForm.redirectUri,
          authorizationEndpoint: oidcConfigForm.authorizationEndpoint,
          tokenEndpoint: oidcConfigForm.tokenEndpoint,
          userinfoEndpoint: oidcConfigForm.userinfoEndpoint,
          scopes: oidcConfigForm.scopes
        };
        return {
          ...current,
          auth: {
            ...existingAuth,
            oidcEnabled: true,
            oidc: newOidcConfig
          }
        };
      });
      await saveSettingsToServer();
      toast.success("OIDC configuration saved successfully.");
      showOidcConfigDialog = false;
    } catch (error) {
      console.error("Failed to save OIDC configuration:", error);
      toast.error("Failed to save OIDC configuration.", {
        description: error instanceof Error ? error.message : "An unknown error occurred."
      });
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
      $$payload3.title = `<title>Security Settings - Arcane</title>`;
    });
    $$payload2.out += `<div class="space-y-6"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><h1 class="text-3xl font-bold tracking-tight">Security Settings</h1> <p class="text-sm text-muted-foreground mt-1">Configure authentication methods and security policies</p></div> `;
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
            $$payload4.out += `<div class="flex items-center gap-2"><div class="bg-indigo-500/10 p-2 rounded-full">`;
            Lock($$payload4, { class: "text-indigo-500 size-5" });
            $$payload4.out += `<!----></div> <div><!---->`;
            Card_title($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Authentication Methods`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Card_description($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Configure how users sign in`;
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
            $$payload4.out += `<div class="space-y-4"><div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30"><div class="space-y-0.5"><label for="localAuthSwitch" class="text-base font-medium">Local Authentication</label> <p class="text-sm text-muted-foreground">Username and password stored in the system</p> <p class="text-xs text-muted-foreground mt-1">This is recommended to be enabled as a fallback option if OIDC authentication is unavailable.</p></div> `;
            Switch($$payload4, {
              id: "localAuthSwitch",
              checked: store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.localAuthEnabled ?? true,
              onCheckedChange: (checked) => {
                settingsStore.update((current) => ({
                  ...current,
                  auth: {
                    ...current.auth || {},
                    localAuthEnabled: checked
                  }
                }));
              }
            });
            $$payload4.out += `<!----></div> <div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30"><div class="space-y-0.5"><label for="oidcAuthSwitch" class="text-base font-medium">OIDC Authentication</label> <p class="text-sm text-muted-foreground">Use an External OIDC Provider `;
            if (isOidcForcedByPublicEnv) {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<span class="text-xs text-muted-foreground">(Forced ON by environment)</span>`;
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]--></p> `;
            if (isOidcForcedByPublicEnv || store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.oidcEnabled) {
              $$payload4.out += "<!--[-->";
              if (isOidcForcedByPublicEnv && !data.oidcEnvVarsConfigured) {
                $$payload4.out += "<!--[-->";
                Button($$payload4, {
                  variant: "link",
                  class: "p-0 h-auto text-xs text-destructive hover:underline",
                  onclick: openOidcDialog,
                  children: ($$payload5) => {
                    Triangle_alert($$payload5, { class: "mr-1 size-3" });
                    $$payload5.out += `<!----> OIDC is forced ON, but critical server settings are missing. Click for details.`;
                  },
                  $$slots: { default: true }
                });
              } else if (data.oidcEnvVarsConfigured) {
                $$payload4.out += "<!--[1-->";
                Button($$payload4, {
                  variant: "link",
                  class: "p-0 h-auto text-xs text-sky-600 hover:underline",
                  onclick: openOidcDialog,
                  children: ($$payload5) => {
                    Info($$payload5, { class: "mr-1 size-3" });
                    $$payload5.out += `<!----> OIDC is configured on server. View Status.`;
                  },
                  $$slots: { default: true }
                });
              } else if (oidcConfiguredViaAppSettings) {
                $$payload4.out += "<!--[2-->";
                Button($$payload4, {
                  variant: "link",
                  class: "p-0 h-auto text-xs text-sky-600 hover:underline",
                  onclick: openOidcDialog,
                  children: ($$payload5) => {
                    Info($$payload5, { class: "mr-1 size-3" });
                    $$payload5.out += `<!----> OIDC configured via application settings. Click to Manage Them.`;
                  },
                  $$slots: { default: true }
                });
              } else if (!showOidcConfigDialog) {
                $$payload4.out += "<!--[3-->";
                Button($$payload4, {
                  variant: "link",
                  class: "p-0 h-auto text-xs text-destructive hover:underline",
                  onclick: openOidcDialog,
                  children: ($$payload5) => {
                    Triangle_alert($$payload5, { class: "mr-1 size-3" });
                    $$payload5.out += `<!----> OIDC application settings not configured. Click to configure.`;
                  },
                  $$slots: { default: true }
                });
              } else {
                $$payload4.out += "<!--[!-->";
              }
              $$payload4.out += `<!--]-->`;
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]--></div> `;
            Switch($$payload4, {
              id: "oidcAuthSwitch",
              checked: isOidcForcedByPublicEnv || (store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.oidcEnabled ?? false),
              disabled: isOidcForcedByPublicEnv,
              onCheckedChange: handleOidcSwitchChange
            });
            $$payload4.out += `<!----></div></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <!---->`;
    Root($$payload2, {
      get open() {
        return showOidcConfigDialog;
      },
      set open($$value) {
        showOidcConfigDialog = $$value;
        $$settled = false;
      },
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Dialog_content($$payload3, {
          class: "sm:max-w-[600px]",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  children: ($$payload6) => {
                    if (isOidcViewMode) {
                      $$payload6.out += "<!--[-->";
                      $$payload6.out += `OIDC Configuration Status`;
                    } else {
                      $$payload6.out += "<!--[!-->";
                      $$payload6.out += `Configure OIDC Provider`;
                    }
                    $$payload6.out += `<!--]-->`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    if (isOidcViewMode) {
                      $$payload6.out += "<!--[-->";
                      $$payload6.out += `OIDC authentication is configured using server-side environment variables. `;
                      if (store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.oidcEnabled) {
                        $$payload6.out += "<!--[-->";
                        $$payload6.out += `It is currently active.`;
                      } else if (isOidcForcedByPublicEnv) {
                        $$payload6.out += "<!--[1-->";
                        $$payload6.out += `It is forced ON by environment variables but may require application settings to be saved if this is the first run.`;
                      } else {
                        $$payload6.out += "<!--[!-->";
                        $$payload6.out += `It is configured but currently disabled in application settings. You can enable it using the switch.`;
                      }
                      $$payload6.out += `<!--]--> <p class="mt-2">The following OIDC settings are loaded from the server environment:</p> <ul class="list-disc list-inside mt-1 text-xs space-y-1">`;
                      if (data.settings?.auth?.oidc) {
                        $$payload6.out += "<!--[-->";
                        $$payload6.out += `<li><strong>Client ID:</strong> ${escape_html(data.settings.auth.oidc.clientId)}</li> <li><strong>Client Secret:</strong> <span class="italic text-muted-foreground">(Sensitive - Not Displayed)</span></li> <li><strong>Redirect URI:</strong> ${escape_html(data.settings.auth.oidc.redirectUri)}</li> <li><strong>Authorization Endpoint:</strong> ${escape_html(data.settings.auth.oidc.authorizationEndpoint)}</li> <li><strong>Token Endpoint:</strong> ${escape_html(data.settings.auth.oidc.tokenEndpoint)}</li> <li><strong>User Info Endpoint:</strong> ${escape_html(data.settings.auth.oidc.userinfoEndpoint)}</li> <li><strong>Scopes:</strong> ${escape_html(data.settings.auth.oidc.scopes)}</li>`;
                      } else {
                        $$payload6.out += "<!--[!-->";
                        $$payload6.out += `<li><span class="text-destructive">OIDC configuration details not found in settings.</span></li>`;
                      }
                      $$payload6.out += `<!--]--></ul> <p class="mt-2 text-xs">Changes to these settings must be made in your server's environment configuration.</p>`;
                    } else {
                      $$payload6.out += "<!--[!-->";
                      $$payload6.out += `Configure the OIDC settings for your application. These settings will be saved and used for OIDC authentication. `;
                      if (isOidcForcedByPublicEnv && !data.oidcEnvVarsConfigured) {
                        $$payload6.out += "<!--[-->";
                        $$payload6.out += `<br/> <strong class="text-orange-600 text-xs mt-1 block">OIDC usage is currently forced ON by <code>PUBLIC_OIDC_ENABLED</code>, but critical server-side OIDC environment variables appear to be missing. Please configure them below and save, or ensure the corresponding server environment variables are set.</strong>`;
                      } else if (isOidcForcedByPublicEnv) {
                        $$payload6.out += "<!--[1-->";
                        $$payload6.out += `<br/> <strong class="text-orange-600 text-xs mt-1 block">OIDC usage is currently forced ON by <code>PUBLIC_OIDC_ENABLED</code>.</strong>`;
                      } else {
                        $$payload6.out += "<!--[!-->";
                      }
                      $$payload6.out += `<!--]-->`;
                    }
                    $$payload6.out += `<!--]-->`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            if (!isOidcViewMode) {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<div class="grid gap-4 py-4 max-h-[50vh] overflow-y-auto pr-2"><div class="grid grid-cols-4 items-center gap-4">`;
              Label($$payload4, {
                for: "oidcClientId",
                class: "text-right col-span-1",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Client ID`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                id: "oidcClientId",
                class: "col-span-3",
                placeholder: "Provided by your OIDC Provider",
                get value() {
                  return oidcConfigForm.clientId;
                },
                set value($$value) {
                  oidcConfigForm.clientId = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4">`;
              Label($$payload4, {
                for: "oidcClientSecret",
                class: "text-right col-span-1",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Client Secret`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                id: "oidcClientSecret",
                type: "password",
                class: "col-span-3",
                placeholder: "Provided by your OIDC Provider",
                get value() {
                  return oidcConfigForm.clientSecret;
                },
                set value($$value) {
                  oidcConfigForm.clientSecret = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4">`;
              Label($$payload4, {
                for: "oidcRedirectUri",
                class: "text-right col-span-1",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Redirect URI`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                id: "oidcRedirectUri",
                placeholder: "e.g., http://localhost:3000/auth/oidc/callback",
                class: "col-span-3",
                get value() {
                  return oidcConfigForm.redirectUri;
                },
                set value($$value) {
                  oidcConfigForm.redirectUri = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4">`;
              Label($$payload4, {
                for: "oidcAuthEndpoint",
                class: "text-right col-span-1",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Authorization URL`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                id: "oidcAuthEndpoint",
                class: "col-span-3",
                placeholder: "OIDC Provider's Authorization Endpoint",
                get value() {
                  return oidcConfigForm.authorizationEndpoint;
                },
                set value($$value) {
                  oidcConfigForm.authorizationEndpoint = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4">`;
              Label($$payload4, {
                for: "oidcTokenEndpoint",
                class: "text-right col-span-1",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Token URL`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                id: "oidcTokenEndpoint",
                class: "col-span-3",
                placeholder: "OIDC Provider's Token Endpoint",
                get value() {
                  return oidcConfigForm.tokenEndpoint;
                },
                set value($$value) {
                  oidcConfigForm.tokenEndpoint = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4">`;
              Label($$payload4, {
                for: "oidcUserinfoEndpoint",
                class: "text-right col-span-1",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->User Info URL`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                id: "oidcUserinfoEndpoint",
                class: "col-span-3",
                placeholder: "OIDC Provider's UserInfo Endpoint",
                get value() {
                  return oidcConfigForm.userinfoEndpoint;
                },
                set value($$value) {
                  oidcConfigForm.userinfoEndpoint = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4">`;
              Label($$payload4, {
                for: "oidcScopes",
                class: "text-right col-span-1",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Scopes`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                id: "oidcScopes",
                placeholder: "e.g., openid email profile",
                class: "col-span-3",
                get value() {
                  return oidcConfigForm.scopes;
                },
                set value($$value) {
                  oidcConfigForm.scopes = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div></div>`;
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]--> <!---->`;
            Dialog_footer($$payload4, {
              children: ($$payload5) => {
                Button($$payload5, {
                  variant: "outline",
                  onclick: () => showOidcConfigDialog = false,
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Close`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> `;
                if (!isOidcViewMode) {
                  $$payload5.out += "<!--[-->";
                  Button($$payload5, {
                    onclick: handleSaveOidcConfig,
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->Save Configuration`;
                    },
                    $$slots: { default: true }
                  });
                } else {
                  $$payload5.out += "<!--[!-->";
                }
                $$payload5.out += `<!--]-->`;
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
    $$payload2.out += `<!----> <div class="space-y-6"><!---->`;
    Card($$payload2, {
      class: "border shadow-sm",
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_header($$payload3, {
          class: "pb-3",
          children: ($$payload4) => {
            $$payload4.out += `<div class="flex items-center gap-2"><div class="bg-cyan-500/10 p-2 rounded-full">`;
            Key($$payload4, { class: "text-cyan-500 size-5" });
            $$payload4.out += `<!----></div> <div><!---->`;
            Card_title($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Session Settings`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Card_description($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Configure session behavior`;
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
            $$payload4.out += `<div class="space-y-4"><div class="space-y-2"><label for="sessionTimeout" class="text-sm font-medium">Session Timeout (minutes)</label> `;
            Input($$payload4, {
              type: "number",
              id: "sessionTimeout",
              name: "sessionTimeout",
              value: store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.sessionTimeout ?? 60,
              min: "15",
              max: "1440",
              oninput: (event) => {
                const target = event.target;
                settingsStore.update((current) => ({
                  ...current,
                  auth: {
                    ...current.auth ?? {},
                    sessionTimeout: parseInt(target.value)
                  }
                }));
              }
            });
            $$payload4.out += `<!----> <p class="text-xs text-muted-foreground">Time until inactive sessions are automatically logged out (15-1440 minutes)</p></div> <div class="space-y-2"><label for="passwordPolicy" class="text-sm font-medium">Password Policy</label> <div class="grid grid-cols-3 gap-2">`;
            Button($$payload4, {
              variant: (store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.passwordPolicy || "strong") === "basic" ? "default" : "outline",
              class: (store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.passwordPolicy || "strong") === "basic" ? "w-full arcane-button-create" : "w-full arcane-button-restart",
              onclick: () => {
                settingsStore.update((current) => ({
                  ...current,
                  auth: { ...current.auth, passwordPolicy: "basic" }
                }));
              },
              children: ($$payload5) => {
                $$payload5.out += `<!---->Basic`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Button($$payload4, {
              variant: (store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.passwordPolicy || "strong") === "standard" ? "default" : "outline",
              class: (store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.passwordPolicy || "strong") === "standard" ? "w-full arcane-button-create" : "w-full arcane-button-restart",
              onclick: () => {
                settingsStore.update((current) => ({
                  ...current,
                  auth: { ...current.auth, passwordPolicy: "standard" }
                }));
              },
              children: ($$payload5) => {
                $$payload5.out += `<!---->Standard`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Button($$payload4, {
              variant: (store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.passwordPolicy || "strong") === "strong" ? "default" : "outline",
              class: (store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.passwordPolicy || "strong") === "strong" ? "w-full arcane-button-create" : "w-full arcane-button-restart",
              onclick: () => {
                settingsStore.update((current) => ({
                  ...current,
                  auth: { ...current.auth, passwordPolicy: "strong" }
                }));
              },
              children: ($$payload5) => {
                $$payload5.out += `<!---->Strong`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div> <input type="hidden" id="passwordPolicy" name="passwordPolicy"${attr("value", store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.passwordPolicy || "strong")}/> <p class="text-xs text-muted-foreground mt-1">`;
            if (store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.passwordPolicy === "basic") {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `Basic: Minimum 8 characters`;
            } else if (store_get($$store_subs ??= {}, "$settingsStore", settingsStore).auth?.passwordPolicy === "standard") {
              $$payload4.out += "<!--[1-->";
              $$payload4.out += `Standard: Minimum 10 characters, requires mixed case and numbers`;
            } else {
              $$payload4.out += "<!--[!-->";
              $$payload4.out += `Strong: Minimum 12 characters, requires mixed case, numbers and special characters`;
            }
            $$payload4.out += `<!--]--></p></div></div>`;
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

export { _page as default };
//# sourceMappingURL=_page.svelte-De7nDuIc.js.map
