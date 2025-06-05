import { p as push, t as escape_html, a as pop, j as ensure_array_like } from './index3-DI1Ivwzg.js';
import { C as Card } from './card-BHGzpLb_.js';
import { a as Card_header, b as Card_title, C as Card_content } from './card-title-Cbe9TU5i.js';
import { C as Card_description } from './card-description-D9_vEbkT.js';
import { B as Breadcrumb, a as Breadcrumb_list, b as Breadcrumb_item, c as Breadcrumb_link, d as Breadcrumb_separator, e as Breadcrumb_page } from './breadcrumb-page-BG7b-RXW.js';
import { g as goto } from './client-Cc1XkR80.js';
import { A as Alert } from './alert-BRXlGSSu.js';
import { A as Alert_title, a as Alert_description } from './alert-title-Ce5Et4hB.js';
import { S as Status_badge } from './status-badge-55QtloxC.js';
import { f as formatDate } from './string.utils-DW_mmI0J.js';
import { o as openConfirmDialog } from './index8-BdgpbvMa.js';
import { a as toast } from './Toaster.svelte_svelte_type_style_lang-B5vkOu6x.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import { h as handleApiResultWithCallbacks } from './api.util-Ci3Q0GvL.js';
import { V as VolumeAPIService } from './volume-api-service-B23LwP3S.js';
import { A as Arcane_button } from './arcane-button-DukVn74_.js';
import { C as Circle_alert } from './circle-alert-Cc7lYjCi.js';
import { D as Database } from './database-B1l6QNBG.js';
import { H as Hard_drive } from './hard-drive-DYOg6VMo.js';
import { C as Clock } from './clock-BAJle9Um.js';
import { G as Globe } from './globe-CN05eax4.js';
import { I as Info } from './info-B15Zc6Uj.js';
import { L as Layers } from './layers-B6y2ShX1.js';
import { T as Tag } from './tag-DosB7xrx.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import './button-CUTwDrbo.js';
import './chevron-right-EG31JOyw.js';
import './Icon-DbVCNmsR.js';
import './exports-Cv9LZeD1.js';
import './index2-Da1jJcEh.js';
import './index-server-_G0R5Qhl.js';
import './errors.util-g315AnHn.js';
import './api-service-DMPLrOP8.js';
import 'axios';
import './layout-template-C_FDbO2k.js';
import './save-C3QNHVRC.js';
import './x-BTRU5OLu.js';
import './check-CkcwyHfy.js';
import './file-text-C4b752KJ.js';
import './play-_c2l8cZS.js';
import './trash-2-BUIKTnnR.js';
import './circle-stop-CL2cQsOt.js';
import './loader-circle-BJifzSLw.js';

function _page($$payload, $$props) {
  push();
  let { data, form } = $$props;
  let { volume, inUse } = data;
  let isLoading = { remove: false };
  const createdDate = volume?.CreatedAt ? formatDate(volume.CreatedAt) : "N/A";
  const volumeApi = new VolumeAPIService();
  async function handleRemoveVolumeConfirm(volumeName) {
    let message = "Are you sure you want to delete this volume? This action cannot be undone.";
    if (inUse) {
      message += "\n\n⚠️ Warning: This volume is currently in use by containers. Forcing removal may cause data loss or container issues.";
    }
    openConfirmDialog({
      title: "Delete Volume",
      message,
      confirm: {
        label: "Delete",
        destructive: true,
        action: async () => {
          handleApiResultWithCallbacks({
            result: await tryCatch(volumeApi.remove(volumeName)),
            message: "Failed to Remove Volume",
            setLoadingState: (value) => isLoading.remove = value,
            onSuccess: async () => {
              toast.success("Volume Removed Successfully.");
              goto();
            }
          });
        }
      }
    });
  }
  $$payload.out += `<div class="space-y-6 pb-8"><div class="flex flex-col space-y-4"><!---->`;
  Breadcrumb($$payload, {
    children: ($$payload2) => {
      $$payload2.out += `<!---->`;
      Breadcrumb_list($$payload2, {
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Breadcrumb_item($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->`;
              Breadcrumb_link($$payload4, {
                href: "/volumes",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Volumes`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Breadcrumb_separator($$payload3, {});
          $$payload3.out += `<!----> <!---->`;
          Breadcrumb_item($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->`;
              Breadcrumb_page($$payload4, {
                children: ($$payload5) => {
                  $$payload5.out += `<!---->${escape_html(volume?.Name || "Details")}`;
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
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----> <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div class="flex flex-col"><div class="flex items-center gap-3"><h1 class="text-2xl font-bold tracking-tight">${escape_html(volume?.Name || "Volume Details")}</h1></div> <div class="flex gap-2 mt-2">`;
  if (inUse) {
    $$payload.out += "<!--[-->";
    Status_badge($$payload, { variant: "green", text: "In Use" });
  } else {
    $$payload.out += "<!--[!-->";
    Status_badge($$payload, { variant: "amber", text: "Unused" });
  }
  $$payload.out += `<!--]--> `;
  if (volume?.Driver) {
    $$payload.out += "<!--[-->";
    Status_badge($$payload, { variant: "blue", text: volume.Driver });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  if (volume?.Scope) {
    $$payload.out += "<!--[-->";
    Status_badge($$payload, { variant: "purple", text: volume.Scope });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div></div> <div class="flex gap-2 self-start">`;
  Arcane_button($$payload, {
    action: "remove",
    customLabel: "Remove Volume",
    onClick: () => handleRemoveVolumeConfirm(volume?.Name),
    loading: isLoading.remove,
    disabled: isLoading.remove
  });
  $$payload.out += `<!----></div></div></div> `;
  if (form?.error) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<!---->`;
    Alert($$payload, {
      variant: "destructive",
      children: ($$payload2) => {
        Circle_alert($$payload2, { class: "mr-2 size-4" });
        $$payload2.out += `<!----> <!---->`;
        Alert_title($$payload2, {
          children: ($$payload3) => {
            $$payload3.out += `<!---->Action Failed`;
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
  if (volume) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="space-y-6"><!---->`;
    Card($$payload, {
      class: "border shadow-sm",
      children: ($$payload2) => {
        $$payload2.out += `<!---->`;
        Card_header($$payload2, {
          class: "pb-0",
          children: ($$payload3) => {
            $$payload3.out += `<!---->`;
            Card_title($$payload3, {
              class: "flex items-center gap-2 text-lg",
              children: ($$payload4) => {
                Database($$payload4, { class: "text-primary size-5" });
                $$payload4.out += `<!----> Volume Details`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> <!---->`;
            Card_description($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<!---->Basic information about this Docker volume`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!----> <!---->`;
        Card_content($$payload2, {
          class: "pt-6",
          children: ($$payload3) => {
            $$payload3.out += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6"><div class="flex items-start gap-3"><div class="bg-gray-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Database($$payload3, { class: "text-gray-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Name</p> <p class="text-base font-semibold mt-1 break-words">${escape_html(volume.Name)}</p></div></div> <div class="flex items-start gap-3"><div class="bg-blue-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Hard_drive($$payload3, { class: "text-blue-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Driver</p> <p class="text-base font-semibold mt-1">${escape_html(volume.Driver)}</p></div></div> <div class="flex items-start gap-3"><div class="bg-green-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Clock($$payload3, { class: "text-green-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Created</p> <p class="text-base font-semibold mt-1">${escape_html(createdDate)}</p></div></div> <div class="flex items-start gap-3"><div class="bg-purple-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Globe($$payload3, { class: "text-purple-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Scope</p> <p class="text-base font-semibold mt-1 capitalize">${escape_html(volume.Scope)}</p></div></div> <div class="flex items-start gap-3"><div class="bg-amber-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Info($$payload3, { class: "text-amber-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Status</p> <p class="text-base font-semibold mt-1">`;
            if (inUse) {
              $$payload3.out += "<!--[-->";
              Status_badge($$payload3, { variant: "green", text: "In Use" });
            } else {
              $$payload3.out += "<!--[!-->";
              Status_badge($$payload3, { variant: "amber", text: "Unused" });
            }
            $$payload3.out += `<!--]--></p></div></div> <div class="flex items-start gap-3 col-span-1 sm:col-span-2 lg:col-span-3"><div class="bg-teal-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Layers($$payload3, { class: "text-teal-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Mountpoint</p> <div class="mt-2 bg-muted/50 p-3 rounded-lg border"><code class="text-sm font-mono break-all">${escape_html(volume.Mountpoint)}</code></div></div></div></div>`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!----> `;
    if (volume.Labels && Object.keys(volume.Labels).length > 0) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<!---->`;
      Card($$payload, {
        class: "border shadow-sm",
        children: ($$payload2) => {
          $$payload2.out += `<!---->`;
          Card_header($$payload2, {
            class: "pb-0",
            children: ($$payload3) => {
              $$payload3.out += `<!---->`;
              Card_title($$payload3, {
                class: "flex items-center gap-2 text-lg",
                children: ($$payload4) => {
                  Tag($$payload4, { class: "text-primary size-5" });
                  $$payload4.out += `<!----> Labels`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!----> <!---->`;
              Card_description($$payload3, {
                children: ($$payload4) => {
                  $$payload4.out += `<!---->User-defined metadata attached to this volume`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload2.out += `<!----> <!---->`;
          Card_content($$payload2, {
            class: "pt-6",
            children: ($$payload3) => {
              const each_array = ensure_array_like(Object.entries(volume.Labels));
              $$payload3.out += `<div class="bg-card rounded-lg border divide-y"><!--[-->`;
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let [key, value] = each_array[$$index];
                $$payload3.out += `<div class="p-3 flex flex-col sm:flex-row"><div class="font-medium text-muted-foreground w-full sm:w-1/3 break-all mb-2 sm:mb-0">${escape_html(key)}</div> <div class="font-mono text-xs sm:text-sm break-all w-full sm:w-2/3 bg-muted/50 p-2 rounded">${escape_html(value)}</div></div>`;
              }
              $$payload3.out += `<!--]--></div>`;
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
    if (volume.Options && Object.keys(volume.Options).length > 0) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<!---->`;
      Card($$payload, {
        class: "border shadow-sm",
        children: ($$payload2) => {
          $$payload2.out += `<!---->`;
          Card_header($$payload2, {
            class: "pb-0",
            children: ($$payload3) => {
              $$payload3.out += `<!---->`;
              Card_title($$payload3, {
                class: "flex items-center gap-2 text-lg",
                children: ($$payload4) => {
                  Hard_drive($$payload4, { class: "text-primary size-5" });
                  $$payload4.out += `<!----> Driver Options`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!----> <!---->`;
              Card_description($$payload3, {
                children: ($$payload4) => {
                  $$payload4.out += `<!---->Volume driver-specific options`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload2.out += `<!----> <!---->`;
          Card_content($$payload2, {
            class: "pt-6",
            children: ($$payload3) => {
              const each_array_1 = ensure_array_like(Object.entries(volume.Options));
              $$payload3.out += `<div class="bg-card rounded-lg border divide-y"><!--[-->`;
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let [key, value] = each_array_1[$$index_1];
                $$payload3.out += `<div class="p-3 flex flex-col sm:flex-row"><div class="font-medium text-muted-foreground w-full sm:w-1/3 break-all mb-2 sm:mb-0">${escape_html(key)}</div> <div class="font-mono text-xs sm:text-sm break-all w-full sm:w-2/3 bg-muted/50 p-2 rounded">${escape_html(value)}</div></div>`;
              }
              $$payload3.out += `<!--]--></div>`;
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
    if ((!volume.Labels || Object.keys(volume.Labels).length === 0) && (!volume.Options || Object.keys(volume.Options).length === 0)) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<!---->`;
      Card($$payload, {
        class: "border shadow-sm bg-muted/10",
        children: ($$payload2) => {
          $$payload2.out += `<!---->`;
          Card_content($$payload2, {
            class: "pt-6 pb-6 text-center",
            children: ($$payload3) => {
              $$payload3.out += `<div class="flex flex-col items-center justify-center"><div class="bg-muted/30 rounded-full p-3 mb-4">`;
              Tag($$payload3, {
                class: "text-muted-foreground opacity-50 size-5"
              });
              $$payload3.out += `<!----></div> <p class="text-muted-foreground">This volume has no additional labels or driver options.</p></div>`;
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
    $$payload.out += `<!--]--></div>`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<div class="flex flex-col items-center justify-center py-16 px-4 text-center"><div class="bg-muted/30 rounded-full p-4 mb-4">`;
    Database($$payload, {
      class: "text-muted-foreground size-10 opacity-70"
    });
    $$payload.out += `<!----></div> <h2 class="text-xl font-medium mb-2">Volume Not Found</h2> <p class="text-muted-foreground mb-6">The requested volume could not be found or is no longer available.</p> `;
    Arcane_button($$payload, {
      action: "cancel",
      customLabel: "Back to Volumes",
      onClick: () => goto(),
      size: "sm"
    });
    $$payload.out += `<!----></div>`;
  }
  $$payload.out += `<!--]--></div>`;
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-BZGD24nn.js.map
