import { p as push, v as store_get, c as copy_payload, d as assign_payload, x as unsubscribe_stores, a as pop } from './index3-DI1Ivwzg.js';
import { B as Button } from './button-CUTwDrbo.js';
import { I as Input } from './input-Bs5Bjqyo.js';
import { L as Label } from './label-DF0BU6VF.js';
import { S as Switch } from './switch-D8BK2W40.js';
import './alert-BRXlGSSu.js';
import { C as Card } from './card-BHGzpLb_.js';
import { a as Card_header, C as Card_content, b as Card_title } from './card-title-Cbe9TU5i.js';
import { C as Card_description } from './card-description-D9_vEbkT.js';
import { s as settingsStore } from './settings-store-Cucc9Cev.js';
import './client-Cc1XkR80.js';
import { C as Chevron_right } from './chevron-right-EG31JOyw.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import './create-id-DRrkdd12.js';
import './index-server-_G0R5Qhl.js';
import './noop-BrWcRgZY.js';
import './hidden-input-BsZkZal-.js';
import './index2-Da1jJcEh.js';
import './exports-Cv9LZeD1.js';
import './Icon-DbVCNmsR.js';

function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let loading = false;
  let dockerHost = store_get($$store_subs ??= {}, "$settingsStore", settingsStore).dockerHost || "unix:///var/run/docker.sock";
  let pollingEnabled = store_get($$store_subs ??= {}, "$settingsStore", settingsStore).pollingEnabled !== void 0 ? store_get($$store_subs ??= {}, "$settingsStore", settingsStore).pollingEnabled : true;
  let pollingInterval = store_get($$store_subs ??= {}, "$settingsStore", settingsStore).pollingInterval || 10;
  let autoUpdate = store_get($$store_subs ??= {}, "$settingsStore", settingsStore).autoUpdate !== void 0 ? store_get($$store_subs ??= {}, "$settingsStore", settingsStore).autoUpdate : false;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div class="max-w-2xl mx-auto"><h1 class="text-3xl font-bold mb-4">Initial Setup</h1> <p class="mb-6 text-muted-foreground">Configure basic settings for Arcane. You can change these later from the Settings page.</p> `;
    {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> <form class="space-y-5"><!---->`;
    Card($$payload2, {
      class: "border shadow-sm",
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_header($$payload3, {
          class: "py-4",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Card_title($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Docker Connection`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Card_description($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Configure how Arcane connects to Docker`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card_content($$payload3, {
          class: "pt-0 pb-4",
          children: ($$payload4) => {
            $$payload4.out += `<div class="space-y-3">`;
            Label($$payload4, {
              for: "dockerHost",
              class: "text-base block mb-2",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Docker Host`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Input($$payload4, {
              id: "dockerHost",
              placeholder: "unix:///var/run/docker.sock",
              class: "px-4 bg-muted/10 h-12",
              get value() {
                return dockerHost;
              },
              set value($$value) {
                dockerHost = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----> <p class="text-xs text-muted-foreground">Examples: Unix: <code class="bg-muted/30 px-1 py-0.5 rounded">unix:///var/run/docker.sock</code></p></div>`;
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
          class: "py-4",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Card_title($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Monitoring &amp; Updates`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Card_description($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Configure how Arcane monitors containers`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card_content($$payload3, {
          class: "space-y-4 pt-0 pb-4",
          children: ($$payload4) => {
            $$payload4.out += `<div class="flex items-center justify-between rounded-lg border p-4"><div>`;
            Label($$payload4, {
              for: "pollingSwitch",
              class: "font-medium",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Container Status Polling`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <p class="text-sm text-muted-foreground">Periodically check container status</p></div> `;
            Switch($$payload4, {
              id: "pollingSwitch",
              checked: pollingEnabled,
              onCheckedChange: (checked) => pollingEnabled = checked
            });
            $$payload4.out += `<!----></div> `;
            if (pollingEnabled) {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<div class="px-4">`;
              Label($$payload4, {
                for: "pollingInterval",
                class: "text-base block mb-2",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Polling Interval (minutes)`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                id: "pollingInterval",
                type: "number",
                min: "5",
                max: "60",
                class: "px-4 bg-muted/10 h-12",
                get value() {
                  return pollingInterval;
                },
                set value($$value) {
                  pollingInterval = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----> <p class="text-xs text-muted-foreground mt-1">Set between 5-60 minutes.</p></div>`;
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]--> <div class="flex items-center justify-between rounded-lg border p-4"><div>`;
            Label($$payload4, {
              for: "autoUpdateSwitch",
              class: "font-medium",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Auto Update Containers`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <p class="text-sm text-muted-foreground">Update containers when newer images are available</p></div> `;
            Switch($$payload4, {
              id: "autoUpdateSwitch",
              checked: autoUpdate,
              onCheckedChange: (checked) => autoUpdate = checked
            });
            $$payload4.out += `<!----></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <div class="flex justify-center pt-4">`;
    Button($$payload2, {
      type: "submit",
      disabled: loading,
      class: "px-8 flex items-center gap-2 h-12 w-[80%]",
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
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-xrOQPYgQ.js.map
