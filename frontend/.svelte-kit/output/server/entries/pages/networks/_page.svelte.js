import { p as push, u as copy_payload, v as assign_payload, t as bind_props, a as pop, l as ensure_array_like, k as escape_html, n as stringify, b as attr, j as spread_props } from "../../../chunks/index3.js";
import { C as Card } from "../../../chunks/card.js";
import { C as Card_content, a as Card_header, b as Card_title } from "../../../chunks/card-title.js";
import "clsx";
import { B as Button } from "../../../chunks/button.js";
import { U as Universal_table, T as Table_cell, E as Ellipsis } from "../../../chunks/universal-table.js";
import { A as Alert } from "../../../chunks/alert.js";
import { A as Alert_title, a as Alert_description } from "../../../chunks/alert-title.js";
import { g as goto, i as invalidateAll } from "../../../chunks/client.js";
import { a as toast } from "../../../chunks/Toaster.svelte_svelte_type_style_lang.js";
import { R as Root$2, T as Trigger, D as Dropdown_menu_content, G as Group } from "../../../chunks/index10.js";
import { R as Root, D as Dialog_content, a as Dialog_header, b as Dialog_title, c as Dialog_footer } from "../../../chunks/index7.js";
import { I as Input } from "../../../chunks/input.js";
import { L as Label } from "../../../chunks/label.js";
import { R as Root$1, S as Select_trigger, a as Select_content, b as Select_item } from "../../../chunks/index11.js";
import { C as Checkbox } from "../../../chunks/checkbox.js";
import { A as Arcane_button, S as Scan_search } from "../../../chunks/arcane-button.js";
import { D as Dialog_description } from "../../../chunks/dialog-description.js";
import { X } from "../../../chunks/x.js";
import { h as handleApiResultWithCallbacks } from "../../../chunks/api.util.js";
import { t as tryCatch } from "../../../chunks/try-catch.js";
import { o as openConfirmDialog } from "../../../chunks/index8.js";
import { N as NetworkAPIService } from "../../../chunks/network-api-service.js";
import { D as DEFAULT_NETWORK_NAMES } from "../../../chunks/constants.js";
import { t as tablePersistence } from "../../../chunks/table-store.js";
import { C as Circle_alert } from "../../../chunks/circle-alert.js";
import { N as Network } from "../../../chunks/network.js";
import { D as Dropdown_menu_item } from "../../../chunks/dropdown-menu-item.js";
import { D as Dropdown_menu_separator } from "../../../chunks/dropdown-menu-separator.js";
import { T as Trash_2 } from "../../../chunks/trash-2.js";
import { L as Loader_circle } from "../../../chunks/loader-circle.js";
function CreateNetworkDialog($$payload, $$props) {
  push();
  let { open = void 0, isCreating = false, onSubmit } = $$props;
  let name = "";
  let driver = "bridge";
  let checkDuplicate = true;
  let internal = false;
  let labels = [{ key: "", value: "" }];
  let enableIpam = false;
  let subnet = "";
  let gateway = "";
  function addLabel() {
    labels = [...labels, { key: "", value: "" }];
  }
  function removeLabel(index) {
    labels = labels.filter((_, i) => i !== index);
  }
  function handleSubmit() {
    const finalLabels = {};
    labels.forEach((label) => {
      if (label.key.trim()) {
        finalLabels[label.key.trim()] = label.value.trim();
      }
    });
    const options = {
      Name: name.trim(),
      Driver: driver,
      CheckDuplicate: checkDuplicate,
      Internal: internal,
      Labels: Object.keys(finalLabels).length > 0 ? finalLabels : void 0
    };
    if (enableIpam && (subnet.trim() || gateway.trim())) {
      const ipamConfig = {};
      const trimmedSubnet = subnet.trim();
      const trimmedGateway = gateway.trim();
      if (trimmedSubnet) {
        ipamConfig.Subnet = trimmedSubnet;
      }
      if (trimmedGateway) {
        ipamConfig.Gateway = trimmedGateway;
      }
      if (Object.keys(ipamConfig).length > 0) {
        options.IPAM = { Driver: "default", Config: [ipamConfig] };
      }
    }
    onSubmit(options);
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Root($$payload2, {
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
          class: "sm:max-w-[600px]",
          children: ($$payload4) => {
            const each_array = ensure_array_like(labels);
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  "data-testid": "create-network-dialog-header",
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Create Network`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Configure and create a new Docker network.`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <form class="grid gap-4 py-4"><div class="grid grid-cols-4 items-center gap-4">`;
            Label($$payload4, {
              for: "network-name",
              class: "text-right",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Name`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Input($$payload4, {
              id: "network-name",
              required: true,
              class: "col-span-3",
              placeholder: "e.g., my-app-network",
              disabled: isCreating,
              get value() {
                return name;
              },
              set value($$value) {
                name = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4">`;
            Label($$payload4, {
              for: "network-driver",
              class: "text-right",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Driver`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Root$1($$payload4, {
              type: "single",
              get value() {
                return driver;
              },
              set value($$value) {
                driver = $$value;
                $$settled = false;
              },
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Select_trigger($$payload5, {
                  class: "col-span-3",
                  id: "network-driver",
                  disabled: isCreating,
                  children: ($$payload6) => {
                    $$payload6.out += `<span>${escape_html(driver)}</span>`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Select_content($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->`;
                    Select_item($$payload6, {
                      value: "bridge",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->bridge`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Select_item($$payload6, {
                      value: "overlay",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->overlay`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Select_item($$payload6, {
                      value: "macvlan",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->macvlan`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Select_item($$payload6, {
                      value: "ipvlan",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->ipvlan`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Select_item($$payload6, {
                      value: "none",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->none`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!---->`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4"><span class="text-right text-sm font-medium">Options</span> <div class="col-span-3 flex items-center space-x-4"><div class="flex items-center space-x-2">`;
            Checkbox($$payload4, {
              id: "check-duplicate",
              disabled: isCreating,
              get checked() {
                return checkDuplicate;
              },
              set checked($$value) {
                checkDuplicate = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----> `;
            Label($$payload4, {
              for: "check-duplicate",
              class: "text-sm font-normal",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Check Duplicate`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div> <div class="flex items-center space-x-2">`;
            Checkbox($$payload4, {
              id: "internal",
              disabled: isCreating,
              get checked() {
                return internal;
              },
              set checked($$value) {
                internal = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----> `;
            Label($$payload4, {
              for: "internal",
              class: "text-sm font-normal",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Internal`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div></div></div> <div class="grid grid-cols-4 items-start gap-4">`;
            Label($$payload4, {
              class: "text-right pt-2",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Labels`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <div class="col-span-3 space-y-2"><!--[-->`;
            for (let index = 0, $$length = each_array.length; index < $$length; index++) {
              let label = each_array[index];
              $$payload4.out += `<div class="flex gap-2 items-center">`;
              Input($$payload4, {
                placeholder: "Key",
                class: "flex-1",
                disabled: isCreating,
                get value() {
                  return label.key;
                },
                set value($$value) {
                  label.key = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                placeholder: "Value",
                class: "flex-1",
                disabled: isCreating,
                get value() {
                  return label.value;
                },
                set value($$value) {
                  label.value = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----> `;
              Button($$payload4, {
                type: "button",
                variant: "ghost",
                size: "icon",
                onclick: () => removeLabel(index),
                disabled: isCreating || labels.length <= 1,
                class: "text-destructive hover:text-destructive",
                title: "Remove Label",
                children: ($$payload5) => {
                  X($$payload5, { class: "size-4" });
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----></div>`;
            }
            $$payload4.out += `<!--]--> `;
            Arcane_button($$payload4, {
              action: "create",
              customLabel: "Add Label",
              onClick: addLabel,
              disabled: isCreating,
              size: "sm"
            });
            $$payload4.out += `<!----></div></div> <div class="grid grid-cols-4 items-start gap-4 border-t pt-4 mt-2"><div class="flex items-center space-x-2 col-span-4">`;
            Checkbox($$payload4, {
              id: "enable-ipam",
              disabled: isCreating,
              get checked() {
                return enableIpam;
              },
              set checked($$value) {
                enableIpam = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----> `;
            Label($$payload4, {
              for: "enable-ipam",
              class: "text-sm font-medium",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Enable IPAM Configuration`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div> `;
            if (enableIpam) {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<div class="grid grid-cols-4 items-center gap-4 col-span-4">`;
              Label($$payload4, {
                for: "subnet",
                class: "text-right",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Subnet`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                id: "subnet",
                placeholder: "e.g., 172.20.0.0/16",
                class: "col-span-3",
                disabled: isCreating,
                get value() {
                  return subnet;
                },
                set value($$value) {
                  subnet = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4 col-span-4">`;
              Label($$payload4, {
                for: "gateway",
                class: "text-right",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Gateway`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                id: "gateway",
                placeholder: "e.g., 172.20.0.1",
                class: "col-span-3",
                disabled: isCreating,
                get value() {
                  return gateway;
                },
                set value($$value) {
                  gateway = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div>`;
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]--></div> <!---->`;
            Dialog_footer($$payload4, {
              children: ($$payload5) => {
                Arcane_button($$payload5, {
                  action: "cancel",
                  onClick: () => open = false,
                  disabled: isCreating
                });
                $$payload5.out += `<!----> `;
                Arcane_button($$payload5, {
                  action: "create",
                  customLabel: "Create Network",
                  onClick: handleSubmit,
                  loading: isCreating,
                  loadingLabel: "Creating...",
                  disabled: isCreating || !name.trim()
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></form>`;
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
function _page($$payload, $$props) {
  push();
  let { data } = $$props;
  let networkPageStates = {
    networks: data.networks,
    selectedNetworks: [],
    error: data.error,
    isCreateDialogOpen: false
  };
  let isLoading = { create: false, remove: false, refresh: false };
  const isAnyLoading = Object.values(isLoading).some((loading) => loading);
  const totalNetworks = networkPageStates.networks.length;
  const bridgeNetworks = networkPageStates.networks.filter((n) => n.Driver === "bridge").length;
  const overlayNetworks = networkPageStates.networks.filter((n) => n.Driver === "overlay").length;
  const networkApi = new NetworkAPIService();
  async function handleCreateNetworkSubmit(options) {
    handleApiResultWithCallbacks({
      result: await tryCatch(networkApi.create(options)),
      message: `Failed to Create Network "${options.Name}"`,
      setLoadingState: (value) => isLoading.create = value,
      onSuccess: async () => {
        toast.success(`Network "${options.Name}" Created Successfully.`);
        await invalidateAll();
        networkPageStates.isCreateDialogOpen = false;
      }
    });
  }
  async function handleDeleteNetwork(id, name) {
    if (DEFAULT_NETWORK_NAMES.has(name)) {
      toast.error(`Cannot delete default network: ${name}`);
      return;
    }
    openConfirmDialog({
      title: "Delete Network",
      message: `Are you sure you want to delete network "${name}" (ID: ${id.substring(0, 12)})? This action cannot be undone.`,
      confirm: {
        label: "Delete",
        destructive: true,
        action: async () => {
          handleApiResultWithCallbacks({
            result: await tryCatch(networkApi.remove(encodeURIComponent(id))),
            message: `Failed to Remove Network "${name}"`,
            setLoadingState: (value) => isLoading.remove = value,
            onSuccess: async () => {
              toast.success(`Network "${name}" Removed Successfully.`);
              await invalidateAll();
            }
          });
        }
      }
    });
  }
  async function handleDeleteSelected() {
    const selectedNetworkDetails = networkPageStates.selectedNetworks.map((id) => {
      const network = networkPageStates.networks.find((n) => n.Id === id);
      return {
        id,
        name: network?.Name || id.substring(0, 12),
        isDefault: DEFAULT_NETWORK_NAMES.has(network?.Name || "")
      };
    });
    const defaultNetworksSelected = selectedNetworkDetails.filter((n) => n.isDefault);
    if (defaultNetworksSelected.length > 0) {
      const names = defaultNetworksSelected.map((n) => n.name).join(", ");
      toast.error(`Cannot delete default networks: ${names}. Please deselect them.`);
      return;
    }
    openConfirmDialog({
      title: "Delete Selected Networks",
      message: `Are you sure you want to delete ${networkPageStates.selectedNetworks.length} selected network(s)? This action cannot be undone. Networks currently in use by containers cannot be deleted.`,
      confirm: {
        label: "Delete",
        destructive: true,
        action: async () => {
          isLoading.remove = true;
          let successCount = 0;
          let failureCount = 0;
          for (const network of selectedNetworkDetails) {
            const result = await tryCatch(networkApi.remove(encodeURIComponent(network.id)));
            if (result.data) {
              toast.success(`Network "${network.name}" deleted successfully.`);
              successCount++;
            } else if (result.error) {
              const error = result.error;
              toast.error(`Failed to delete network "${network.name}": ${error.message || "Unknown error"}`);
              failureCount++;
            }
          }
          isLoading.remove = false;
          console.log(`Finished deleting. Success: ${successCount}, Failed: ${failureCount}`);
          if (successCount > 0) {
            setTimeout(
              async () => {
                await invalidateAll();
              },
              500
            );
          }
          networkPageStates.selectedNetworks = [];
        }
      }
    });
  }
  function getNetworkSubnet(network) {
    if (network.IPAM && network.IPAM.Config && network.IPAM.Config.length > 0 && network.IPAM.Config[0].Subnet) {
      return network.IPAM.Config[0].Subnet;
    }
    return "N/A";
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div class="space-y-6"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><h1 class="text-3xl font-bold tracking-tight">Networks</h1> <p class="text-sm text-muted-foreground mt-1">View and Manage Container Networking</p></div></div> `;
    if (networkPageStates.error) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<!---->`;
      Alert($$payload2, {
        variant: "destructive",
        children: ($$payload3) => {
          Circle_alert($$payload3, { class: "mr-2 size-4" });
          $$payload3.out += `<!----> <!---->`;
          Alert_title($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->Error Loading Networks`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Alert_description($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->${escape_html(networkPageStates.error)}`;
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
    $$payload2.out += `<!--]--> <div class="grid grid-cols-1 sm:grid-cols-3 gap-4"><!---->`;
    Card($$payload2, {
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_content($$payload3, {
          class: "p-4 flex items-center justify-between",
          children: ($$payload4) => {
            $$payload4.out += `<div><p class="text-sm font-medium text-muted-foreground">Total Networks</p> <p class="text-2xl font-bold">${escape_html(totalNetworks)}</p></div> <div class="bg-primary/10 p-2 rounded-full">`;
            Network($$payload4, { class: "text-primary size-5" });
            $$payload4.out += `<!----></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <!---->`;
    Card($$payload2, {
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_content($$payload3, {
          class: "p-4 flex items-center justify-between",
          children: ($$payload4) => {
            $$payload4.out += `<div><p class="text-sm font-medium text-muted-foreground">Bridge Networks</p> <p class="text-2xl font-bold">${escape_html(bridgeNetworks)}</p></div> <div class="bg-blue-500/10 p-2 rounded-full">`;
            Network($$payload4, { class: "text-blue-500 size-5" });
            $$payload4.out += `<!----></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <!---->`;
    Card($$payload2, {
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_content($$payload3, {
          class: "p-4 flex items-center justify-between",
          children: ($$payload4) => {
            $$payload4.out += `<div><p class="text-sm font-medium text-muted-foreground">Overlay Networks</p> <p class="text-2xl font-bold">${escape_html(overlayNetworks)}</p></div> <div class="bg-purple-500/10 p-2 rounded-full">`;
            Network($$payload4, { class: "text-purple-500 size-5" });
            $$payload4.out += `<!----></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div> <!---->`;
    Card($$payload2, {
      class: "border shadow-sm",
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_header($$payload3, {
          class: "px-6",
          children: ($$payload4) => {
            $$payload4.out += `<div class="flex items-center justify-between"><div><!---->`;
            Card_title($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Network List`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div> <div class="flex items-center gap-2">`;
            if (networkPageStates.selectedNetworks.length > 0) {
              $$payload4.out += "<!--[-->";
              Arcane_button($$payload4, {
                action: "remove",
                customLabel: `Delete Selected (${stringify(networkPageStates.selectedNetworks.length)})`,
                onClick: () => handleDeleteSelected(),
                loading: isLoading.remove,
                loadingLabel: "Processing...",
                disabled: isLoading.remove
              });
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]--> `;
            Arcane_button($$payload4, {
              action: "create",
              customLabel: "Create Network",
              onClick: () => networkPageStates.isCreateDialogOpen = true,
              disabled: isLoading.create
            });
            $$payload4.out += `<!----></div></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card_content($$payload3, {
          children: ($$payload4) => {
            if (networkPageStates.networks && networkPageStates.networks.length > 0) {
              $$payload4.out += "<!--[-->";
              {
                let rows = function($$payload5, { item }) {
                  const isDefaultNetwork = DEFAULT_NETWORK_NAMES.has(item.Name);
                  $$payload5.out += `<!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<a class="font-medium hover:underline"${attr("href", `/networks/${stringify(encodeURIComponent(item.Id))}/`)}>${escape_html(item.Name)}</a>`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(item.Driver)}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(item.Scope)}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(getNetworkSubnet(item))}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->`;
                      Root$2($$payload6, {
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->`;
                          {
                            let child = function($$payload8, { props }) {
                              Button($$payload8, spread_props([
                                props,
                                {
                                  variant: "ghost",
                                  size: "icon",
                                  class: "relative size-8 p-0",
                                  children: ($$payload9) => {
                                    $$payload9.out += `<span class="sr-only">Open menu</span> `;
                                    Ellipsis($$payload9, {});
                                    $$payload9.out += `<!---->`;
                                  },
                                  $$slots: { default: true }
                                }
                              ]));
                            };
                            Trigger($$payload7, { child, $$slots: { child: true } });
                          }
                          $$payload7.out += `<!----> <!---->`;
                          Dropdown_menu_content($$payload7, {
                            align: "end",
                            children: ($$payload8) => {
                              $$payload8.out += `<!---->`;
                              Group($$payload8, {
                                children: ($$payload9) => {
                                  $$payload9.out += `<!---->`;
                                  Dropdown_menu_item($$payload9, {
                                    onclick: () => goto(`/networks/${encodeURIComponent(item.Id)}`),
                                    disabled: isAnyLoading,
                                    children: ($$payload10) => {
                                      Scan_search($$payload10, { class: "size-4" });
                                      $$payload10.out += `<!----> Inspect`;
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$payload9.out += `<!----> `;
                                  if (!isDefaultNetwork) {
                                    $$payload9.out += "<!--[-->";
                                    $$payload9.out += `<!---->`;
                                    Dropdown_menu_separator($$payload9, {});
                                    $$payload9.out += `<!----> <!---->`;
                                    Dropdown_menu_item($$payload9, {
                                      class: "text-red-500 focus:text-red-700!",
                                      onclick: () => handleDeleteNetwork(item.Id, item.Name),
                                      disabled: isLoading.remove || isAnyLoading,
                                      children: ($$payload10) => {
                                        if (isLoading.remove && networkPageStates.selectedNetworks.includes(item.Id)) {
                                          $$payload10.out += "<!--[-->";
                                          Loader_circle($$payload10, { class: "animate-spin size-4" });
                                        } else {
                                          $$payload10.out += "<!--[!-->";
                                          Trash_2($$payload10, { class: "size-4" });
                                        }
                                        $$payload10.out += `<!--]--> Remove`;
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$payload9.out += `<!---->`;
                                  } else {
                                    $$payload9.out += "<!--[!-->";
                                  }
                                  $$payload9.out += `<!--]-->`;
                                },
                                $$slots: { default: true }
                              });
                              $$payload8.out += `<!---->`;
                            },
                            $$slots: { default: true }
                          });
                          $$payload7.out += `<!---->`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!---->`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!---->`;
                };
                Universal_table($$payload4, {
                  data: networkPageStates.networks,
                  columns: [
                    { accessorKey: "Name", header: "Name" },
                    { accessorKey: "Driver", header: "Driver" },
                    { accessorKey: "Scope", header: "Scope" },
                    {
                      accessorFn: (row) => getNetworkSubnet(row),
                      header: "Subnet",
                      id: "subnet"
                    },
                    {
                      accessorKey: "actions",
                      header: " ",
                      enableSorting: false
                    }
                  ],
                  idKey: "Id",
                  display: {
                    filterPlaceholder: "Search networks...",
                    noResultsMessage: "No networks found"
                  },
                  pagination: {
                    pageSize: tablePersistence.getPageSize("networks")
                  },
                  onPageSizeChange: (newSize) => {
                    tablePersistence.setPageSize("networks", newSize);
                  },
                  sort: { defaultSort: { id: "Name", desc: false } },
                  get selectedIds() {
                    return networkPageStates.selectedNetworks;
                  },
                  set selectedIds($$value) {
                    networkPageStates.selectedNetworks = $$value;
                    $$settled = false;
                  },
                  rows,
                  $$slots: { rows: true }
                });
              }
            } else if (!networkPageStates.error) {
              $$payload4.out += "<!--[1-->";
              $$payload4.out += `<div class="flex flex-col items-center justify-center py-12 px-6 text-center">`;
              Network($$payload4, {
                class: "text-muted-foreground mb-4 opacity-40 size-12"
              });
              $$payload4.out += `<!----> <p class="text-lg font-medium">No networks found</p> <p class="text-sm text-muted-foreground mt-1 max-w-md">Create a new network using the "Create Network" button above or use the Docker CLI</p> <div class="flex gap-3 mt-4">`;
              Arcane_button($$payload4, {
                action: "create",
                customLabel: "Create Network",
                onClick: () => networkPageStates.isCreateDialogOpen = true,
                size: "sm"
              });
              $$payload4.out += `<!----></div></div>`;
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
    $$payload2.out += `<!----> `;
    CreateNetworkDialog($$payload2, {
      isCreating: isLoading.create,
      onSubmit: handleCreateNetworkSubmit,
      get open() {
        return networkPageStates.isCreateDialogOpen;
      },
      set open($$value) {
        networkPageStates.isCreateDialogOpen = $$value;
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
export {
  _page as default
};
