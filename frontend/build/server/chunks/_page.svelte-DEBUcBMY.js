import { p as push, c as copy_payload, d as assign_payload, a as pop, f as attr, t as escape_html, b as spread_props, o as attr_class, l as clsx, e as bind_props, g as stringify } from './index3-DI1Ivwzg.js';
import { C as Card } from './card-BHGzpLb_.js';
import { C as Card_content, a as Card_header, b as Card_title } from './card-title-Cbe9TU5i.js';
import { C as Card_description } from './card-description-D9_vEbkT.js';
import { B as Button } from './button-CUTwDrbo.js';
import { U as Universal_table, T as Table_cell } from './universal-table-CB6RbjtA.js';
import { A as Alert } from './alert-BRXlGSSu.js';
import { A as Alert_title, a as Alert_description } from './alert-title-Ce5Et4hB.js';
import { p as parseStatusTime, s as shortId, c as capitalizeFirstLetter, t as truncateString } from './string.utils-DW_mmI0J.js';
import { f as formatBytes } from './bytes.util-aLEoH8w0.js';
import { S as Status_badge } from './status-badge-55QtloxC.js';
import { i as invalidateAll } from './client-Cc1XkR80.js';
import { a as toast } from './Toaster.svelte_svelte_type_style_lang-B5vkOu6x.js';
import { R as Root, D as Dialog_content, a as Dialog_header, g as Dialog_title, b as Dialog_footer } from './index7-tn3QlYte.js';
import { C as Checkbox } from './checkbox-CMEX2hM2.js';
import { L as Label } from './label-DF0BU6VF.js';
import { D as Dialog_description } from './dialog-description-R10GNeQ8.js';
import { C as Circle_alert } from './circle-alert-Cc7lYjCi.js';
import { L as Loader_circle } from './loader-circle-BJifzSLw.js';
import { T as Trash_2 } from './trash-2-BUIKTnnR.js';
import { s as statusVariantMap } from './statuses-C3eNtnq-.js';
import { h as handleApiResultWithCallbacks } from './api.util-Ci3Q0GvL.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import { C as ContainerAPIService } from './container-api-service-QBCr0kFP.js';
import { B as BaseAPIService } from './api-service-DMPLrOP8.js';
import { M as Maturity_item } from './maturity-item-DPTjIEFe.js';
import { I as ImageAPIService } from './image-api-service-hks713bt.js';
import { D as Dropdown_card } from './dropdown-card-CzBtl4nH.js';
import { M as Meter_1 } from './meter-vneUM3Lo.js';
import { R as Refresh_cw } from './refresh-cw-CRz8nTZu.js';
import { M as Monitor } from './monitor-9YUqwWNy.js';
import { B as Box } from './box-B5ejinxB.js';
import { H as Hard_drive } from './hard-drive-DYOg6VMo.js';
import { C as Cpu } from './cpu-DMeHAz0f.js';
import { I as Icon } from './Icon-DbVCNmsR.js';
import { C as Circle_stop } from './circle-stop-CL2cQsOt.js';
import { A as Arrow_right } from './arrow-right-BM_fAFQE.js';
import { S as Settings } from './settings-dVRciV0i.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import '@tanstack/table-core';
import './create-id-DRrkdd12.js';
import './index-server-_G0R5Qhl.js';
import './noop-BrWcRgZY.js';
import './get-directional-keys-4fLrGlIs.js';
import './use-id-BSIc2y_F.js';
import './chevron-right-EG31JOyw.js';
import './index11-Bwdsa0vi.js';
import './check-CkcwyHfy.js';
import './chevron-down-DOg7W4Qb.js';
import './scroll-lock-C_EWKkAl.js';
import './events-CVA3EDdV.js';
import './popper-layer-force-mount-A94KrKTq.js';
import './hidden-input-BsZkZal-.js';
import './input-Bs5Bjqyo.js';
import './exports-Cv9LZeD1.js';
import './index2-Da1jJcEh.js';
import './x-BTRU5OLu.js';
import './errors.util-g315AnHn.js';
import 'axios';
import './index9-JqctHbMH.js';
import './use-grace-area.svelte-DYFPGt31.js';
import './circle-check-CTBnpdJg.js';
import './triangle-alert-DaMn4J5b.js';
import './clock-BAJle9Um.js';

function Circle_play($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "circle",
      { "cx": "12", "cy": "12", "r": "10" }
    ],
    [
      "polygon",
      { "points": "10 8 16 12 10 16 10 8" }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "circle-play" },
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
function Prune_confirmation_dialog($$payload, $$props) {
  push();
  let {
    open = void 0,
    isPruning = false,
    imagePruneMode = "dangling",
    onConfirm = () => {
    },
    onCancel = () => {
    }
  } = $$props;
  let pruneContainers = true;
  let pruneImages = true;
  let pruneNetworks = true;
  let pruneVolumes = false;
  const selectedTypes = (() => {
    const types = [];
    if (pruneContainers) types.push("containers");
    if (pruneImages) types.push("images");
    if (pruneNetworks) types.push("networks");
    if (pruneVolumes) types.push("volumes");
    return types;
  })();
  function handleConfirm() {
    if (selectedTypes.length > 0 && !isPruning) {
      onConfirm(selectedTypes);
    }
  }
  function handleCancel() {
    if (!isPruning) {
      onCancel();
    }
  }
  function handleKeydown(event) {
    if (event.key === "Escape" && !isPruning) {
      handleCancel();
    }
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Root($$payload2, {
      onOpenChange: (isOpen) => !isOpen && handleCancel(),
      get open() {
        return open;
      },
      set open($$value) {
        open = $$value;
        $$settled = false;
      },
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Dialog_content($$payload3, {
          class: "sm:max-w-[450px]",
          onkeydown: handleKeydown,
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Confirm System Prune`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Select the resources you want to prune. This action permanently removes unused data and cannot be undone.`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <div class="grid gap-4 py-4"><div class="flex items-center space-x-3"><!---->`;
            Checkbox($$payload4, {
              id: "prune-containers",
              disabled: isPruning,
              get checked() {
                return pruneContainers;
              },
              set checked($$value) {
                pruneContainers = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----> `;
            Label($$payload4, {
              for: "prune-containers",
              class: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Stopped Containers`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div> <div class="flex items-center space-x-3"><!---->`;
            Checkbox($$payload4, {
              id: "prune-images",
              disabled: isPruning,
              get checked() {
                return pruneImages;
              },
              set checked($$value) {
                pruneImages = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----> `;
            Label($$payload4, {
              for: "prune-images",
              class: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Unused Images (${escape_html(imagePruneMode === "dangling" ? "Dangling Only" : "All Unused")})`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div> <div class="flex items-center space-x-3"><!---->`;
            Checkbox($$payload4, {
              id: "prune-networks",
              disabled: isPruning,
              get checked() {
                return pruneNetworks;
              },
              set checked($$value) {
                pruneNetworks = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----> `;
            Label($$payload4, {
              for: "prune-networks",
              class: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Unused Networks`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div> <div class="flex items-start space-x-3"><!---->`;
            Checkbox($$payload4, {
              id: "prune-volumes",
              disabled: isPruning,
              class: "mt-1",
              get checked() {
                return pruneVolumes;
              },
              set checked($$value) {
                pruneVolumes = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----> <div class="grid gap-1.5 leading-none">`;
            Label($$payload4, {
              for: "prune-volumes",
              class: "text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Unused Volumes <span class="text-destructive">(Potentially Destructive!)</span>`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <p class="text-xs text-muted-foreground">Only enable this if you are certain no important data resides in unused volumes.</p></div></div> `;
            if (pruneVolumes) {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<!---->`;
              Alert($$payload4, {
                variant: "destructive",
                class: "mt-2",
                children: ($$payload5) => {
                  Circle_alert($$payload5, { class: "size-4" });
                  $$payload5.out += `<!----> <!---->`;
                  Alert_title($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->Warning: Pruning Volumes`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Alert_description($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->Pruning volumes permanently deletes data. Ensure you have backups if necessary.`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!---->`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]--></div> <!---->`;
            Dialog_footer($$payload4, {
              children: ($$payload5) => {
                Button($$payload5, {
                  class: "arcane-button-cancel",
                  variant: "outline",
                  onclick: handleCancel,
                  disabled: isPruning,
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Cancel`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> `;
                Button($$payload5, {
                  class: "arcane-button-remove",
                  variant: "destructive",
                  onclick: handleConfirm,
                  disabled: selectedTypes.length === 0 || isPruning,
                  children: ($$payload6) => {
                    if (isPruning) {
                      $$payload6.out += "<!--[-->";
                      Loader_circle($$payload6, { class: "mr-2 animate-spin size-4" });
                      $$payload6.out += `<!----> Pruning...`;
                    } else {
                      $$payload6.out += "<!--[!-->";
                      Trash_2($$payload6, { class: "mr-2 size-4" });
                      $$payload6.out += `<!----> Prune Selected (${escape_html(selectedTypes.length)})`;
                    }
                    $$payload6.out += `<!--]-->`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
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
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { open });
  pop();
}
class SystemAPIService extends BaseAPIService {
  async prune(types) {
    if (!types || types.length === 0) {
      throw new Error("No prune types specified");
    }
    const typesParam = types.join(",");
    const res = await this.api.post(`/system/prune?types=${typesParam}`);
    return res.data;
  }
}
function Docker_icon($$payload, $$props) {
  let { class: className } = $$props;
  $$payload.out += `<svg fill="currentColor" width="24" height="24" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg"${attr_class(clsx(className))}><title>Docker icon</title><path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z"></path></svg>`;
}
function Github_icon($$payload, $$props) {
  let { class: className } = $$props;
  $$payload.out += `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"${attr_class(clsx(className))}><title>GitHub</title><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" fill="currentColor"></path></svg>`;
}
function _page($$payload, $$props) {
  push();
  let { data } = $$props;
  new ContainerAPIService();
  const systemApi = new SystemAPIService();
  new ImageAPIService();
  let dashboardStates = {
    dockerInfo: data.dockerInfo,
    containers: data.containers,
    images: data.images,
    settings: data.settings,
    error: data.error,
    isPruneDialogOpen: false
  };
  let isLoading = {
    starting: false,
    stopping: false,
    refreshing: false,
    pruning: false
  };
  const runningContainers = dashboardStates.containers?.filter((c) => c.State === "running").length ?? 0;
  const stoppedContainers = dashboardStates.containers?.filter((c) => c.State === "exited").length ?? 0;
  const totalImageSize = dashboardStates.images?.reduce((sum, image) => sum + (image.Size || 0), 0) ?? 0;
  const containerUsagePercent = dashboardStates.containers?.length ? runningContainers / dashboardStates.containers.length * 100 : 0;
  function getContainerDisplayName(container) {
    if (container.Names && container.Names.length > 0) {
      return container.Names[0].startsWith("/") ? container.Names[0].substring(1) : container.Names[0];
    }
    return shortId(container.Id);
  }
  let serverStats = null;
  async function fetchServerStats() {
    try {
      const response = await fetch("/api/system/stats");
      if (response.ok) {
        serverStats = await response.json();
      }
    } catch (error) {
      console.error("Failed to fetch server stats:", error);
    }
  }
  async function refreshData() {
    if (isLoading.refreshing) return;
    isLoading.refreshing = true;
    try {
      await invalidateAll();
      await fetchServerStats();
    } catch (err) {
      console.error("Error during dashboard refresh:", err);
      dashboardStates.error = "Failed to refresh dashboard data.";
    } finally {
      isLoading.refreshing = false;
    }
  }
  async function confirmPrune(selectedTypes) {
    if (isLoading.pruning || selectedTypes.length === 0) return;
    isLoading.pruning = true;
    handleApiResultWithCallbacks({
      result: await tryCatch(systemApi.prune(selectedTypes)),
      message: `Failed to Prune ${selectedTypes.join(", ")}`,
      setLoadingState: (value) => isLoading.pruning = value,
      onSuccess: async () => {
        dashboardStates.isPruneDialogOpen = false;
        const formattedTypes = selectedTypes.map((type) => capitalizeFirstLetter(type)).join(", ");
        toast.success(`${formattedTypes} ${selectedTypes.length > 1 ? "were" : "was"} pruned successfully.`);
        await invalidateAll();
      }
    });
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div class="space-y-8"><div class="flex justify-between items-center"><div><h1 class="text-3xl font-bold tracking-tight">Dashboard</h1> <p class="text-sm text-muted-foreground mt-1">Overview of your Container Environment</p></div> `;
    Button($$payload2, {
      variant: "outline",
      size: "sm",
      class: "h-9 arcane-button-restart",
      onclick: refreshData,
      disabled: isLoading.refreshing || isLoading.starting || isLoading.stopping || isLoading.pruning,
      children: ($$payload3) => {
        if (isLoading.refreshing) {
          $$payload3.out += "<!--[-->";
          Loader_circle($$payload3, { class: "mr-2 animate-spin size-4" });
        } else {
          $$payload3.out += "<!--[!-->";
          Refresh_cw($$payload3, { class: "mr-2 size-4" });
        }
        $$payload3.out += `<!--]--> Refresh`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div> `;
    if (dashboardStates.error) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<!---->`;
      Alert($$payload2, {
        variant: "destructive",
        children: ($$payload3) => {
          Circle_alert($$payload3, { class: "mr-2 size-4" });
          $$payload3.out += `<!----> <!---->`;
          Alert_title($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->Connection Error`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Alert_description($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->${escape_html(dashboardStates.error)} Please check your Docker connection in <a href="/settings" class="underline">Settings</a>.`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> <section>`;
    Dropdown_card($$payload2, {
      id: "system-overview",
      title: "System Overview",
      description: "Hardware and Docker engine information",
      icon: Monitor,
      defaultExpanded: true,
      children: ($$payload3) => {
        $$payload3.out += `<div class="grid grid-cols-1 md:grid-cols-3 gap-6"><!---->`;
        Card($$payload3, {
          class: "overflow-hidden",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Card_content($$payload4, {
              class: "p-6",
              children: ($$payload5) => {
                $$payload5.out += `<div class="flex items-center justify-between mb-4"><div class="flex items-center gap-3"><div class="bg-green-500/10 p-2.5 rounded-lg">`;
                Box($$payload5, { class: "text-green-500 size-5" });
                $$payload5.out += `<!----></div> <div><p class="text-sm font-medium text-muted-foreground">Containers</p> <p class="text-2xl font-bold">${escape_html(runningContainers)} <span class="text-sm font-normal text-muted-foreground">/ ${escape_html(dashboardStates.containers?.length || 0)}</span></p></div></div></div> `;
                if (dashboardStates.containers?.length) {
                  $$payload5.out += "<!--[-->";
                  $$payload5.out += `<div class="mb-6">`;
                  Meter_1($$payload5, {
                    label: "Active Containers",
                    valueLabel: `${stringify(runningContainers)} running`,
                    value: containerUsagePercent,
                    max: 100,
                    variant: containerUsagePercent > 80 ? "warning" : "default",
                    size: "sm"
                  });
                  $$payload5.out += `<!----></div>`;
                } else {
                  $$payload5.out += "<!--[!-->";
                }
                $$payload5.out += `<!--]--> <div class="pt-4 border-t space-y-3"><div class="flex items-center gap-2">`;
                Docker_icon($$payload5, { class: "text-muted-foreground size-4" });
                $$payload5.out += `<!----> <p class="text-sm font-medium text-muted-foreground">Docker Engine</p></div> <div class="grid grid-cols-2 gap-3 text-xs"><div><p class="text-muted-foreground">Version</p> <p class="font-medium">${escape_html(dashboardStates.dockerInfo?.ServerVersion || "Unknown")}</p></div> <div><p class="text-muted-foreground">OS</p> <p class="font-medium">${escape_html(dashboardStates.dockerInfo?.OperatingSystem?.split(" ")[0] || "Unknown")}</p></div></div></div>`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card($$payload3, {
          class: "overflow-hidden",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Card_content($$payload4, {
              class: "p-6",
              children: ($$payload5) => {
                $$payload5.out += `<div class="flex items-center justify-between mb-4"><div class="flex items-center gap-3"><div class="bg-blue-500/10 p-2.5 rounded-lg">`;
                Hard_drive($$payload5, { class: "text-blue-500 size-5" });
                $$payload5.out += `<!----></div> <div><p class="text-sm font-medium text-muted-foreground">Storage</p> <p class="text-2xl font-bold">${escape_html(dashboardStates.dockerInfo?.Images || 0)}</p> <p class="text-xs text-muted-foreground">Docker images</p></div></div></div> `;
                if (serverStats?.diskTotal && serverStats?.diskUsage !== void 0) {
                  $$payload5.out += "<!--[-->";
                  const storagePercent = Math.min(Math.max(serverStats.diskUsage / serverStats.diskTotal * 100, 0), 100);
                  $$payload5.out += `<div class="mb-4">`;
                  Meter_1($$payload5, {
                    label: "System Storage",
                    valueLabel: `${stringify(storagePercent.toFixed(1))}%`,
                    value: storagePercent,
                    max: 100,
                    variant: storagePercent > 85 ? "destructive" : storagePercent > 70 ? "warning" : "success",
                    size: "sm"
                  });
                  $$payload5.out += `<!----></div> <div class="space-y-1 text-xs text-muted-foreground"><div class="flex justify-between"><span>Used:</span> <span class="font-medium">${escape_html(formatBytes(serverStats.diskUsage))}</span></div> <div class="flex justify-between"><span>Total:</span> <span class="font-medium">${escape_html(formatBytes(serverStats.diskTotal))}</span></div> `;
                  if (totalImageSize > 0) {
                    $$payload5.out += "<!--[-->";
                    $$payload5.out += `<div class="flex justify-between pt-1 border-t border-border/50"><span>Docker Images:</span> <span class="font-medium">${escape_html(formatBytes(totalImageSize))}</span></div>`;
                  } else {
                    $$payload5.out += "<!--[!-->";
                  }
                  $$payload5.out += `<!--]--></div>`;
                } else if (totalImageSize > 0) {
                  $$payload5.out += "<!--[1-->";
                  $$payload5.out += `<div class="mb-4"><div class="text-center py-4"><p class="text-sm text-muted-foreground">System storage data unavailable</p></div></div> <div class="text-xs text-muted-foreground"><div class="flex justify-between"><span>Docker Images:</span> <span class="font-medium">${escape_html(formatBytes(totalImageSize))}</span></div></div>`;
                } else if (dashboardStates.dockerInfo?.Images === 0) {
                  $$payload5.out += "<!--[2-->";
                  $$payload5.out += `<div class="text-center py-6"><p class="text-sm text-muted-foreground">No images stored</p></div>`;
                } else {
                  $$payload5.out += "<!--[!-->";
                  $$payload5.out += `<div class="text-center py-6"><p class="text-sm text-muted-foreground">Loading storage data...</p></div>`;
                }
                $$payload5.out += `<!--]-->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card($$payload3, {
          class: "overflow-hidden",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Card_content($$payload4, {
              class: "p-6",
              children: ($$payload5) => {
                $$payload5.out += `<div class="flex items-center justify-between mb-4"><div class="flex items-center gap-3"><div class="bg-purple-500/10 p-2.5 rounded-lg">`;
                Cpu($$payload5, { class: "text-purple-500 size-5" });
                $$payload5.out += `<!----></div> <div><p class="text-sm font-medium text-muted-foreground">Hardware</p> <div class="flex items-center gap-4 text-xs text-muted-foreground mt-1"><span>${escape_html(dashboardStates.dockerInfo?.NCPU || "N/A")} cores</span> <span>${escape_html(dashboardStates.dockerInfo?.MemTotal ? formatBytes(dashboardStates.dockerInfo.MemTotal, 0) : "N/A")}</span></div></div></div></div> `;
                if (serverStats) {
                  $$payload5.out += "<!--[-->";
                  const cpuPercent = Math.min(Math.max(serverStats.cpuUsage, 0), 100);
                  const memoryPercent = Math.min(Math.max(serverStats.memoryUsage / serverStats.memoryTotal * 100, 0), 100);
                  $$payload5.out += `<div class="space-y-4">`;
                  Meter_1($$payload5, {
                    label: "CPU Usage",
                    valueLabel: `${stringify(cpuPercent.toFixed(1))}%`,
                    value: cpuPercent,
                    max: 100,
                    variant: cpuPercent > 80 ? "destructive" : cpuPercent > 60 ? "warning" : "success",
                    size: "sm"
                  });
                  $$payload5.out += `<!----> `;
                  Meter_1($$payload5, {
                    label: "Memory Usage",
                    valueLabel: `${stringify(memoryPercent.toFixed(1))}%`,
                    value: memoryPercent,
                    max: 100,
                    variant: memoryPercent > 80 ? "destructive" : memoryPercent > 60 ? "warning" : "success",
                    size: "sm"
                  });
                  $$payload5.out += `<!----></div> <p class="text-xs text-muted-foreground mt-3">${escape_html(dashboardStates.dockerInfo?.Architecture || "Unknown arch")}</p>`;
                } else {
                  $$payload5.out += "<!--[!-->";
                  $$payload5.out += `<div class="text-center py-6"><p class="text-sm text-muted-foreground">Loading stats...</p></div>`;
                }
                $$payload5.out += `<!--]-->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----></div>`;
      }
    });
    $$payload2.out += `<!----></section> <section><h2 class="text-lg font-semibold tracking-tight mb-4">Quick Actions</h2> <div class="grid grid-cols-1 sm:grid-cols-3 gap-5"><button class="group relative flex flex-col items-center p-6 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm"${attr("disabled", !dashboardStates.dockerInfo || stoppedContainers === 0 || isLoading.starting || isLoading.stopping || isLoading.pruning, true)}><div class="size-12 rounded-full flex items-center justify-center mb-4 bg-green-500/10 group-hover:bg-green-500/20 transition-colors">`;
    {
      $$payload2.out += "<!--[!-->";
      Circle_play($$payload2, { class: "text-green-500 size-6" });
    }
    $$payload2.out += `<!--]--></div> <span class="text-base font-medium text-center">Start All Stopped</span> <span class="text-sm text-muted-foreground mt-1">${escape_html(stoppedContainers)} containers</span></button> <button class="group relative flex flex-col items-center p-6 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm"${attr("disabled", !dashboardStates.dockerInfo || runningContainers === 0 || isLoading.starting || isLoading.stopping || isLoading.pruning, true)}><div class="size-12 rounded-full flex items-center justify-center mb-4 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">`;
    {
      $$payload2.out += "<!--[!-->";
      Circle_stop($$payload2, { class: "text-blue-500 size-6" });
    }
    $$payload2.out += `<!--]--></div> <span class="text-base font-medium text-center">Stop All Running</span> <span class="text-sm text-muted-foreground mt-1">${escape_html(runningContainers)}</span></button> <button class="group relative flex flex-col items-center p-6 rounded-xl border bg-card shadow-sm hover:shadow-md hover:border-destructive/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm disabled:hover:border-border"${attr("disabled", !dashboardStates.dockerInfo || isLoading.starting || isLoading.stopping || isLoading.pruning, true)}><div class="size-12 rounded-full flex items-center justify-center mb-4 bg-red-500/10 group-hover:bg-red-500/20 transition-colors">`;
    if (isLoading.pruning) {
      $$payload2.out += "<!--[-->";
      Loader_circle($$payload2, { class: "text-red-500 animate-spin size-6" });
    } else {
      $$payload2.out += "<!--[!-->";
      Trash_2($$payload2, { class: "text-red-500 size-6" });
    }
    $$payload2.out += `<!--]--></div> <span class="text-base font-medium text-center">Prune System</span> <span class="text-sm text-muted-foreground mt-1">Clean unused resources</span></button></div></section> <section><h2 class="text-lg font-semibold tracking-tight mb-4">Resources</h2> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><!---->`;
    Card($$payload2, {
      class: "border shadow-sm relative flex flex-col",
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_header($$payload3, {
          class: "px-6",
          children: ($$payload4) => {
            $$payload4.out += `<div class="flex items-center justify-between"><div><!---->`;
            Card_title($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<a class="font-medium hover:underline" href="/containers">Containers</a>`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Card_description($$payload4, {
              class: "pb-3",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Recent containers`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div> `;
            Button($$payload4, {
              variant: "ghost",
              size: "sm",
              href: "/containers",
              disabled: !dashboardStates.dockerInfo,
              children: ($$payload5) => {
                $$payload5.out += `<!---->View All `;
                Arrow_right($$payload5, { class: "ml-2 size-4" });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card_content($$payload3, {
          class: "p-0 flex-1",
          children: ($$payload4) => {
            if (dashboardStates.containers?.length > 0) {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<div class="flex flex-col h-full"><div class="flex-1">`;
              {
                let rows = function($$payload5, { item }) {
                  const stateVariant = statusVariantMap[item.State.toLowerCase()];
                  $$payload5.out += `<!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<a class="font-medium hover:underline"${attr("href", `/containers/${stringify(item.Id)}/`)}>${escape_html(item.displayName)}</a>`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    title: item.Image,
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(truncateString(item.Image, 40))}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      Status_badge($$payload6, {
                        variant: stateVariant,
                        text: capitalizeFirstLetter(item.State)
                      });
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(item.Status)}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!---->`;
                };
                Universal_table($$payload4, {
                  data: dashboardStates.containers.slice(0, 5).map((c) => ({
                    ...c,
                    displayName: getContainerDisplayName(c),
                    statusSortValue: parseStatusTime(c.Status)
                  })),
                  columns: [
                    { accessorKey: "displayName", header: "Name" },
                    { accessorKey: "Image", header: "Image" },
                    { accessorKey: "State", header: "State" },
                    {
                      accessorKey: "statusSortValue",
                      header: "Status"
                    }
                  ],
                  features: { filtering: false, selection: false },
                  sort: {
                    defaultSort: { id: "statusSortValue", desc: false }
                  },
                  pagination: { pageSize: 5, pageSizeOptions: [5] },
                  display: { isDashboardTable: true },
                  rows,
                  $$slots: { rows: true }
                });
              }
              $$payload4.out += `<!----></div> `;
              if (dashboardStates.containers.length > 5) {
                $$payload4.out += "<!--[-->";
                $$payload4.out += `<div class="bg-muted/40 py-2 px-6 text-xs text-muted-foreground border-t">Showing 5 of ${escape_html(dashboardStates.containers.length)} containers</div>`;
              } else {
                $$payload4.out += "<!--[!-->";
              }
              $$payload4.out += `<!--]--></div>`;
            } else if (!dashboardStates.error) {
              $$payload4.out += "<!--[1-->";
              $$payload4.out += `<div class="flex flex-col items-center justify-center py-10 px-6 text-center">`;
              Box($$payload4, {
                class: "text-muted-foreground mb-2 opacity-40 size-8"
              });
              $$payload4.out += `<!----> <p class="text-sm text-muted-foreground">No containers found</p> <p class="text-xs text-muted-foreground mt-1">Use Docker CLI or another tool to create containers</p></div>`;
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]-->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <!---->`;
    Card($$payload2, {
      class: "border shadow-sm relative flex flex-col",
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_header($$payload3, {
          class: "px-6",
          children: ($$payload4) => {
            $$payload4.out += `<div class="flex items-center justify-between"><div><!---->`;
            Card_title($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<a class="font-medium hover:underline" href="/images">Images</a>`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Card_description($$payload4, {
              class: "pb-3",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Top 5 Largest Images`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div> `;
            Button($$payload4, {
              variant: "ghost",
              size: "sm",
              href: "/images",
              disabled: !dashboardStates.dockerInfo,
              children: ($$payload5) => {
                $$payload5.out += `<!---->View All `;
                Arrow_right($$payload5, { class: "ml-2 size-4" });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card_content($$payload3, {
          class: "p-0 flex-1",
          children: ($$payload4) => {
            if (dashboardStates.images?.length > 0) {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<div class="flex flex-col h-full"><div class="flex-1">`;
              {
                let rows = function($$payload5, { item }) {
                  $$payload5.out += `<!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<div class="flex items-center gap-2"><div class="flex items-center flex-1">`;
                      Maturity_item($$payload6, {
                        maturity: item.maturity,
                        isLoadingInBackground: !item.maturity
                      });
                      $$payload6.out += `<!----> <a class="font-medium hover:underline shrink truncate"${attr("href", `/images/${stringify(item.Id)}/`)}>${escape_html(item.repo)}</a></div></div>`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      if (!item.inUse) {
                        $$payload6.out += "<!--[-->";
                        Status_badge($$payload6, { text: "Unused", variant: "amber" });
                      } else {
                        $$payload6.out += "<!--[!-->";
                        Status_badge($$payload6, { text: "In Use", variant: "green" });
                      }
                      $$payload6.out += `<!--]-->`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(item.tag)}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(formatBytes(item.Size))}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!---->`;
                };
                Universal_table($$payload4, {
                  data: dashboardStates.images.slice().sort((a, b) => (b.Size || 0) - (a.Size || 0)).slice(0, 5),
                  columns: [
                    { accessorKey: "repo", header: "Name" },
                    {
                      accessorKey: "inUse",
                      header: " ",
                      enableSorting: false
                    },
                    { accessorKey: "tag", header: "Tag" },
                    { accessorKey: "Size", header: "Size" }
                  ],
                  features: { filtering: false, selection: false },
                  pagination: { pageSize: 5, pageSizeOptions: [5] },
                  display: { isDashboardTable: true },
                  sort: { defaultSort: { id: "Size", desc: true } },
                  rows,
                  $$slots: { rows: true }
                });
              }
              $$payload4.out += `<!----></div> `;
              if (dashboardStates.images.length > 5) {
                $$payload4.out += "<!--[-->";
                $$payload4.out += `<div class="bg-muted/40 py-2 px-6 text-xs text-muted-foreground border-t">Showing 5 of ${escape_html(dashboardStates.images.length)} images</div>`;
              } else {
                $$payload4.out += "<!--[!-->";
              }
              $$payload4.out += `<!--]--></div>`;
            } else if (!dashboardStates.error) {
              $$payload4.out += "<!--[1-->";
              $$payload4.out += `<div class="flex flex-col items-center justify-center py-10 px-6 text-center">`;
              Hard_drive($$payload4, {
                class: "text-muted-foreground mb-2 opacity-40 size-8"
              });
              $$payload4.out += `<!----> <p class="text-sm text-muted-foreground">No images found</p> <p class="text-xs text-muted-foreground mt-1">Pull images using Docker CLI or another tool</p></div>`;
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]-->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div></section> <section class="border-t pt-4 mt-10"><div class="flex justify-between items-center text-muted-foreground text-sm"><div class="flex items-center"><a href="/settings" class="hover:text-foreground transition-colors" title="Settings">`;
    Settings($$payload2, { class: "size-4" });
    $$payload2.out += `<!----> <span class="sr-only">Settings</span></a> <span class="mx-2">•</span> <a href="https://github.com/ofkm/arcane" target="_blank" rel="noopener noreferrer" class="hover:text-foreground transition-colors" title="GitHub">`;
    Github_icon($$payload2, { class: "fill-current size-4" });
    $$payload2.out += `<!----> <span class="sr-only">GitHub</span></a></div> <div></div></div></section> `;
    Prune_confirmation_dialog($$payload2, {
      isPruning: isLoading.pruning,
      imagePruneMode: dashboardStates.settings?.pruneMode || "dangling",
      onConfirm: confirmPrune,
      onCancel: () => dashboardStates.isPruneDialogOpen = false,
      get open() {
        return dashboardStates.isPruneDialogOpen;
      },
      set open($$value) {
        dashboardStates.isPruneDialogOpen = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----></div>`;
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
//# sourceMappingURL=_page.svelte-DEBUcBMY.js.map
