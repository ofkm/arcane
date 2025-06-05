import { a as pop, p as push, w as store_get, y as unsubscribe_stores } from "../../../../chunks/index3.js";
import { B as Button } from "../../../../chunks/button.js";
import { u as updateSettingsStore, s as settingsStore } from "../../../../chunks/settings-store.js";
import { g as goto } from "../../../../chunks/client.js";
import { C as Circle_check } from "../../../../chunks/circle-check.js";
import { C as Chevron_right } from "../../../../chunks/chevron-right.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  function handleContinue() {
    updateSettingsStore({
      onboarding: {
        ...store_get($$store_subs ??= {}, "$settingsStore", settingsStore).onboarding,
        completed: store_get($$store_subs ??= {}, "$settingsStore", settingsStore).onboarding?.completed ?? false,
        completedAt: store_get($$store_subs ??= {}, "$settingsStore", settingsStore).onboarding?.completedAt ?? "",
        steps: {
          ...store_get($$store_subs ??= {}, "$settingsStore", settingsStore).onboarding?.steps,
          welcome: true
        }
      }
    });
    goto();
  }
  $$payload.out += `<div class="max-w-3xl mx-auto"><h1 class="text-3xl font-bold mb-6">Welcome to Arcane</h1> <div class="mb-8 space-y-6"><p class="text-xl">Thank you for installing Arcane! Let's get you set up with a few quick steps.</p> <div class="space-y-4"><p class="text-lg font-medium">This wizard will help you:</p> <div class="space-y-3"><div class="flex items-start gap-3"><div class="rounded-full bg-primary/10 p-1 mt-0.5">`;
  Circle_check($$payload, { class: "text-primary size-4" });
  $$payload.out += `<!----></div> <p>Change the default admin password for security</p></div> <div class="flex items-start gap-3"><div class="rounded-full bg-primary/10 p-1 mt-0.5">`;
  Circle_check($$payload, { class: "text-primary size-4" });
  $$payload.out += `<!----></div> <p>Configure your Docker connection</p></div> <div class="flex items-start gap-3"><div class="rounded-full bg-primary/10 p-1 mt-0.5">`;
  Circle_check($$payload, { class: "text-primary size-4" });
  $$payload.out += `<!----></div> <p>Set basic application preferences</p></div></div> <p>This will only take a few minutes to complete.</p></div></div> <div class="flex justify-center pt-8">`;
  Button($$payload, {
    type: "button",
    onclick: handleContinue,
    class: "px-8 flex items-center gap-2 h-12 w-[80%]",
    children: ($$payload2) => {
      $$payload2.out += `<!---->Continue `;
      Chevron_right($$payload2, { class: "size-4" });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----></div></div>`;
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
