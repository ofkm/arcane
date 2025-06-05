import { p as push, t as escape_html, a as pop, f as attr, j as ensure_array_like } from './index3-DI1Ivwzg.js';
import { C as Card } from './card-BHGzpLb_.js';
import { a as Card_header, b as Card_title, C as Card_content } from './card-title-Cbe9TU5i.js';
import './button-CUTwDrbo.js';
import { B as Breadcrumb, a as Breadcrumb_list, b as Breadcrumb_item, c as Breadcrumb_link, d as Breadcrumb_separator, e as Breadcrumb_page } from './breadcrumb-page-BG7b-RXW.js';
import { g as goto } from './client-Cc1XkR80.js';
import { S as Separator } from './separator-aTxaolX1.js';
import { B as Badge } from './badge-Pb9wGjGi.js';
import { f as formatDate } from './string.utils-DW_mmI0J.js';
import { f as formatBytes } from './bytes.util-aLEoH8w0.js';
import { o as openConfirmDialog } from './index8-BdgpbvMa.js';
import { h as handleApiResultWithCallbacks } from './api.util-Ci3Q0GvL.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import { I as ImageAPIService } from './image-api-service-hks713bt.js';
import { a as toast } from './Toaster.svelte_svelte_type_style_lang-B5vkOu6x.js';
import { A as Arcane_button } from './arcane-button-DukVn74_.js';
import { H as Hash } from './hash-zyddjtSj.js';
import { H as Hard_drive } from './hard-drive-DYOg6VMo.js';
import { C as Clock } from './clock-BAJle9Um.js';
import { C as Cpu } from './cpu-DMeHAz0f.js';
import { L as Layers } from './layers-B6y2ShX1.js';
import { T as Tag } from './tag-DosB7xrx.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import './chevron-right-EG31JOyw.js';
import './Icon-DbVCNmsR.js';
import './exports-Cv9LZeD1.js';
import './index2-Da1jJcEh.js';
import './create-id-DRrkdd12.js';
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
  let { data } = $$props;
  let { image } = data;
  const imageApi = new ImageAPIService();
  let isLoading = {
    removing: false
  };
  const shortId = image?.Id.split(":")[1].substring(0, 12) || "N/A";
  const createdDate = image?.Created ? formatDate(image.Created) : "N/A";
  const imageSize = formatBytes(image?.Size || 0);
  async function handleImageRemove(id) {
    openConfirmDialog({
      title: "Delete Image",
      message: `Are you sure you want to delete this image? This action cannot be undone.`,
      confirm: {
        label: "Delete",
        destructive: true,
        action: async () => {
          await handleApiResultWithCallbacks({
            result: await tryCatch(imageApi.remove(id)),
            message: "Failed to Remove Image",
            setLoadingState: (value) => isLoading.removing = value,
            onSuccess: async () => {
              toast.success("Image Removed Successfully.");
              goto();
            }
          });
        }
      }
    });
  }
  $$payload.out += `<div class="space-y-6 pb-8"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><!---->`;
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
                href: "/images",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Images`;
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
                  $$payload5.out += `<!---->${escape_html(shortId)}`;
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
  $$payload.out += `<!----> <div class="mt-2 flex items-center gap-2"><h1 class="text-2xl font-bold tracking-tight break-all">${escape_html(image?.RepoTags?.[0] || shortId)}</h1></div></div> <div class="flex gap-2 flex-wrap">`;
  Arcane_button($$payload, {
    action: "remove",
    onClick: () => handleImageRemove(image.Id),
    loading: isLoading.removing,
    disabled: isLoading.removing,
    size: "sm"
  });
  $$payload.out += `<!----></div></div> `;
  if (image) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="space-y-6"><!---->`;
    Card($$payload, {
      class: "border shadow-sm",
      children: ($$payload2) => {
        $$payload2.out += `<!---->`;
        Card_header($$payload2, {
          children: ($$payload3) => {
            $$payload3.out += `<!---->`;
            Card_title($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<!---->Image Details`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!----> <!---->`;
        Card_content($$payload2, {
          children: ($$payload3) => {
            $$payload3.out += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"><div class="flex items-start gap-3"><div class="bg-gray-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Hash($$payload3, { class: "text-gray-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">ID</p> <p class="text-base font-semibold mt-1 truncate"${attr("title", image.Id)}>${escape_html(shortId)}</p></div></div> <div class="flex items-start gap-3"><div class="bg-blue-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Hard_drive($$payload3, { class: "text-blue-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Size</p> <p class="text-base font-semibold mt-1">${escape_html(imageSize)}</p></div></div> <div class="flex items-start gap-3"><div class="bg-green-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Clock($$payload3, { class: "text-green-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Created</p> <p class="text-base font-semibold mt-1">${escape_html(createdDate)}</p></div></div> <div class="flex items-start gap-3"><div class="bg-orange-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Cpu($$payload3, { class: "text-orange-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Architecture</p> <p class="text-base font-semibold mt-1">${escape_html(image.Architecture || "N/A")}</p></div></div> <div class="flex items-start gap-3"><div class="bg-indigo-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Layers($$payload3, { class: "text-indigo-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">OS</p> <p class="text-base font-semibold mt-1">${escape_html(image.Os || "N/A")}</p></div></div></div>`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!----> `;
    if (image.RepoTags && image.RepoTags.length > 0) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<!---->`;
      Card($$payload, {
        class: "border shadow-sm",
        children: ($$payload2) => {
          $$payload2.out += `<!---->`;
          Card_header($$payload2, {
            children: ($$payload3) => {
              $$payload3.out += `<!---->`;
              Card_title($$payload3, {
                class: "flex items-center gap-2",
                children: ($$payload4) => {
                  Tag($$payload4, { class: "text-muted-foreground size-5" });
                  $$payload4.out += `<!----> Tags`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload2.out += `<!----> <!---->`;
          Card_content($$payload2, {
            children: ($$payload3) => {
              const each_array = ensure_array_like(image.RepoTags);
              $$payload3.out += `<div class="flex flex-wrap gap-2"><!--[-->`;
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let tag = each_array[$$index];
                Badge($$payload3, {
                  variant: "secondary",
                  children: ($$payload4) => {
                    $$payload4.out += `<!---->${escape_html(tag)}`;
                  },
                  $$slots: { default: true }
                });
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
    if (image.Config?.Labels && Object.keys(image.Config.Labels).length > 0) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<!---->`;
      Card($$payload, {
        class: "border shadow-sm",
        children: ($$payload2) => {
          $$payload2.out += `<!---->`;
          Card_header($$payload2, {
            children: ($$payload3) => {
              $$payload3.out += `<!---->`;
              Card_title($$payload3, {
                children: ($$payload4) => {
                  $$payload4.out += `<!---->Labels`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload2.out += `<!----> <!---->`;
          Card_content($$payload2, {
            class: "space-y-2",
            children: ($$payload3) => {
              const each_array_1 = ensure_array_like(Object.entries(image.Config.Labels));
              $$payload3.out += `<!--[-->`;
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let [key, value] = each_array_1[$$index_1];
                $$payload3.out += `<div class="text-sm flex flex-col sm:flex-row sm:items-center"><span class="font-medium text-muted-foreground w-full sm:w-1/4 break-all">${escape_html(key)}:</span> <span class="font-mono text-xs sm:text-sm break-all w-full sm:w-3/4">${escape_html(value)}</span></div> `;
                if (!Object.is(Object.keys(image.Config.Labels).length - 1, Object.keys(image.Config.Labels).indexOf(key))) {
                  $$payload3.out += "<!--[-->";
                  Separator($$payload3, { class: "my-2" });
                } else {
                  $$payload3.out += "<!--[!-->";
                }
                $$payload3.out += `<!--]-->`;
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
    $$payload.out += `<!--]--></div>`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<div class="text-center py-12"><p class="text-lg font-medium text-muted-foreground">Image not found.</p> `;
    Arcane_button($$payload, {
      action: "cancel",
      customLabel: "Back to Images",
      onClick: () => goto(),
      size: "sm",
      class: "mt-4"
    });
    $$payload.out += `<!----></div>`;
  }
  $$payload.out += `<!--]--></div>`;
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DSzZW-KA.js.map
