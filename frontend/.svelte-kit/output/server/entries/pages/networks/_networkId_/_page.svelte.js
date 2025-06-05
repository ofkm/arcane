import { j as spread_props, a as pop, p as push, k as escape_html, b as attr, l as ensure_array_like, n as stringify } from "../../../../chunks/index3.js";
import { C as Card } from "../../../../chunks/card.js";
import { a as Card_header, b as Card_title, C as Card_content } from "../../../../chunks/card-title.js";
import { C as Card_description } from "../../../../chunks/card-description.js";
import "clsx";
import { B as Breadcrumb, a as Breadcrumb_list, b as Breadcrumb_item, c as Breadcrumb_link, d as Breadcrumb_separator, e as Breadcrumb_page } from "../../../../chunks/breadcrumb-page.js";
import { A as Alert } from "../../../../chunks/alert.js";
import { A as Alert_title, a as Alert_description } from "../../../../chunks/alert-title.js";
import { S as Status_badge } from "../../../../chunks/status-badge.js";
import { f as formatDate } from "../../../../chunks/string.utils.js";
import { a as toast } from "../../../../chunks/Toaster.svelte_svelte_type_style_lang.js";
import { o as openConfirmDialog } from "../../../../chunks/index8.js";
import { A as Arcane_button } from "../../../../chunks/arcane-button.js";
import { g as goto } from "../../../../chunks/client.js";
import { h as handleApiResultWithCallbacks } from "../../../../chunks/api.util.js";
import { t as tryCatch } from "../../../../chunks/try-catch.js";
import { N as NetworkAPIService } from "../../../../chunks/network-api-service.js";
import { N as Network } from "../../../../chunks/network.js";
import { H as Hash } from "../../../../chunks/hash.js";
import { H as Hard_drive } from "../../../../chunks/hard-drive.js";
import { G as Globe } from "../../../../chunks/globe.js";
import { C as Clock } from "../../../../chunks/clock.js";
import { L as Layers } from "../../../../chunks/layers.js";
import { S as Settings } from "../../../../chunks/settings.js";
import { I as Icon } from "../../../../chunks/Icon.js";
import { C as Container } from "../../../../chunks/container.js";
import { T as Tag } from "../../../../chunks/tag.js";
import { C as Circle_alert } from "../../../../chunks/circle-alert.js";
function List_tree($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M21 12h-8" }],
    ["path", { "d": "M21 6H8" }],
    ["path", { "d": "M21 18h-8" }],
    ["path", { "d": "M3 6v4c0 1.1.9 2 2 2h3" }],
    ["path", { "d": "M3 10v6c0 1.1.9 2 2 2h3" }]
  ];
  Icon($$payload, spread_props([
    { name: "list-tree" },
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
  let { data } = $$props;
  let { network } = data;
  let errorMessage = "";
  let isRemoving = false;
  const networkApi = new NetworkAPIService();
  const shortId = network?.Id?.substring(0, 12) || "N/A";
  const createdDate = network?.Created ? formatDate(network.Created) : "N/A";
  const connectedContainers = network?.Containers ? Object.values(network.Containers) : [];
  const inUse = connectedContainers.length > 0;
  const isPredefined = network?.Name === "bridge" || network?.Name === "host" || network?.Name === "none";
  function triggerRemove() {
    if (isPredefined) {
      toast.error("Cannot Remove Predefined Networks");
      console.warn("Cannot remove predefined network");
      return;
    }
    if (!network?.Id) {
      toast.error("Network ID is missing");
      return;
    }
    openConfirmDialog({
      title: "Remove Network",
      message: `Are you sure you want to remove the network "${network?.Name || shortId}"? This action cannot be undone.`,
      confirm: {
        label: "Remove",
        destructive: true,
        action: async () => {
          handleApiResultWithCallbacks({
            result: await tryCatch(networkApi.remove(network.Id)),
            message: "Failed to remove network",
            setLoadingState: (value) => isRemoving = value,
            onSuccess: async () => {
              toast.success(`Network "${network.Name || shortId}" removed successfully`);
              goto();
            },
            onError: (error) => {
              errorMessage = error?.message || "An error occurred while removing the network";
              toast.error(errorMessage);
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
                href: "/networks",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Networks`;
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
                  $$payload5.out += `<!---->${escape_html(network?.Name || shortId)}`;
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
  $$payload.out += `<!----> <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div class="flex flex-col"><div class="flex items-center gap-3"><h1 class="text-2xl font-bold tracking-tight">${escape_html(network?.Name || "Network Details")}</h1> <div class="hidden sm:block">`;
  Status_badge($$payload, { variant: "gray", text: `ID: ${shortId}` });
  $$payload.out += `<!----></div></div> <div class="flex gap-2 mt-2">`;
  if (inUse) {
    $$payload.out += "<!--[-->";
    Status_badge($$payload, {
      variant: "green",
      text: `In Use (${connectedContainers.length})`
    });
  } else {
    $$payload.out += "<!--[!-->";
    Status_badge($$payload, { variant: "amber", text: "Unused" });
  }
  $$payload.out += `<!--]--> `;
  if (isPredefined) {
    $$payload.out += "<!--[-->";
    Status_badge($$payload, { variant: "blue", text: "Predefined" });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  Status_badge($$payload, {
    variant: "purple",
    text: network?.Driver || "Unknown"
  });
  $$payload.out += `<!----></div></div> <div class="self-start">`;
  Arcane_button($$payload, {
    action: "remove",
    customLabel: "Remove Network",
    onClick: triggerRemove,
    loading: isRemoving,
    disabled: isRemoving || isPredefined,
    label: isPredefined ? "Cannot remove predefined networks" : "Delete Network"
  });
  $$payload.out += `<!----></div></div></div> `;
  if (errorMessage) {
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
            $$payload3.out += `<!---->${escape_html(errorMessage)}`;
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
  if (network) {
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
                Network($$payload4, { class: "text-primary size-5" });
                $$payload4.out += `<!----> Network Details`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> <!---->`;
            Card_description($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<!---->Basic information about this Docker network`;
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
            Hash($$payload3, { class: "text-gray-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">ID</p> <p class="text-base font-semibold mt-1 truncate"${attr("title", network.Id)}>${escape_html(network.Id)}</p></div></div> <div class="flex items-start gap-3"><div class="bg-blue-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Network($$payload3, { class: "text-blue-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Name</p> <p class="text-base font-semibold mt-1 break-words">${escape_html(network.Name)}</p></div></div> <div class="flex items-start gap-3"><div class="bg-orange-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Hard_drive($$payload3, { class: "text-orange-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Driver</p> <p class="text-base font-semibold mt-1">${escape_html(network.Driver)}</p></div></div> <div class="flex items-start gap-3"><div class="bg-purple-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Globe($$payload3, { class: "text-purple-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Scope</p> <p class="text-base font-semibold mt-1 capitalize">${escape_html(network.Scope)}</p></div></div> <div class="flex items-start gap-3"><div class="bg-green-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Clock($$payload3, { class: "text-green-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Created</p> <p class="text-base font-semibold mt-1">${escape_html(createdDate)}</p></div></div> <div class="flex items-start gap-3"><div class="bg-yellow-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Layers($$payload3, { class: "text-yellow-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Attachable</p> <p class="text-base font-semibold mt-1">`;
            Status_badge($$payload3, {
              variant: network.Attachable ? "green" : "gray",
              text: network.Attachable ? "Yes" : "No"
            });
            $$payload3.out += `<!----></p></div></div> <div class="flex items-start gap-3"><div class="bg-red-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            Settings($$payload3, { class: "text-red-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">Internal</p> <p class="text-base font-semibold mt-1">`;
            Status_badge($$payload3, {
              variant: network.Internal ? "blue" : "gray",
              text: network.Internal ? "Yes" : "No"
            });
            $$payload3.out += `<!----></p></div></div> <div class="flex items-start gap-3"><div class="bg-indigo-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">`;
            List_tree($$payload3, { class: "text-indigo-500 size-5" });
            $$payload3.out += `<!----></div> <div class="min-w-0 flex-1"><p class="text-sm font-medium text-muted-foreground">IPv6 Enabled</p> <p class="text-base font-semibold mt-1">`;
            Status_badge($$payload3, {
              variant: network.EnableIPv6 ? "indigo" : "gray",
              text: network.EnableIPv6 ? "Yes" : "No"
            });
            $$payload3.out += `<!----></p></div></div></div>`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload.out += `<!----> `;
    if (network.IPAM?.Config && network.IPAM.Config.length > 0) {
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
                  Settings($$payload4, { class: "text-primary size-5" });
                  $$payload4.out += `<!----> IPAM Configuration`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!----> <!---->`;
              Card_description($$payload3, {
                children: ($$payload4) => {
                  $$payload4.out += `<!---->IP Address Management settings for this network`;
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
              const each_array = ensure_array_like(network.IPAM.Config);
              $$payload3.out += `<!--[-->`;
              for (let i = 0, $$length = each_array.length; i < $$length; i++) {
                let config = each_array[i];
                $$payload3.out += `<div class="p-4 rounded-lg bg-card/50 border mb-4 last:mb-0"><div class="space-y-2">`;
                if (config.Subnet) {
                  $$payload3.out += "<!--[-->";
                  $$payload3.out += `<div class="flex flex-col sm:flex-row sm:items-center"><span class="text-sm font-medium text-muted-foreground w-full sm:w-24">Subnet:</span> <code class="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs sm:text-sm mt-1 sm:mt-0">${escape_html(config.Subnet)}</code></div>`;
                } else {
                  $$payload3.out += "<!--[!-->";
                }
                $$payload3.out += `<!--]--> `;
                if (config.Gateway) {
                  $$payload3.out += "<!--[-->";
                  $$payload3.out += `<div class="flex flex-col sm:flex-row sm:items-center"><span class="text-sm font-medium text-muted-foreground w-full sm:w-24">Gateway:</span> <code class="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs sm:text-sm mt-1 sm:mt-0">${escape_html(config.Gateway)}</code></div>`;
                } else {
                  $$payload3.out += "<!--[!-->";
                }
                $$payload3.out += `<!--]--> `;
                if (config.IPRange) {
                  $$payload3.out += "<!--[-->";
                  $$payload3.out += `<div class="flex flex-col sm:flex-row sm:items-center"><span class="text-sm font-medium text-muted-foreground w-full sm:w-24">IP Range:</span> <code class="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs sm:text-sm mt-1 sm:mt-0">${escape_html(config.IPRange)}</code></div>`;
                } else {
                  $$payload3.out += "<!--[!-->";
                }
                $$payload3.out += `<!--]--> `;
                if (config.AuxiliaryAddresses && Object.keys(config.AuxiliaryAddresses).length > 0) {
                  $$payload3.out += "<!--[-->";
                  const each_array_1 = ensure_array_like(Object.entries(config.AuxiliaryAddresses));
                  $$payload3.out += `<div class="mt-3"><p class="text-sm font-medium text-muted-foreground mb-1">Auxiliary Addresses:</p> <ul class="space-y-1 ml-4"><!--[-->`;
                  for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
                    let [name, addr] = each_array_1[$$index];
                    $$payload3.out += `<li class="text-xs font-mono flex"><span class="text-muted-foreground mr-2">${escape_html(name)}:</span> <code class="px-1 py-0.5 rounded bg-muted text-muted-foreground">${escape_html(addr)}</code></li>`;
                  }
                  $$payload3.out += `<!--]--></ul></div>`;
                } else {
                  $$payload3.out += "<!--[!-->";
                }
                $$payload3.out += `<!--]--></div></div>`;
              }
              $$payload3.out += `<!--]--> `;
              if (network.IPAM.Driver) {
                $$payload3.out += "<!--[-->";
                $$payload3.out += `<div class="flex items-center mt-4"><span class="text-sm font-medium text-muted-foreground mr-2">IPAM Driver:</span> `;
                Status_badge($$payload3, { variant: "cyan", text: network.IPAM.Driver });
                $$payload3.out += `<!----></div>`;
              } else {
                $$payload3.out += "<!--[!-->";
              }
              $$payload3.out += `<!--]--> `;
              if (network.IPAM.Options && Object.keys(network.IPAM.Options).length > 0) {
                $$payload3.out += "<!--[-->";
                const each_array_2 = ensure_array_like(Object.entries(network.IPAM.Options));
                $$payload3.out += `<div class="mt-4"><p class="text-sm font-medium text-muted-foreground mb-2">IPAM Options:</p> <div class="bg-muted/50 p-3 rounded-lg border"><!--[-->`;
                for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                  let [key, value] = each_array_2[$$index_2];
                  $$payload3.out += `<div class="flex justify-between text-xs font-mono mb-1 last:mb-0"><span class="text-muted-foreground">${escape_html(key)}:</span> <span>${escape_html(value)}</span></div>`;
                }
                $$payload3.out += `<!--]--></div></div>`;
              } else {
                $$payload3.out += "<!--[!-->";
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
    if (connectedContainers.length > 0) {
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
                  Container($$payload4, { class: "text-primary size-5" });
                  $$payload4.out += `<!----> Connected Containers`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!----> <!---->`;
              Card_description($$payload3, {
                children: ($$payload4) => {
                  $$payload4.out += `<!---->${escape_html(connectedContainers.length)} container${escape_html(connectedContainers.length === 1 ? "" : "s")} connected to this network`;
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
              const each_array_3 = ensure_array_like(connectedContainers);
              $$payload3.out += `<div class="bg-card rounded-lg border divide-y"><!--[-->`;
              for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
                let container = each_array_3[$$index_3];
                $$payload3.out += `<div class="p-3 flex flex-col sm:flex-row sm:items-center"><div class="font-medium w-full sm:w-1/3 break-all mb-2 sm:mb-0"><a${attr("href", `/containers/${stringify(container.Name)}`)} class="hover:underline text-primary flex items-center">`;
                Container($$payload3, { class: "size-3.5 mr-1.5 text-muted-foreground" });
                $$payload3.out += `<!----> ${escape_html(container.Name)}</a></div> <div class="w-full sm:w-2/3 pl-0 sm:pl-4"><code class="px-1.5 py-0.5 text-xs sm:text-sm rounded bg-muted text-muted-foreground font-mono break-all">${escape_html(container.IPv4Address || container.IPv6Address || "N/A")}</code></div></div>`;
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
    if (network.Labels && Object.keys(network.Labels).length > 0) {
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
                  $$payload4.out += `<!---->User-defined metadata attached to this network`;
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
              const each_array_4 = ensure_array_like(Object.entries(network.Labels));
              $$payload3.out += `<div class="bg-card rounded-lg border divide-y"><!--[-->`;
              for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
                let [key, value] = each_array_4[$$index_4];
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
    if (network.Options && Object.keys(network.Options).length > 0) {
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
                  Settings($$payload4, { class: "text-primary size-5" });
                  $$payload4.out += `<!----> Options`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!----> <!---->`;
              Card_description($$payload3, {
                children: ($$payload4) => {
                  $$payload4.out += `<!---->Network driver-specific options`;
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
              const each_array_5 = ensure_array_like(Object.entries(network.Options));
              $$payload3.out += `<div class="bg-card rounded-lg border divide-y"><!--[-->`;
              for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
                let [key, value] = each_array_5[$$index_5];
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
    $$payload.out += `<!--]--></div>`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<div class="flex flex-col items-center justify-center py-16 px-4 text-center"><div class="bg-muted/30 rounded-full p-4 mb-4">`;
    Network($$payload, {
      class: "text-muted-foreground size-10 opacity-70"
    });
    $$payload.out += `<!----></div> <h2 class="text-xl font-medium mb-2">Network Not Found</h2> <p class="text-muted-foreground mb-6">The requested network could not be found or is no longer available.</p> `;
    Arcane_button($$payload, {
      action: "cancel",
      customLabel: "Back to Networks",
      onClick: () => goto(),
      size: "sm"
    });
    $$payload.out += `<!----></div>`;
  }
  $$payload.out += `<!--]--></div>`;
  pop();
}
export {
  _page as default
};
