import "clsx";
import { u as copy_payload, v as assign_payload, a as pop, p as push } from "../../../../chunks/index3.js";
import { B as Button } from "../../../../chunks/button.js";
import { I as Input } from "../../../../chunks/input.js";
import { L as Label } from "../../../../chunks/label.js";
import "../../../../chunks/alert.js";
import "../../../../chunks/client.js";
import { C as Chevron_right } from "../../../../chunks/chevron-right.js";
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
export {
  _page as default
};
