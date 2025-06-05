import { p as push, u as copy_payload, v as assign_payload, t as bind_props, a as pop, k as escape_html, l as ensure_array_like, j as spread_props, n as stringify, b as attr } from "../../../chunks/index3.js";
import { C as Card } from "../../../chunks/card.js";
import { C as Card_content, a as Card_header, b as Card_title } from "../../../chunks/card-title.js";
import "clsx";
import { B as Button } from "../../../chunks/button.js";
import { a as toast } from "../../../chunks/Toaster.svelte_svelte_type_style_lang.js";
import { U as Universal_table, T as Table_cell, E as Ellipsis } from "../../../chunks/universal-table.js";
import { A as Alert } from "../../../chunks/alert.js";
import { A as Alert_title, a as Alert_description } from "../../../chunks/alert-title.js";
import { g as goto, i as invalidateAll } from "../../../chunks/client.js";
import { R as Root, D as Dialog_content, a as Dialog_header, b as Dialog_title, c as Dialog_footer } from "../../../chunks/index7.js";
import { I as Input } from "../../../chunks/input.js";
import { L as Label } from "../../../chunks/label.js";
import { T as Textarea } from "../../../chunks/textarea.js";
import { R as Root$2, A as Accordion_item, a as Accordion_trigger, b as Accordion_content, D as Dropdown_menu_checkbox_item, F as Funnel } from "../../../chunks/index13.js";
import { R as Root$1, S as Select_trigger, a as Select_content, b as Select_item } from "../../../chunks/index11.js";
import { A as Arcane_button, S as Scan_search } from "../../../chunks/arcane-button.js";
import { D as Dialog_description } from "../../../chunks/dialog-description.js";
import { R as Root$3, T as Trigger, D as Dropdown_menu_content, G as Group } from "../../../chunks/index10.js";
import { o as openConfirmDialog } from "../../../chunks/index8.js";
import { h as handleApiResultWithCallbacks } from "../../../chunks/api.util.js";
import { t as tryCatch } from "../../../chunks/try-catch.js";
import { V as VolumeAPIService } from "../../../chunks/volume-api-service.js";
import { S as Status_badge } from "../../../chunks/status-badge.js";
import { t as tablePersistence } from "../../../chunks/table-store.js";
import { C as Circle_alert } from "../../../chunks/circle-alert.js";
import { D as Database } from "../../../chunks/database.js";
import { H as Hard_drive } from "../../../chunks/hard-drive.js";
import { D as Dropdown_menu_label } from "../../../chunks/dropdown-menu-label.js";
import { C as Chevron_down } from "../../../chunks/chevron-down.js";
import { D as Dropdown_menu_item } from "../../../chunks/dropdown-menu-item.js";
import { D as Dropdown_menu_separator } from "../../../chunks/dropdown-menu-separator.js";
import { T as Trash_2 } from "../../../chunks/trash-2.js";
import { L as Loader_circle } from "../../../chunks/loader-circle.js";
function Create_volume_dialog($$payload, $$props) {
  push();
  let {
    open = false,
    isCreating = false,
    onSubmit = () => {
    }
  } = $$props;
  let volumeCreateStates = {
    volumeName: "",
    volumeDriver: "local",
    volumeOptText: "",
    volumeLabels: ""
  };
  const drivers = [
    { label: "Local", value: "local" },
    { label: "NFS", value: "nfs" },
    {
      label: "AWS EBS",
      value: "awsElasticBlockStore"
    },
    { label: "Azure Disk", value: "azure_disk" },
    {
      label: "GCE Persistent Disk",
      value: "gcePersistentDisk"
    }
  ];
  function parseKeyValuePairs(text) {
    if (!text.trim()) return {};
    const result = {};
    const lines = text.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=");
      if (key.trim()) {
        result[key.trim()] = value.trim();
      }
    }
    return result;
  }
  function handleSubmit() {
    if (!volumeCreateStates.volumeName.trim()) return;
    const driverOpts = parseKeyValuePairs(volumeCreateStates.volumeOptText);
    const labels = parseKeyValuePairs(volumeCreateStates.volumeLabels);
    const volumeOptions = {
      Name: volumeCreateStates.volumeName.trim(),
      Driver: volumeCreateStates.volumeDriver,
      DriverOpts: Object.keys(driverOpts).length ? driverOpts : void 0,
      Labels: Object.keys(labels).length ? labels : void 0
    };
    onSubmit(volumeOptions);
    open = false;
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
          class: "sm:max-w-[500px]",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Create New Volume`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Enter the details for the new Docker volume.`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <form class="grid gap-4 py-4"><div class="grid grid-cols-4 items-center gap-4">`;
            Label($$payload4, {
              for: "volume-name",
              class: "text-right",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Name`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Input($$payload4, {
              id: "volume-name",
              class: "col-span-3",
              placeholder: "e.g., my-app-data",
              required: true,
              disabled: isCreating,
              get value() {
                return volumeCreateStates.volumeName;
              },
              set value($$value) {
                volumeCreateStates.volumeName = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4">`;
            Label($$payload4, {
              for: "volume-driver",
              class: "text-right",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Driver`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <div class="col-span-3"><!---->`;
            Root$1($$payload4, {
              type: "single",
              disabled: isCreating,
              get value() {
                return volumeCreateStates.volumeDriver;
              },
              set value($$value) {
                volumeCreateStates.volumeDriver = $$value;
                $$settled = false;
              },
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Select_trigger($$payload5, {
                  class: "w-full",
                  children: ($$payload6) => {
                    $$payload6.out += `<span>${escape_html(drivers.find((d) => d.value === volumeCreateStates.volumeDriver)?.label || "Select a driver")}</span>`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Select_content($$payload5, {
                  children: ($$payload6) => {
                    const each_array = ensure_array_like(drivers);
                    $$payload6.out += `<!--[-->`;
                    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                      let driverOption = each_array[$$index];
                      $$payload6.out += `<!---->`;
                      Select_item($$payload6, {
                        value: driverOption.value,
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->${escape_html(driverOption.label)}`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!---->`;
                    }
                    $$payload6.out += `<!--]-->`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div></div> <!---->`;
            Root$2($$payload4, {
              type: "single",
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Accordion_item($$payload5, {
                  value: "advanced",
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->`;
                    Accordion_trigger($$payload6, {
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Advanced Settings`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Accordion_content($$payload6, {
                      children: ($$payload7) => {
                        $$payload7.out += `<div class="grid gap-4 pt-2"><div>`;
                        Label($$payload7, {
                          for: "driver-opts",
                          children: ($$payload8) => {
                            $$payload8.out += `<!---->Driver Options`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload7.out += `<!----> `;
                        Textarea($$payload7, {
                          id: "driver-opts",
                          placeholder: "key=value key2=value2",
                          disabled: isCreating,
                          get value() {
                            return volumeCreateStates.volumeOptText;
                          },
                          set value($$value) {
                            volumeCreateStates.volumeOptText = $$value;
                            $$settled = false;
                          }
                        });
                        $$payload7.out += `<!----> <p class="text-xs text-muted-foreground mt-1">Enter driver-specific options as key=value pairs, one per line</p></div> <div>`;
                        Label($$payload7, {
                          for: "labels",
                          children: ($$payload8) => {
                            $$payload8.out += `<!---->Labels`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload7.out += `<!----> `;
                        Textarea($$payload7, {
                          id: "labels",
                          placeholder: "com.example.description=Production data com.example.department=Finance",
                          disabled: isCreating,
                          get value() {
                            return volumeCreateStates.volumeLabels;
                          },
                          set value($$value) {
                            volumeCreateStates.volumeLabels = $$value;
                            $$settled = false;
                          }
                        });
                        $$payload7.out += `<!----> <p class="text-xs text-muted-foreground mt-1">Enter metadata labels as key=value pairs, one per line</p></div></div>`;
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
            $$payload4.out += `<!----></form> <!---->`;
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
                  customLabel: "Create Volume",
                  onClick: handleSubmit,
                  loading: isCreating,
                  loadingLabel: "Creating...",
                  disabled: isCreating || !volumeCreateStates.volumeName.trim()
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
function _page($$payload, $$props) {
  push();
  let { data } = $$props;
  let volumePageStates = {
    volumes: data.volumes,
    selectedIds: [],
    error: data.error,
    showUsed: true,
    showUnused: true
  };
  const filteredVolumes = volumePageStates.volumes.filter((vol) => volumePageStates.showUsed && vol.inUse || volumePageStates.showUnused && !vol.inUse);
  let isDialogOpen = { create: false };
  let isLoading = { remove: false, creating: false };
  const totalVolumes = volumePageStates.volumes.length;
  const volumeApi = new VolumeAPIService();
  async function handleRemoveVolumeConfirm(volumeName) {
    openConfirmDialog({
      title: "Delete Volume",
      message: `Are you sure you want to delete volume "${volumeName}"? This action cannot be undone.`,
      confirm: {
        label: "Delete",
        destructive: true,
        action: async () => {
          handleApiResultWithCallbacks({
            result: await tryCatch(volumeApi.remove(volumeName)),
            message: `Failed to Remove Volume "${volumeName}"`,
            setLoadingState: (value) => isLoading.remove = value,
            onSuccess: async () => {
              toast.success(`Volume "${volumeName}" Removed Successfully.`);
              await invalidateAll();
            }
          });
        }
      }
    });
  }
  async function handleCreateVolume(volumeCreate) {
    handleApiResultWithCallbacks({
      result: await tryCatch(volumeApi.create(volumeCreate)),
      message: `Failed to Create Volume "${volumeCreate.Name}"`,
      setLoadingState: (value) => isLoading.creating = value,
      onSuccess: async () => {
        toast.success(`Volume "${volumeCreate.Name}" created successfully.`);
        await invalidateAll();
        isDialogOpen.create = false;
      }
    });
  }
  async function handleDeleteSelected() {
    openConfirmDialog({
      title: "Delete Selected Volumes",
      message: `Are you sure you want to delete ${volumePageStates.selectedIds.length} selected volume(s)? This action cannot be undone. Volumes currently used by containers will not be deleted.`,
      confirm: {
        label: "Delete",
        destructive: true,
        action: async () => {
          isLoading.remove = true;
          let successCount = 0;
          let failureCount = 0;
          for (const name of volumePageStates.selectedIds) {
            const volume = volumePageStates.volumes?.find((v) => v.Name === name);
            if (volume?.inUse) {
              toast.error(`Volume "${volume.Name}" is in use and cannot be deleted.`);
              failureCount++;
              continue;
            }
            if (!volume?.Name) continue;
            const result = await tryCatch(volumeApi.remove(volume.Name));
            handleApiResultWithCallbacks({
              result,
              message: `Failed to delete volume "${volume.Name}"`,
              setLoadingState: (value) => isLoading.remove = value,
              onSuccess: async () => {
                toast.success(`Volume "${volume.Name}" deleted successfully.`);
                successCount++;
              }
            });
            if (result.error) {
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
          volumePageStates.selectedIds = [];
        }
      }
    });
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div class="space-y-6"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><h1 class="text-3xl font-bold tracking-tight">Volumes</h1> <p class="text-sm text-muted-foreground mt-1">Manage persistent data storage for containers</p></div> <div class="flex gap-2"></div></div> `;
    if (volumePageStates.error) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<!---->`;
      Alert($$payload2, {
        variant: "destructive",
        children: ($$payload3) => {
          Circle_alert($$payload3, { class: "mr-2 size-4" });
          $$payload3.out += `<!----> <!---->`;
          Alert_title($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->Error Loading Volumes`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Alert_description($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->${escape_html(volumePageStates.error)}`;
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
    $$payload2.out += `<!--]--> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><!---->`;
    Card($$payload2, {
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_content($$payload3, {
          class: "p-4 flex items-center justify-between",
          children: ($$payload4) => {
            $$payload4.out += `<div><p class="text-sm font-medium text-muted-foreground">Total Volumes</p> <p class="text-2xl font-bold">${escape_html(totalVolumes)}</p></div> <div class="bg-amber-500/10 p-2 rounded-full">`;
            Database($$payload4, { class: "text-amber-500 size-5" });
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
            $$payload4.out += `<div><p class="text-sm font-medium text-muted-foreground">Default Driver</p> <p class="text-2xl font-bold">local</p></div> <div class="bg-blue-500/10 p-2 rounded-full">`;
            Hard_drive($$payload4, { class: "text-blue-500 size-5" });
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
                $$payload5.out += `<!---->Volume List`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div> <div class="flex items-center gap-2"><!---->`;
            Root$3($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                {
                  let child = function($$payload6, { props }) {
                    Button($$payload6, spread_props([
                      props,
                      {
                        variant: "outline",
                        children: ($$payload7) => {
                          Funnel($$payload7, { class: "size-4" });
                          $$payload7.out += `<!----> Filter `;
                          Chevron_down($$payload7, { class: "size-4" });
                          $$payload7.out += `<!---->`;
                        },
                        $$slots: { default: true }
                      }
                    ]));
                  };
                  Trigger($$payload5, { child, $$slots: { child: true } });
                }
                $$payload5.out += `<!----> <!---->`;
                Dropdown_menu_content($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->`;
                    Dropdown_menu_label($$payload6, {
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Volume Usage`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Dropdown_menu_checkbox_item($$payload6, {
                      checked: volumePageStates.showUsed,
                      onCheckedChange: (checked) => {
                        volumePageStates.showUsed = !!checked;
                      },
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Show Used Volumes`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Dropdown_menu_checkbox_item($$payload6, {
                      checked: volumePageStates.showUnused,
                      onCheckedChange: (checked) => {
                        volumePageStates.showUnused = !!checked;
                      },
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Show Unused Volumes`;
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
            $$payload4.out += `<!----> `;
            if (volumePageStates.selectedIds.length > 0) {
              $$payload4.out += "<!--[-->";
              Arcane_button($$payload4, {
                action: "remove",
                customLabel: `Delete Selected (${stringify(volumePageStates.selectedIds.length)})`,
                onClick: handleDeleteSelected,
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
              customLabel: "Create Volume",
              onClick: () => isDialogOpen.create = true
            });
            $$payload4.out += `<!----></div></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card_content($$payload3, {
          children: ($$payload4) => {
            if (volumePageStates.volumes && volumePageStates.volumes.length > 0) {
              $$payload4.out += "<!--[-->";
              {
                let rows = function($$payload5, { item }) {
                  $$payload5.out += `<!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<div class="flex items-center gap-2"><span class="truncate"><a class="font-medium hover:underline"${attr("href", `/volumes/${stringify(encodeURIComponent(item.Name))}/`)}>${escape_html(item.Name)}</a></span></div>`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      Status_badge($$payload6, {
                        text: item.inUse ? "In Use" : "Unused",
                        variant: item.inUse ? "green" : "amber"
                      });
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(item.Mountpoint)}`;
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
                      $$payload6.out += `<!---->`;
                      Root$3($$payload6, {
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
                                    onclick: () => goto(`/volumes/${encodeURIComponent(item.Name)}`),
                                    disabled: isLoading.remove,
                                    children: ($$payload10) => {
                                      Scan_search($$payload10, { class: "size-4" });
                                      $$payload10.out += `<!----> Inspect`;
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$payload9.out += `<!----> <!---->`;
                                  Dropdown_menu_separator($$payload9, {});
                                  $$payload9.out += `<!----> <!---->`;
                                  Dropdown_menu_item($$payload9, {
                                    class: "text-red-500 focus:text-red-700!",
                                    onclick: () => handleRemoveVolumeConfirm(item.Name),
                                    disabled: isLoading.remove || item.inUse,
                                    children: ($$payload10) => {
                                      if (isLoading.remove && volumePageStates.selectedIds.includes(item.Name)) {
                                        $$payload10.out += "<!--[-->";
                                        Loader_circle($$payload10, { class: "animate-spin size-4" });
                                      } else {
                                        $$payload10.out += "<!--[!-->";
                                        Trash_2($$payload10, { class: "size-4" });
                                      }
                                      $$payload10.out += `<!--]--> Delete`;
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$payload9.out += `<!---->`;
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
                  data: filteredVolumes,
                  idKey: "Name",
                  columns: [
                    { accessorKey: "Name", header: "Name" },
                    {
                      accessorKey: "inUse",
                      header: " ",
                      enableSorting: false
                    },
                    {
                      accessorKey: "Mountpoint",
                      header: "Mountpoint"
                    },
                    { accessorKey: "Driver", header: "Driver" },
                    {
                      accessorKey: "actions",
                      header: " ",
                      enableSorting: false
                    }
                  ],
                  pagination: {
                    pageSize: tablePersistence.getPageSize("volumes")
                  },
                  onPageSizeChange: (newSize) => {
                    tablePersistence.setPageSize("volumes", newSize);
                  },
                  sort: { defaultSort: { id: "Name", desc: false } },
                  display: {
                    filterPlaceholder: "Search volumes...",
                    noResultsMessage: "No volumes found matching your filters."
                  },
                  get selectedIds() {
                    return volumePageStates.selectedIds;
                  },
                  set selectedIds($$value) {
                    volumePageStates.selectedIds = $$value;
                    $$settled = false;
                  },
                  rows,
                  $$slots: { rows: true }
                });
              }
            } else if (!volumePageStates.error) {
              $$payload4.out += "<!--[1-->";
              $$payload4.out += `<div class="flex flex-col items-center justify-center py-12 px-6 text-center">`;
              Database($$payload4, {
                class: "text-muted-foreground mb-4 opacity-40 size-12"
              });
              $$payload4.out += `<!----> <p class="text-lg font-medium">No volumes found</p> <p class="text-sm text-muted-foreground mt-1 max-w-md">Create a new volume using the "Create Volume" button above or use the Docker CLI</p> <div class="flex gap-3 mt-4">`;
              Arcane_button($$payload4, {
                action: "create",
                customLabel: "Create Volume",
                onClick: () => isDialogOpen.create = true,
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
    Create_volume_dialog($$payload2, {
      isCreating: isLoading.creating,
      onSubmit: (volumeCreateData) => handleCreateVolume(volumeCreateData),
      get open() {
        return isDialogOpen.create;
      },
      set open($$value) {
        isDialogOpen.create = $$value;
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
