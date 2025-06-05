import { p as push, v as store_get, c as copy_payload, d as assign_payload, x as unsubscribe_stores, a as pop, e as bind_props, t as escape_html, q as attr_style, g as stringify, f as attr, b as spread_props, j as ensure_array_like } from './index3-DI1Ivwzg.js';
import { U as Universal_table, T as Table_cell, E as Ellipsis } from './universal-table-CB6RbjtA.js';
import { B as Button } from './button-CUTwDrbo.js';
import { A as Alert } from './alert-BRXlGSSu.js';
import { A as Alert_title, a as Alert_description } from './alert-title-Ce5Et4hB.js';
import { C as Card } from './card-BHGzpLb_.js';
import { C as Card_content, a as Card_header, b as Card_title } from './card-title-Cbe9TU5i.js';
import { i as invalidateAll, g as goto } from './client-Cc1XkR80.js';
import { a as toast } from './Toaster.svelte_svelte_type_style_lang-B5vkOu6x.js';
import { o as onDestroy } from './use-id-BSIc2y_F.js';
import { R as Root, D as Dialog_content, a as Dialog_header, g as Dialog_title, b as Dialog_footer } from './index7-tn3QlYte.js';
import { I as Input } from './input-Bs5Bjqyo.js';
import { L as Label } from './label-DF0BU6VF.js';
import { R as Root$1, D as Dropdown_menu_checkbox_item, F as Funnel, A as Accordion_item, a as Accordion_trigger, b as Accordion_content } from './index13-BySTmDpe.js';
import { R as Root$3, S as Select_trigger, a as Select_content, b as Select_item } from './index11-Bwdsa0vi.js';
import { D as Dialog_description } from './dialog-description-R10GNeQ8.js';
import { L as Loader_circle } from './loader-circle-BJifzSLw.js';
import { f as formatBytes } from './bytes.util-aLEoH8w0.js';
import { R as Root$2, T as Trigger, D as Dropdown_menu_content, G as Group } from './index10-CY-2AYBF.js';
import { o as openConfirmDialog } from './index8-BdgpbvMa.js';
import { S as Status_badge } from './status-badge-55QtloxC.js';
import { I as ImageAPIService } from './image-api-service-hks713bt.js';
import { h as handleApiResultWithCallbacks } from './api.util-Ci3Q0GvL.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import { s as settingsStore } from './settings-store-Cucc9Cev.js';
import { M as Maturity_item } from './maturity-item-DPTjIEFe.js';
import { w as writable } from './index2-Da1jJcEh.js';
import { A as Arcane_button, S as Scan_search } from './arcane-button-DukVn74_.js';
import { t as tablePersistence } from './table-store-C93SAwyA.js';
import { C as Circle_alert } from './circle-alert-Cc7lYjCi.js';
import { H as Hard_drive } from './hard-drive-DYOg6VMo.js';
import { D as Dropdown_menu_label } from './dropdown-menu-label-BGU7solI.js';
import { C as Chevron_down } from './chevron-down-DOg7W4Qb.js';
import { D as Dropdown_menu_item } from './dropdown-menu-item-avPBUpKU.js';
import { D as Download } from './play-_c2l8cZS.js';
import { T as Trash_2 } from './trash-2-BUIKTnnR.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import '@tanstack/table-core';
import './create-id-DRrkdd12.js';
import './index-server-_G0R5Qhl.js';
import './noop-BrWcRgZY.js';
import './get-directional-keys-4fLrGlIs.js';
import './Icon-DbVCNmsR.js';
import './chevron-right-EG31JOyw.js';
import './checkbox-CMEX2hM2.js';
import './hidden-input-BsZkZal-.js';
import './check-CkcwyHfy.js';
import './exports-Cv9LZeD1.js';
import './scroll-lock-C_EWKkAl.js';
import './events-CVA3EDdV.js';
import './x-BTRU5OLu.js';
import './is-using-keyboard.svelte-DKF6IOQr.js';
import './popper-layer-force-mount-A94KrKTq.js';
import './use-roving-focus.svelte-Cnaf6bhO.js';
import './use-grace-area.svelte-DYFPGt31.js';
import './api-service-DMPLrOP8.js';
import 'axios';
import './errors.util-g315AnHn.js';
import './index9-JqctHbMH.js';
import './circle-check-CTBnpdJg.js';
import './triangle-alert-DaMn4J5b.js';
import './clock-BAJle9Um.js';
import './layout-template-C_FDbO2k.js';
import './save-C3QNHVRC.js';
import './file-text-C4b752KJ.js';
import './circle-stop-CL2cQsOt.js';
import './menu-item-iytmaAC5.js';

const initialState = {
  lastChecked: null,
  maturityData: {},
  isChecking: false
};
const maturityStore = writable(initialState);
function Pull_image_dialog($$payload, $$props) {
  push();
  function onClose() {
    open = false;
  }
  let {
    open = false,
    isPulling = false,
    pullProgress = 0,
    onSubmit = (data) => console.log("Pull submitted:", data)
  } = $$props;
  let imageRef = "";
  let tag = "latest";
  let platform = "";
  const platforms = [
    { label: "Default", value: "" },
    { label: "linux/amd64", value: "linux/amd64" },
    { label: "linux/arm64", value: "linux/arm64" },
    { label: "linux/arm/v7", value: "linux/arm/v7" },
    {
      label: "windows/amd64",
      value: "windows/amd64"
    }
  ];
  function handleSubmit() {
    if (!imageRef.trim()) return;
    let imageName = imageRef.trim();
    let imageTag = tag.trim();
    if (imageName.includes(":")) {
      const parts = imageName.split(":");
      imageName = parts[0];
      if (parts.length > 1 && parts[1].trim() !== "") {
        imageTag = parts[1].trim();
      }
    }
    if (!imageTag) {
      imageTag = "latest";
    }
    onSubmit({
      imageRef: imageName,
      tag: imageTag,
      platform: platform || void 0,
      registryUrl: void 0
    });
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
              "data-testid": "pull-docker-image-header",
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  "data-testid": "pull-docker-image-header",
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Pull Docker Image`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Enter the image reference you want to pull from a registry.`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <form class="grid gap-4 py-4"><div class="flex flex-col gap-2">`;
            Label($$payload4, {
              for: "image-ref",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Image`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <div class="flex items-center gap-2"><div class="flex-1">`;
            Input($$payload4, {
              id: "image-ref",
              placeholder: "e.g., nginx or myregistry.com/ubuntu",
              required: true,
              disabled: isPulling,
              get value() {
                return imageRef;
              },
              set value($$value) {
                imageRef = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----></div> <div class="flex items-center"><span class="text-lg font-medium text-muted-foreground">:</span></div> <div class="w-1/3">`;
            Input($$payload4, {
              id: "image-tag",
              placeholder: "latest",
              disabled: isPulling,
              get value() {
                return tag;
              },
              set value($$value) {
                tag = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----></div></div></div> <!---->`;
            Root$1($$payload4, {
              type: "single",
              class: "w-full",
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
                        $$payload7.out += `<div class="grid gap-4 pt-2"><div class="flex flex-col gap-2">`;
                        Label($$payload7, {
                          for: "platform",
                          children: ($$payload8) => {
                            $$payload8.out += `<!---->Platform`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload7.out += `<!----> <!---->`;
                        Root$3($$payload7, {
                          type: "single",
                          disabled: isPulling,
                          get value() {
                            return platform;
                          },
                          set value($$value) {
                            platform = $$value;
                            $$settled = false;
                          },
                          children: ($$payload8) => {
                            $$payload8.out += `<!---->`;
                            Select_trigger($$payload8, {
                              class: "w-full",
                              id: "platform",
                              children: ($$payload9) => {
                                $$payload9.out += `<span>${escape_html(platforms.find((p) => p.value === platform)?.label || "Select platform")}</span>`;
                              },
                              $$slots: { default: true }
                            });
                            $$payload8.out += `<!----> <!---->`;
                            Select_content($$payload8, {
                              children: ($$payload9) => {
                                const each_array = ensure_array_like(platforms);
                                $$payload9.out += `<!--[-->`;
                                for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                                  let platformOption = each_array[$$index];
                                  $$payload9.out += `<!---->`;
                                  Select_item($$payload9, {
                                    value: platformOption.value,
                                    children: ($$payload10) => {
                                      $$payload10.out += `<!---->${escape_html(platformOption.label)}`;
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$payload9.out += `<!---->`;
                                }
                                $$payload9.out += `<!--]-->`;
                              },
                              $$slots: { default: true }
                            });
                            $$payload8.out += `<!---->`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload7.out += `<!----> <p class="text-xs text-muted-foreground mt-1">Specifies architecture/OS for multi-arch images. Default uses your system's platform.</p></div></div>`;
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
            $$payload4.out += `<!----></form> `;
            if (isPulling) {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<div class="mt-4"><div class="flex justify-between text-xs mb-1"><span>Pulling image...</span> <span>${escape_html(Math.round(pullProgress))}%</span></div> <div class="w-full bg-secondary rounded-full overflow-hidden size-2"><div class="bg-primary h-full transition-all duration-300 ease-in-out"${attr_style(`width: ${stringify(pullProgress)}%`)}></div></div> <p class="text-xs text-muted-foreground mt-1">This may take a while depending on the image size and your internet connection.</p></div>`;
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]--> <!---->`;
            Dialog_footer($$payload4, {
              children: ($$payload5) => {
                Button($$payload5, {
                  variant: "outline",
                  onclick: onClose,
                  disabled: isPulling,
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Cancel`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> `;
                Button($$payload5, {
                  type: "submit",
                  onclick: handleSubmit,
                  disabled: isPulling || !imageRef.trim(),
                  class: "relative",
                  children: ($$payload6) => {
                    if (isPulling) {
                      $$payload6.out += "<!--[-->";
                      $$payload6.out += `<div class="absolute inset-0 flex items-center justify-center"><svg class="absolute w-full h-full" viewBox="0 0 100 100"><circle class="text-primary-400/20" cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="8"></circle><circle class="text-primary-500" cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"${attr("stroke-dasharray", 283)}${attr("stroke-dashoffset", 283 * (1 - pullProgress / 100))} transform="rotate(-90 50 50)"></circle></svg> `;
                      Loader_circle($$payload6, { class: "animate-spin size-4" });
                      $$payload6.out += `<!----></div> <span class="opacity-0">Pull Image</span>`;
                    } else {
                      $$payload6.out += "<!--[!-->";
                      $$payload6.out += `Pull Image`;
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
  bind_props($$props, { open, onClose });
  pop();
}
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  let images = data.images || [];
  let error = data.error;
  let selectedIds = [];
  let imageFilters = { showUsed: true, showUnused: true };
  let isLoading = {
    pulling: false,
    removing: false,
    refreshing: false,
    pruning: false,
    checking: false
  };
  const imageApi = new ImageAPIService();
  let isPullDialogOpen = false;
  let pullProgress = 0;
  let isConfirmPruneDialogOpen = false;
  const totalImages = images?.length || 0;
  const totalSize = images?.reduce((acc, img) => acc + (img.Size || 0), 0) || 0;
  const enhancedImages = images.map((image) => {
    const storedMaturity = store_get($$store_subs ??= {}, "$maturityStore", maturityStore).maturityData[image.Id];
    return {
      ...image,
      maturity: storedMaturity || image.maturity
    };
  });
  const filteredImages = enhancedImages.filter((img) => imageFilters.showUsed && img.inUse || imageFilters.showUnused && !img.inUse);
  async function handlePullImageSubmit(event) {
    const {
      imageRef,
      tag = "latest",
      platform,
      registryUrl
    } = event;
    isLoading.pulling = true;
    pullProgress = 0;
    try {
      const encodedImageRef = encodeURIComponent(imageRef);
      let apiUrl = `/api/images/pull-stream/${encodedImageRef}?tag=${tag}`;
      if (platform) {
        apiUrl += `&platform=${encodeURIComponent(platform)}`;
      }
      if (registryUrl) {
        const credentials = store_get($$store_subs ??= {}, "$settingsStore", settingsStore).registryCredentials || [];
        const foundCredential = credentials.find((cred) => cred.url === registryUrl);
        if (foundCredential && foundCredential.username) {
          toast.info(`Attempting pull from ${foundCredential.url} with user ${foundCredential.username}`);
        } else if (registryUrl !== "docker.io" && registryUrl !== "") {
          toast.error(`Credentials not found for ${registryUrl}. Attempting unauthenticated pull.`);
        }
      }
      const eventSource = new EventSource(apiUrl);
      eventSource.onmessage = (event2) => {
        const data2 = JSON.parse(event2.data);
        if (data2.error) {
          eventSource.close();
          toast.error(`Pull failed: ${data2.error}`);
          isLoading.pulling = false;
          return;
        }
        if (data2.type === "info" || data2.type === "warning") {
          if (data2.type === "info") toast.info(data2.message);
          if (data2.type === "warning") toast.error(data2.message);
          return;
        }
        if (data2.progress !== void 0) {
          pullProgress = data2.progress;
        }
        if (data2.complete) {
          eventSource.close();
          const fullImageRef = `${imageRef}:${tag}`;
          toast.success(`Image "${fullImageRef}" pulled successfully.`);
          isPullDialogOpen = false;
          setTimeout(
            async () => {
              await invalidateAll();
            },
            500
          );
          isLoading.pulling = false;
        }
      };
      eventSource.onerror = (err) => {
        console.error("EventSource error:", err);
        eventSource.close();
        toast.error("Connection to server lost while pulling image");
        isLoading.pulling = false;
      };
    } catch (err) {
      console.error("Failed to pull image:", err);
      toast.error(`Failed to pull image: ${err instanceof Error ? err.message : String(err)}`);
      isLoading.pulling = false;
    }
  }
  async function handleDeleteSelected() {
    openConfirmDialog({
      title: "Delete Selected Images",
      message: `Are you sure you want to delete ${selectedIds.length} selected image(s)? This action cannot be undone. Images currently used by containers will not be deleted.
`,
      confirm: {
        label: "Delete",
        destructive: true,
        action: async () => {
          isLoading.removing = true;
          let successCount = 0;
          let failureCount = 0;
          for (const id of selectedIds) {
            const image = images.find((img) => img.Id === id);
            const imageIdentifier = image?.RepoTags?.[0] || id.substring(0, 12);
            if (image?.inUse) {
              toast.error(`Image "${imageIdentifier}" is in use and cannot be deleted.`);
              failureCount++;
              continue;
            }
            await handleApiResultWithCallbacks({
              result: await tryCatch(imageApi.remove(id)),
              message: `Failed to delete image "${imageIdentifier}"`,
              setLoadingState: (value) => isLoading.removing = value,
              onSuccess: async () => {
                toast.success(`Image "${imageIdentifier}" deleted successfully.`);
                successCount++;
              }
            });
          }
          console.log(`Finished deleting. Success: ${successCount}, Failed: ${failureCount}`);
          if (successCount > 0) {
            setTimeout(
              async () => {
                await invalidateAll();
              },
              500
            );
          }
          selectedIds = [];
        }
      }
    });
  }
  async function handlePruneImages() {
    isLoading.pruning = true;
    await handleApiResultWithCallbacks({
      result: await tryCatch(imageApi.prune()),
      message: "Failed to Prune Images",
      setLoadingState: (value) => isLoading.pruning = value,
      onSuccess: async (result) => {
        isConfirmPruneDialogOpen = false;
        toast.success(result?.message ?? "Images pruned successfully.");
        await invalidateAll();
      }
    });
  }
  async function pullImageByRepoTag(repoTag) {
    if (!repoTag) {
      toast.error("Cannot pull image without a repository tag");
      return;
    }
    let [imageRef, tag] = repoTag.split(":");
    tag = tag || "latest";
    await handleApiResultWithCallbacks({
      result: await tryCatch(imageApi.pull(imageRef, tag)),
      message: `Failed to pull image "${repoTag}"`,
      setLoadingState: (value) => isLoading.pulling = value,
      onSuccess: async () => {
        toast.success(`Image "${repoTag}" pulled successfully.`);
        await invalidateAll();
      }
    });
  }
  async function handleImageRemove(id) {
    const image = images.find((img) => img.Id === id);
    const imageIdentifier = image?.RepoTags?.[0] || id.substring(0, 12);
    openConfirmDialog({
      title: "Delete Image",
      message: `Are you sure you want to delete ${imageIdentifier}? This action cannot be undone.`,
      confirm: {
        label: "Delete",
        destructive: true,
        action: async () => {
          await handleApiResultWithCallbacks({
            result: await tryCatch(imageApi.remove(id)),
            message: "Failed to Remove Image",
            setLoadingState: (value) => isLoading.removing = value,
            onSuccess: async () => {
              toast.success(`Image "${imageIdentifier}" deleted successfully.`);
              await invalidateAll();
            }
          });
        }
      }
    });
  }
  async function triggerManualMaturityCheck(force = false) {
    isLoading.checking = true;
    try {
      const response = await fetch("/api/images/maturity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        if (result.stats) {
          console.log("Maturity check stats:", result.stats);
        }
        await invalidateAll();
      } else {
        toast.error(`Manual check failed: ${result.error}`);
      }
    } catch (error2) {
      console.error("Manual maturity check error:", error2);
      toast.error("Failed to trigger manual maturity check");
    } finally {
      isLoading.checking = false;
    }
  }
  onDestroy(() => {
  });
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div class="space-y-6"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><h1 class="text-3xl font-bold tracking-tight">Container Images</h1> <p class="text-sm text-muted-foreground mt-1">View and Manage your Container Images</p></div></div> `;
    if (error) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<!---->`;
      Alert($$payload2, {
        variant: "destructive",
        children: ($$payload3) => {
          Circle_alert($$payload3, { class: "mr-2 size-4" });
          $$payload3.out += `<!----> <!---->`;
          Alert_title($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->Error Loading Images`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Alert_description($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->${escape_html(error)}`;
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
            $$payload4.out += `<div><p class="text-sm font-medium text-muted-foreground">Total Images</p> <p class="text-2xl font-bold">${escape_html(totalImages)}</p></div> <div class="bg-blue-500/10 p-2 rounded-full">`;
            Hard_drive($$payload4, { class: "text-blue-500 size-5" });
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
            $$payload4.out += `<div><p class="text-sm font-medium text-muted-foreground">Total Size</p> <p class="text-2xl font-bold">${escape_html(formatBytes(totalSize))}</p></div> <div class="bg-purple-500/10 p-2 rounded-full">`;
            Hard_drive($$payload4, { class: "text-purple-500 size-5" });
            $$payload4.out += `<!----></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div> `;
    if (images && images.length > 0) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<!---->`;
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
                  $$payload5.out += `<!---->Image List`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----></div> <div class="flex items-center gap-2"><!---->`;
              Root$2($$payload4, {
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
                          $$payload7.out += `<!---->Image Usage`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> <!---->`;
                      Dropdown_menu_checkbox_item($$payload6, {
                        checked: imageFilters.showUsed,
                        onCheckedChange: (checked) => {
                          imageFilters.showUsed = checked;
                        },
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Show Used Images`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> <!---->`;
                      Dropdown_menu_checkbox_item($$payload6, {
                        checked: imageFilters.showUnused,
                        onCheckedChange: (checked) => {
                          imageFilters.showUnused = checked;
                        },
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Show Unused Images`;
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
              if (selectedIds.length > 0) {
                $$payload4.out += "<!--[-->";
                Arcane_button($$payload4, {
                  action: "remove",
                  onClick: () => handleDeleteSelected(),
                  loading: isLoading.removing,
                  disabled: isLoading.removing
                });
              } else {
                $$payload4.out += "<!--[!-->";
              }
              $$payload4.out += `<!--]--> `;
              Arcane_button($$payload4, {
                action: "remove",
                label: "Prune Unused",
                onClick: () => isConfirmPruneDialogOpen = true,
                loading: isLoading.pruning,
                loadingLabel: "Pruning...",
                disabled: isLoading.pruning
              });
              $$payload4.out += `<!----> `;
              Arcane_button($$payload4, {
                action: "pull",
                label: "Pull Image",
                onClick: () => isPullDialogOpen = true,
                loading: isLoading.pulling,
                loadingLabel: "Pulling...",
                disabled: isLoading.pulling
              });
              $$payload4.out += `<!----> `;
              Arcane_button($$payload4, {
                action: "inspect",
                label: "Check Updates",
                onClick: () => triggerManualMaturityCheck(true),
                loading: isLoading.checking,
                loadingLabel: "Checking...",
                disabled: isLoading.checking
              });
              $$payload4.out += `<!----></div></div>`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Card_content($$payload3, {
            children: ($$payload4) => {
              {
                let rows = function($$payload5, { item }) {
                  $$payload5.out += `<!---->`;
                  Table_cell($$payload5, {
                    "data-image-id": item.Id,
                    children: ($$payload6) => {
                      $$payload6.out += `<div class="flex items-center gap-2"><div class="flex items-center flex-1">`;
                      Maturity_item($$payload6, { maturity: item.maturity });
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
                    class: "truncate",
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(item.Id)}`;
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
                                    onclick: () => goto(`/images/${item.Id}`),
                                    children: ($$payload10) => {
                                      Scan_search($$payload10, { class: "size-4" });
                                      $$payload10.out += `<!----> Inspect`;
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$payload9.out += `<!----> <!---->`;
                                  Dropdown_menu_item($$payload9, {
                                    onclick: () => pullImageByRepoTag(item.RepoTags?.[0]),
                                    disabled: isLoading.pulling || !item.RepoTags?.[0],
                                    children: ($$payload10) => {
                                      if (isLoading.pulling) {
                                        $$payload10.out += "<!--[-->";
                                        Loader_circle($$payload10, { class: "animate-spin size-4" });
                                        $$payload10.out += `<!----> Pulling...`;
                                      } else {
                                        $$payload10.out += "<!--[!-->";
                                        Download($$payload10, { class: "size-4" });
                                        $$payload10.out += `<!----> Pull`;
                                      }
                                      $$payload10.out += `<!--]-->`;
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$payload9.out += `<!----> <!---->`;
                                  Dropdown_menu_item($$payload9, {
                                    class: "text-red-500 focus:text-red-700!",
                                    onclick: () => handleImageRemove(item.Id),
                                    children: ($$payload10) => {
                                      Trash_2($$payload10, { class: "size-4" });
                                      $$payload10.out += `<!----> Remove`;
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
                  data: filteredImages,
                  columns: [
                    { accessorKey: "repo", header: "Name" },
                    {
                      accessorKey: "inUse",
                      header: " ",
                      enableSorting: false
                    },
                    { accessorKey: "tag", header: "Tag" },
                    {
                      accessorKey: "Id",
                      header: "Image ID",
                      enableSorting: false
                    },
                    { accessorKey: "Size", header: "Size" },
                    {
                      accessorKey: "actions",
                      header: " ",
                      enableSorting: false
                    }
                  ],
                  idKey: "Id",
                  display: {
                    filterPlaceholder: "Search images...",
                    noResultsMessage: "No images found"
                  },
                  pagination: {
                    pageSize: tablePersistence.getPageSize("images")
                  },
                  onPageSizeChange: (newSize) => {
                    tablePersistence.setPageSize("images", newSize);
                  },
                  sort: { defaultSort: { id: "repo", desc: false } },
                  get selectedIds() {
                    return selectedIds;
                  },
                  set selectedIds($$value) {
                    selectedIds = $$value;
                    $$settled = false;
                  },
                  rows,
                  $$slots: { rows: true }
                });
              }
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    } else if (!error) {
      $$payload2.out += "<!--[1-->";
      $$payload2.out += `<div class="flex flex-col items-center justify-center py-12 px-6 text-center border rounded-lg bg-card">`;
      Hard_drive($$payload2, {
        class: "text-muted-foreground mb-4 opacity-40 size-12"
      });
      $$payload2.out += `<!----> <p class="text-lg font-medium">No images found</p> <p class="text-sm text-muted-foreground mt-1 max-w-md">Pull a new image using the "Pull Image" button above or use the Docker CLI</p> <div class="flex gap-3 mt-4">`;
      Button($$payload2, {
        variant: "outline",
        size: "sm",
        onclick: () => isPullDialogOpen = true,
        children: ($$payload3) => {
          Download($$payload3, { class: "size-4" });
          $$payload3.out += `<!----> Pull Image`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div></div>`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> `;
    Pull_image_dialog($$payload2, {
      isPulling: isLoading.pulling,
      pullProgress,
      onSubmit: handlePullImageSubmit,
      get open() {
        return isPullDialogOpen;
      },
      set open($$value) {
        isPullDialogOpen = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----> <!---->`;
    Root($$payload2, {
      get open() {
        return isConfirmPruneDialogOpen;
      },
      set open($$value) {
        isConfirmPruneDialogOpen = $$value;
        $$settled = false;
      },
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Dialog_content($$payload3, {
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Prune Unused Images`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Are you sure you want to remove all unused (dangling) Docker images? This will free up disk space but cannot be undone. Images actively used by containers will not be affected.`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <div class="flex justify-end gap-3 pt-6">`;
            Button($$payload4, {
              variant: "outline",
              onclick: () => isConfirmPruneDialogOpen = false,
              disabled: isLoading.pruning,
              children: ($$payload5) => {
                $$payload5.out += `<!---->Cancel`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Button($$payload4, {
              variant: "destructive",
              onclick: handlePruneImages,
              disabled: isLoading.pruning,
              children: ($$payload5) => {
                if (isLoading.pruning) {
                  $$payload5.out += "<!--[-->";
                  Loader_circle($$payload5, { class: "mr-2 animate-spin size-4" });
                  $$payload5.out += `<!----> Pruning...`;
                } else {
                  $$payload5.out += "<!--[!-->";
                  $$payload5.out += `Prune Images`;
                }
                $$payload5.out += `<!--]-->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div>`;
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
//# sourceMappingURL=_page.svelte-CozI-j_x.js.map
