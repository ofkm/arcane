import { p as push, c as copy_payload, d as assign_payload, a as pop } from './index3-DI1Ivwzg.js';
import { B as Button } from './button-CUTwDrbo.js';
import { I as Input } from './input-Bs5Bjqyo.js';
import { L as Label } from './label-DF0BU6VF.js';
import './alert-BRXlGSSu.js';
import './client-Cc1XkR80.js';
import { C as Chevron_right } from './chevron-right-EG31JOyw.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import './create-id-DRrkdd12.js';
import './index-server-_G0R5Qhl.js';
import './exports-Cv9LZeD1.js';
import './index2-Da1jJcEh.js';
import './Icon-DbVCNmsR.js';

function _page($$payload, $$props) {
  push();
  let password = "";
  let confirmPassword = "";
  let loading = false;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div class="max-w-lg mx-auto"><h1 class="text-3xl font-bold mb-8 text-center">Change Admin Password</h1> <div class="mb-8 space-y-2"><p class="text-center text-md">For security reasons, please change the default admin password.</p></div> `;
    {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> <form class="space-y-8"><div class="space-y-6"><div class="space-y-4">`;
    Label($$payload2, {
      for: "password",
      class: "text-base block mb-2",
      children: ($$payload3) => {
        $$payload3.out += `<!---->New Password`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Input($$payload2, {
      id: "password",
      type: "password",
      placeholder: "Enter new password",
      class: "px-4 bg-muted/10 h-12",
      required: true,
      get value() {
        return password;
      },
      set value($$value) {
        password = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----></div> <div class="space-y-4">`;
    Label($$payload2, {
      for: "confirmPassword",
      class: "text-base block mb-2",
      children: ($$payload3) => {
        $$payload3.out += `<!---->Confirm Password`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Input($$payload2, {
      id: "confirmPassword",
      type: "password",
      placeholder: "Confirm new password",
      class: "px-4 bg-muted/10 h-12",
      required: true,
      get value() {
        return confirmPassword;
      },
      set value($$value) {
        confirmPassword = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----></div></div> <div class="flex pt-8 justify-center">`;
    Button($$payload2, {
      type: "submit",
      disabled: loading,
      class: "px-8 flex items-center h-12 w-[80%]",
      children: ($$payload3) => {
        {
          $$payload3.out += "<!--[!-->";
        }
        $$payload3.out += `<!--]--> Continue `;
        Chevron_right($$payload3, { class: "size-4" });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div></form></div>`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-BKoyrEK_.js.map
