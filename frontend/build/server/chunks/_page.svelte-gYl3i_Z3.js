import { p as push, f as attr, a as pop, t as escape_html, b as spread_props } from './index3-DI1Ivwzg.js';
import { g as goto } from './client-Cc1XkR80.js';
import { B as Button } from './button-CUTwDrbo.js';
import { I as Input } from './input-Bs5Bjqyo.js';
import { L as Label } from './label-DF0BU6VF.js';
import { A as Alert } from './alert-BRXlGSSu.js';
import { A as Alert_title, a as Alert_description } from './alert-title-Ce5Et4hB.js';
import { p as public_env } from './shared-server-DIsQ43MR.js';
import { C as Circle_alert } from './circle-alert-Cc7lYjCi.js';
import { I as Icon } from './Icon-DbVCNmsR.js';
import { U as User } from './user-DEEZLh_h.js';
import { L as Lock } from './lock-B9QDNHSu.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import './exports-Cv9LZeD1.js';
import './index2-Da1jJcEh.js';
import './create-id-DRrkdd12.js';
import './index-server-_G0R5Qhl.js';

function Log_in($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "m10 17 5-5-5-5" }],
    ["path", { "d": "M15 12H3" }],
    [
      "path",
      {
        "d": "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "log-in" },
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
function _page($$payload, $$props) {
  push();
  let { data, form } = $$props;
  let loading = false;
  const oidcForcedByEnv = public_env.PUBLIC_OIDC_ENABLED === "true";
  const oidcEnabledBySettings = data.settings?.auth?.oidcEnabled === true;
  const showOidcLoginButton = oidcForcedByEnv || oidcEnabledBySettings;
  const localAuthEnabledBySettings = data.settings?.auth?.localAuthEnabled !== false;
  const showLocalLoginForm = localAuthEnabledBySettings;
  function handleOidcLogin() {
    data.redirectTo || "/";
    goto();
  }
  const showDivider = showOidcLoginButton && showLocalLoginForm;
  $$payload.out += `<div class="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background/50"><div class="w-full max-w-md space-y-8"><div class="text-center"><div class="flex justify-center"><img class="h-40 w-auto" src="/img/arcane.svg" alt="Arcane"/></div> <h1 class="text-2xl font-bold tracking-tight">Sign in to Arcane</h1> <p class="mt-2 text-sm text-muted-foreground">Manage your Container Environment</p></div> <div class="rounded-xl border bg-card shadow-sm p-6 sm:p-8">`;
  if (data.error) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<!---->`;
    Alert($$payload, {
      class: "mb-6",
      variant: "destructive",
      children: ($$payload2) => {
        Circle_alert($$payload2, { class: "size-4 mr-2" });
        $$payload2.out += `<!----> <!---->`;
        Alert_title($$payload2, {
          children: ($$payload3) => {
            $$payload3.out += `<!---->Login Problem`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!----> <!---->`;
        Alert_description($$payload2, {
          children: ($$payload3) => {
            if (data.error === "oidc_invalid_response") {
              $$payload3.out += "<!--[-->";
              $$payload3.out += `There was an issue with the OIDC login response. Please try again.`;
            } else if (data.error === "oidc_misconfigured") {
              $$payload3.out += "<!--[1-->";
              $$payload3.out += `OIDC is not configured correctly on the server. Please contact an administrator.`;
            } else if (data.error === "oidc_userinfo_failed") {
              $$payload3.out += "<!--[2-->";
              $$payload3.out += `Could not retrieve your user information from the OIDC provider.`;
            } else if (data.error === "oidc_missing_sub") {
              $$payload3.out += "<!--[3-->";
              $$payload3.out += `Your OIDC provider did not return a subject identifier.`;
            } else if (data.error === "oidc_email_collision") {
              $$payload3.out += "<!--[4-->";
              $$payload3.out += `An account with your email already exists but is linked to a different OIDC identity. Please contact an administrator.`;
            } else if (data.error === "oidc_token_error") {
              $$payload3.out += "<!--[5-->";
              $$payload3.out += `There was an error obtaining tokens from the OIDC provider.`;
            } else if (data.error === "user_processing_failed") {
              $$payload3.out += "<!--[6-->";
              $$payload3.out += `An error occurred while processing your user account.`;
            } else {
              $$payload3.out += "<!--[!-->";
              $$payload3.out += `An unexpected error occurred. Please try again.`;
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
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  if (form?.error) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<!---->`;
    Alert($$payload, {
      class: "mb-6",
      variant: "destructive",
      children: ($$payload2) => {
        Circle_alert($$payload2, { class: "size-4 mr-2" });
        $$payload2.out += `<!----> <!---->`;
        Alert_title($$payload2, {
          children: ($$payload3) => {
            $$payload3.out += `<!---->Authentication Failed`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!----> <!---->`;
        Alert_description($$payload2, {
          children: ($$payload3) => {
            $$payload3.out += `<!---->${escape_html(form.error)}`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  if (!showLocalLoginForm && !showOidcLoginButton) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<!---->`;
    Alert($$payload, {
      variant: "destructive",
      children: ($$payload2) => {
        Circle_alert($$payload2, { class: "size-4 mr-2" });
        $$payload2.out += `<!----> <!---->`;
        Alert_title($$payload2, {
          children: ($$payload3) => {
            $$payload3.out += `<!---->No Login Methods Configured`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!----> <!---->`;
        Alert_description($$payload2, {
          children: ($$payload3) => {
            $$payload3.out += `<!---->There are currently no login methods enabled. Please contact an administrator.`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  if (showOidcLoginButton && !showLocalLoginForm) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="pt-2">`;
    Button($$payload, {
      onclick: handleOidcLogin,
      variant: "default",
      class: "w-full py-6 text-base arcane-button-restart",
      children: ($$payload2) => {
        Log_in($$payload2, { class: "mr-3 size-5" });
        $$payload2.out += `<!----> Sign in with OIDC Provider`;
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!----></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  if (showLocalLoginForm) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<form method="POST" action="?/login" class="space-y-6"><input type="hidden" name="redirectTo"${attr("value", data.redirectTo)}/> <div class="space-y-4"><div>`;
    Label($$payload, {
      for: "username",
      class: "block text-sm font-medium mb-1.5",
      children: ($$payload2) => {
        $$payload2.out += `<!---->Username`;
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!----> <div class="relative"><div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">`;
    User($$payload, { class: "size-4" });
    $$payload.out += `<!----></div> `;
    Input($$payload, {
      id: "username",
      name: "username",
      type: "text",
      autocomplete: "username",
      required: true,
      value: form?.username ?? "",
      class: "pl-10",
      placeholder: "Enter your username or email"
    });
    $$payload.out += `<!----></div></div> <div>`;
    Label($$payload, {
      for: "password",
      class: "block text-sm font-medium mb-1.5",
      children: ($$payload2) => {
        $$payload2.out += `<!---->Password`;
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!----> <div class="relative"><div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">`;
    Lock($$payload, { class: "size-4" });
    $$payload.out += `<!----></div> `;
    Input($$payload, {
      id: "password",
      name: "password",
      type: "password",
      autocomplete: "current-password",
      required: true,
      class: "pl-10",
      placeholder: "Enter your password"
    });
    $$payload.out += `<!----></div></div></div> <div class="pt-2">`;
    Button($$payload, {
      type: "submit",
      class: "w-full py-6 text-base arcane-button-create",
      disabled: loading,
      "aria-busy": loading,
      children: ($$payload2) => {
        {
          $$payload2.out += "<!--[!-->";
        }
        $$payload2.out += `<!--]--> Sign in`;
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!----></div></form> `;
    if (showDivider) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<div class="relative my-8"><div class="absolute inset-0 flex items-center"><div class="w-full border-t border-border"></div></div> <div class="relative flex justify-center text-xs"><span class="bg-card px-4 text-muted-foreground">Or continue with</span></div></div>`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--> `;
    if (showOidcLoginButton && showDivider) {
      $$payload.out += "<!--[-->";
      Button($$payload, {
        onclick: handleOidcLogin,
        variant: "outline",
        class: "w-full py-5 arcane-button-restart",
        children: ($$payload2) => {
          Log_in($$payload2, { class: "mr-2 size-4" });
          $$payload2.out += `<!----> Sign in with OIDC Provider`;
        },
        $$slots: { default: true }
      });
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]-->`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div> <p class="text-center text-xs text-muted-foreground"><a href="https://github.com/ofkm/arcane" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">View on GitHub</a></p></div></div>`;
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-gYl3i_Z3.js.map
