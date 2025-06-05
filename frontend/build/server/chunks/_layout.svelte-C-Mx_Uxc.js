import { p as push, j as ensure_array_like, o as attr_class, t as escape_html, a as pop } from './index3-DI1Ivwzg.js';
import { p as page } from './index6-9LopUH1G.js';
import { C as Circle_check } from './circle-check-CTBnpdJg.js';
import { K as Key } from './key-CSQPCTBC.js';
import { S as Settings } from './settings-dVRciV0i.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import './client-Cc1XkR80.js';
import './exports-Cv9LZeD1.js';
import './index2-Da1jJcEh.js';
import './Icon-DbVCNmsR.js';

function _layout($$payload, $$props) {
  push();
  let { children } = $$props;
  const steps = [
    {
      id: "welcome",
      label: "Welcome",
      path: "/onboarding/welcome",
      icon: Circle_check
    },
    {
      id: "password",
      label: "Admin Password",
      path: "/onboarding/password",
      icon: Key
    },
    {
      id: "settings",
      label: "Initial Setup",
      path: "/onboarding/settings",
      icon: Settings
    },
    {
      id: "complete",
      label: "Complete",
      path: "/onboarding/complete",
      icon: Circle_check
    }
  ];
  let currentStep = steps.findIndex((step) => page.url.pathname === step.path);
  const each_array = ensure_array_like(steps);
  $$payload.out += `<div class="min-h-screen flex flex-col"><header class="pb-6 px-8 border-b"><div class="flex items-center"><img src="/img/arcane.png" alt="Arcane" class="size-12"/> <h1 class="ml-4 text-2xl font-bold">Arcane Setup</h1></div></header> <div class="container mx-auto px-4 py-6"><div class="flex items-center justify-between mb-8"><!--[-->`;
  for (let i = 0, $$length = each_array.length; i < $$length; i++) {
    let step = each_array[i];
    $$payload.out += `<div class="flex flex-col items-center"><div${attr_class(`rounded-full size-10 flex items-center justify-center ${i <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`)}><!---->`;
    step.icon($$payload, { class: "size-5" });
    $$payload.out += `<!----></div> <span${attr_class(`text-sm mt-2 ${i <= currentStep ? "text-foreground" : "text-muted-foreground"}`)}>${escape_html(step.label)}</span></div> `;
    if (i < steps.length - 1) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<div${attr_class(`h-1 flex-1 ${i < currentStep ? "bg-primary" : "bg-muted"}`)}></div>`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]-->`;
  }
  $$payload.out += `<!--]--></div></div> <main class="flex-1 container mx-auto px-4 py-6">`;
  children?.($$payload);
  $$payload.out += `<!----></main></div>`;
  pop();
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-C-Mx_Uxc.js.map
