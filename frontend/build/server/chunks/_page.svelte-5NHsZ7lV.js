import { p as push, c as copy_payload, d as assign_payload, a as pop, j as ensure_array_like, f as attr, t as escape_html, o as attr_class, g as stringify } from './index3-DI1Ivwzg.js';
import { C as Card } from './card-BHGzpLb_.js';
import { C as Card_content, a as Card_header, b as Card_title } from './card-title-Cbe9TU5i.js';
import { B as Button } from './button-CUTwDrbo.js';
import { A as Alert } from './alert-BRXlGSSu.js';
import { A as Alert_title, a as Alert_description } from './alert-title-Ce5Et4hB.js';
import { I as Input } from './input-Bs5Bjqyo.js';
import { L as Label } from './label-DF0BU6VF.js';
import { A as Action_buttons, L as LogViewer } from './LogViewer-ClItUTq5.js';
import { S as Status_badge } from './status-badge-55QtloxC.js';
import { s as statusVariantMap } from './statuses-C3eNtnq-.js';
import { c as capitalizeFirstLetter } from './string.utils-DW_mmI0J.js';
import { g as goto, i as invalidateAll } from './client-Cc1XkR80.js';
import { a as toast } from './Toaster.svelte_svelte_type_style_lang-B5vkOu6x.js';
import { Y as Yaml_editor, E as Env_editor } from './env-editor-TVtvVtyb.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import { S as StackAPIService } from './stack-api-service-Dn9dYXBV.js';
import { h as handleApiResultWithCallbacks } from './api.util-Ci3Q0GvL.js';
import { A as Arcane_button } from './arcane-button-DukVn74_.js';
import { R as Root, D as Dialog_content, a as Dialog_header, g as Dialog_title, b as Dialog_footer } from './index7-tn3QlYte.js';
import { R as Root$1, S as Select_trigger, a as Select_content, b as Select_item } from './index11-Bwdsa0vi.js';
import { F as File_stack } from './file-stack-D1dTmoce.js';
import { L as Layers } from './layers-B6y2ShX1.js';
import { S as Settings } from './settings-dVRciV0i.js';
import { T as Terminal } from './terminal-B-RMUQnz.js';
import { A as Arrow_left } from './arrow-left-Na-IoffC.js';
import { S as Send } from './send-DBaZF5MX.js';
import { C as Circle_alert } from './circle-alert-Cc7lYjCi.js';
import { A as Activity } from './activity-BBw87ym0.js';
import { E as External_link } from './external-link-fiZiqZz7.js';
import { A as Arrow_right } from './arrow-right-BM_fAFQE.js';
import { R as Refresh_cw } from './refresh-cw-CRz8nTZu.js';
import { D as Dialog_description } from './dialog-description-R10GNeQ8.js';
import { L as Loader_circle } from './loader-circle-BJifzSLw.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import './create-id-DRrkdd12.js';
import './index-server-_G0R5Qhl.js';
import './index8-BdgpbvMa.js';
import './index2-Da1jJcEh.js';
import './container-api-service-QBCr0kFP.js';
import './api-service-DMPLrOP8.js';
import 'axios';
import './use-id-BSIc2y_F.js';
import './exports-Cv9LZeD1.js';
import 'js-yaml';
import 'thememirror';
import './errors.util-g315AnHn.js';
import './layout-template-C_FDbO2k.js';
import './Icon-DbVCNmsR.js';
import './save-C3QNHVRC.js';
import './x-BTRU5OLu.js';
import './check-CkcwyHfy.js';
import './file-text-C4b752KJ.js';
import './play-_c2l8cZS.js';
import './trash-2-BUIKTnnR.js';
import './circle-stop-CL2cQsOt.js';
import './scroll-lock-C_EWKkAl.js';
import './events-CVA3EDdV.js';
import './noop-BrWcRgZY.js';
import './chevron-down-DOg7W4Qb.js';
import './popper-layer-force-mount-A94KrKTq.js';
import './hidden-input-BsZkZal-.js';

function _page($$payload, $$props) {
  push();
  const stackApi = new StackAPIService();
  let { data } = $$props;
  let { stack, editorState, servicePorts, settings } = data;
  let isLoading = {
    deploying: false,
    stopping: false,
    restarting: false,
    removing: false,
    importing: false,
    redeploying: false,
    destroying: false,
    pulling: false,
    saving: false
  };
  let name = editorState.name;
  let composeContent = editorState.composeContent;
  let envContent = editorState.envContent || "";
  let originalName = editorState.originalName;
  let originalComposeContent = editorState.originalComposeContent;
  let originalEnvContent = editorState.originalEnvContent || "";
  let hasChanges = name !== originalName || composeContent !== originalComposeContent || envContent !== originalEnvContent;
  const baseServerUrl = settings?.baseServerUrl || "localhost";
  let activeSection = "overview";
  let autoScrollStackLogs = true;
  let isStackLogsStreaming = false;
  let stackLogViewer = void 0;
  let deployDialogOpen = false;
  let deploying = false;
  let selectedAgentId = "";
  const onlineAgents = (data.agents || []).filter((agent) => agent.status === "online");
  async function handleSaveChanges() {
    if (!stack || !hasChanges) return;
    const currentStackId = stack.id;
    handleApiResultWithCallbacks({
      result: await tryCatch(stackApi.save(currentStackId, name, composeContent, envContent)),
      message: "Failed to Save Compose Project",
      setLoadingState: (value) => isLoading.saving = value,
      onSuccess: async (updatedStack) => {
        console.log("Compose Project save successful", updatedStack);
        toast.success("Compose Project updated successfully!");
        originalName = updatedStack.name;
        originalComposeContent = composeContent;
        originalEnvContent = envContent;
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (updatedStack && updatedStack.id !== currentStackId) {
          console.log(`Stack ID changed from ${currentStackId} to ${updatedStack.id}. Navigating...`);
          await goto(`/compose/${name}`, {});
        } else {
          await invalidateAll();
        }
      }
    });
  }
  async function handleDeployToAgent() {
    if (!selectedAgentId) {
      toast.error("Please select an agent for deployment");
      return;
    }
    const selectedAgent = onlineAgents.find((agent) => agent.id === selectedAgentId);
    if (!selectedAgent) {
      toast.error("Selected agent not found or offline");
      return;
    }
    if (!data.stack) {
      toast.error("Stack data not available");
      return;
    }
    deploying = true;
    try {
      const response = await fetch(`/api/agents/${selectedAgentId}/deploy/stack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stackName: data.stack.name,
          composeContent: data.stack.composeContent,
          envContent: data.stack.envContent,
          mode: "compose"
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to deploy stack: ${response.statusText}`);
      }
      const result = await response.json();
      toast.success(`Stack "${data.stack?.name || "Unknown"}" deployed to agent ${selectedAgent.hostname}!`);
      deployDialogOpen = false;
      selectedAgentId = "";
    } catch (error) {
      console.error("Deploy error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to deploy stack");
    } finally {
      deploying = false;
    }
  }
  function getHostForService(service) {
    if (!service || !service.networkSettings?.Networks) return baseServerUrl;
    const networks = service.networkSettings.Networks;
    for (const networkName in networks) {
      const network = networks[networkName];
      if (network.Driver === "macvlan" || network.Driver === "ipvlan") {
        if (network.IPAddress) return network.IPAddress;
      }
    }
    return baseServerUrl;
  }
  function getServicePortUrl(service, port, protocol = "http") {
    const host = getHostForService(service);
    if (typeof port === "string") {
      const parts = port.split("/");
      const portNumber = parseInt(parts[0], 10);
      if (parts.length > 1 && parts[1] === "udp") {
        protocol = "udp";
      }
      return `${protocol}://${host}:${portNumber}`;
    }
    if (typeof port === "number") {
      return `${protocol}://${host}:${port}`;
    }
    if (port && typeof port === "object") {
      const portNumber = port.PublicPort || port.PrivatePort || 80;
      if (port.Type) {
        protocol = port.Type.toLowerCase() === "tcp" ? "http" : "https";
      }
      return `${protocol}://${host}:${portNumber}`;
    }
    return `${protocol}://${host}:80`;
  }
  function handleStackLogStart() {
    isStackLogsStreaming = true;
  }
  function handleStackLogStop() {
    isStackLogsStreaming = false;
  }
  function handleStackLogClear() {
  }
  function handleToggleStackAutoScroll() {
  }
  const navigationSections = [
    {
      id: "overview",
      label: "Overview",
      icon: File_stack
    },
    {
      id: "services",
      label: "Services",
      icon: Layers
    },
    {
      id: "config",
      label: "Configuration",
      icon: Settings
    },
    { id: "logs", label: "Logs", icon: Terminal }
  ];
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div class="min-h-screen bg-background">`;
    if (stack) {
      $$payload2.out += "<!--[-->";
      const each_array = ensure_array_like(navigationSections);
      $$payload2.out += `<div class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b"><div class="max-w-full px-4 py-3"><div class="flex items-center justify-between"><div class="flex items-center gap-3">`;
      Button($$payload2, {
        variant: "ghost",
        size: "sm",
        href: "/compose",
        children: ($$payload3) => {
          Arrow_left($$payload3, { class: "size-4 mr-2" });
          $$payload3.out += `<!----> Back`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> <div class="h-4 w-px bg-border"></div> <div class="flex items-center gap-2"><h1 class="text-lg font-semibold truncate max-w-[300px]"${attr("title", stack.name)}>${escape_html(stack.name)}</h1> `;
      if (stack.status) {
        $$payload2.out += "<!--[-->";
        Status_badge($$payload2, {
          variant: statusVariantMap[stack.status.toLowerCase()] || "gray",
          text: capitalizeFirstLetter(stack.status)
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--></div></div> <div class="flex items-center gap-2">`;
      Action_buttons($$payload2, {
        id: stack.id,
        type: "stack",
        itemState: stack.status,
        loading: {
          start: isLoading.deploying,
          stop: isLoading.stopping,
          restart: isLoading.restarting,
          remove: isLoading.removing
        },
        onActionComplete: () => invalidateAll()
      });
      $$payload2.out += `<!----> `;
      if (onlineAgents.length > 0) {
        $$payload2.out += "<!--[-->";
        Button($$payload2, {
          variant: "outline",
          size: "sm",
          onclick: () => deployDialogOpen = true,
          disabled: Object.values(isLoading).some(Boolean),
          children: ($$payload3) => {
            Send($$payload3, { class: "size-4 mr-2" });
            $$payload3.out += `<!----> Deploy to Agent`;
          },
          $$slots: { default: true }
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--></div></div></div></div> `;
      if (data.error) {
        $$payload2.out += "<!--[-->";
        $$payload2.out += `<div class="max-w-full px-4 py-4"><!---->`;
        Alert($$payload2, {
          variant: "destructive",
          children: ($$payload3) => {
            Circle_alert($$payload3, { class: "size-4" });
            $$payload3.out += `<!----> <!---->`;
            Alert_title($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<!---->Error Loading Stack`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> <!---->`;
            Alert_description($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<!---->${escape_html(data.error)}`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!----></div>`;
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--> <div class="flex h-[calc(100vh-64px)]"><div class="w-48 shrink-0 border-r bg-background/50"><div class="sticky top-16 p-3"><nav class="space-y-1"><!--[-->`;
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let section = each_array[$$index];
        const IconComponent = section.icon;
        $$payload2.out += `<button${attr_class(`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${stringify(activeSection === section.id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}`)}><!---->`;
        IconComponent($$payload2, { class: "size-4 shrink-0" });
        $$payload2.out += `<!----> <span class="truncate">${escape_html(section.label)}</span> `;
        if (section.id === "services" && stack.serviceCount) {
          $$payload2.out += "<!--[-->";
          $$payload2.out += `<span class="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">${escape_html(stack.serviceCount)}</span>`;
        } else {
          $$payload2.out += "<!--[!-->";
        }
        $$payload2.out += `<!--]--></button>`;
      }
      $$payload2.out += `<!--]--></nav></div></div> <div class="flex-1 overflow-y-auto"><div class="p-6 max-w-none"><div class="space-y-8"><section id="overview" class="scroll-mt-20"><h2 class="text-xl font-semibold mb-6 flex items-center gap-2">`;
      File_stack($$payload2, { class: "size-5" });
      $$payload2.out += `<!----> Overview</h2> <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"><!---->`;
      Card($$payload2, {
        class: "border",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_content($$payload3, {
            class: "p-6 flex items-center justify-between",
            children: ($$payload4) => {
              $$payload4.out += `<div><p class="text-sm font-medium text-muted-foreground">Services</p> <p class="text-2xl font-bold">${escape_html(stack.serviceCount)}</p></div> <div class="bg-primary/10 p-3 rounded-full">`;
              Layers($$payload4, { class: "text-primary size-5" });
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
        class: "border",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_content($$payload3, {
            class: "p-6 flex items-center justify-between",
            children: ($$payload4) => {
              $$payload4.out += `<div><p class="text-sm font-medium text-muted-foreground">Running</p> <p class="text-2xl font-bold">${escape_html(stack.runningCount)}</p></div> <div class="bg-green-500/10 p-3 rounded-full">`;
              Activity($$payload4, { class: "text-green-500 size-5" });
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
        class: "border",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_content($$payload3, {
            class: "p-6 flex items-center justify-between",
            children: ($$payload4) => {
              $$payload4.out += `<div><p class="text-sm font-medium text-muted-foreground">Created</p> <p class="text-lg font-medium">${escape_html(new Date(stack.createdAt ?? "").toLocaleDateString())}</p></div> <div class="bg-blue-500/10 p-3 rounded-full">`;
              File_stack($$payload4, { class: "text-blue-500 size-5" });
              $$payload4.out += `<!----></div>`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div> `;
      if (servicePorts && Object.keys(servicePorts).length > 0) {
        $$payload2.out += "<!--[-->";
        const allUniquePorts = [
          ...new Set(Object.values(servicePorts).flat())
        ];
        $$payload2.out += `<!---->`;
        Card($$payload2, {
          class: "border",
          children: ($$payload3) => {
            $$payload3.out += `<!---->`;
            Card_header($$payload3, {
              class: "pb-4",
              children: ($$payload4) => {
                $$payload4.out += `<!---->`;
                Card_title($$payload4, {
                  children: ($$payload5) => {
                    $$payload5.out += `<!---->Exposed Ports`;
                  },
                  $$slots: { default: true }
                });
                $$payload4.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> <!---->`;
            Card_content($$payload3, {
              children: ($$payload4) => {
                const each_array_1 = ensure_array_like(allUniquePorts);
                $$payload4.out += `<div class="flex flex-wrap gap-2"><!--[-->`;
                for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                  let port = each_array_1[$$index_1];
                  $$payload4.out += `<a${attr("href", getServicePortUrl(stack, port))} target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-3 py-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-500/20 transition-colors">Port ${escape_html(port)} `;
                  External_link($$payload4, { class: "size-4 ml-2" });
                  $$payload4.out += `<!----></a>`;
                }
                $$payload4.out += `<!--]--></div>`;
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
      $$payload2.out += `<!--]--></section> <section id="services" class="scroll-mt-20"><h2 class="text-xl font-semibold mb-6 flex items-center gap-2">`;
      Layers($$payload2, { class: "size-5" });
      $$payload2.out += `<!----> Services (${escape_html(stack.serviceCount)})</h2> <!---->`;
      Card($$payload2, {
        class: "border",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_content($$payload3, {
            class: "p-6",
            children: ($$payload4) => {
              if (stack.services && stack.services.length > 0) {
                $$payload4.out += "<!--[-->";
                const each_array_2 = ensure_array_like(stack.services);
                $$payload4.out += `<div class="space-y-4"><!--[-->`;
                for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                  let service = each_array_2[$$index_2];
                  const status = service.state?.Status || "unknown";
                  const variant = statusVariantMap[status.toLowerCase()] || "gray";
                  if (service.id) {
                    $$payload4.out += "<!--[-->";
                    $$payload4.out += `<a${attr("href", `/containers/${service.id}`)} class="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"><div class="flex items-center gap-3"><div class="bg-primary/10 p-2 rounded-full">`;
                    Layers($$payload4, { class: "text-primary size-4" });
                    $$payload4.out += `<!----></div> <div><p class="font-medium">${escape_html(service.name)}</p> <p class="text-sm text-muted-foreground">ID: ${escape_html(service.id.substring(0, 12))}</p></div></div> <div class="flex items-center gap-3">`;
                    Status_badge($$payload4, {
                      variant,
                      text: capitalizeFirstLetter(status)
                    });
                    $$payload4.out += `<!----> `;
                    Arrow_right($$payload4, { class: "size-4 text-primary" });
                    $$payload4.out += `<!----></div></a>`;
                  } else {
                    $$payload4.out += "<!--[!-->";
                    $$payload4.out += `<div class="flex items-center justify-between p-4 border rounded-lg bg-muted/20"><div class="flex items-center gap-3"><div class="bg-muted/50 p-2 rounded-full">`;
                    Layers($$payload4, { class: "text-muted-foreground size-4" });
                    $$payload4.out += `<!----></div> <div><p class="font-medium">${escape_html(service.name)}</p> <p class="text-sm text-muted-foreground">Not created</p></div></div> `;
                    Status_badge($$payload4, {
                      variant,
                      text: capitalizeFirstLetter(status)
                    });
                    $$payload4.out += `<!----></div>`;
                  }
                  $$payload4.out += `<!--]-->`;
                }
                $$payload4.out += `<!--]--></div>`;
              } else {
                $$payload4.out += "<!--[!-->";
                $$payload4.out += `<div class="text-center py-12"><div class="mb-4 rounded-full bg-muted/50 flex items-center justify-center mx-auto size-16">`;
                Layers($$payload4, { class: "size-6 text-muted-foreground" });
                $$payload4.out += `<!----></div> <div class="text-muted-foreground">No services found for this stack</div></div>`;
              }
              $$payload4.out += `<!--]-->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></section> <section id="config" class="scroll-mt-20"><div class="flex items-center justify-between mb-6"><h2 class="text-xl font-semibold flex items-center gap-2">`;
      Settings($$payload2, { class: "size-5" });
      $$payload2.out += `<!----> Configuration</h2> `;
      if (hasChanges) {
        $$payload2.out += "<!--[-->";
        Arcane_button($$payload2, {
          action: "save",
          loading: isLoading.saving,
          onClick: handleSaveChanges,
          disabled: !hasChanges,
          label: "Save Changes",
          loadingLabel: "Saving...",
          class: "bg-green-600 hover:bg-green-700 text-white"
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--></div> <!---->`;
      Card($$payload2, {
        class: "border mb-6",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_header($$payload3, {
            class: "pb-4",
            children: ($$payload4) => {
              $$payload4.out += `<!---->`;
              Card_title($$payload4, {
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Stack Settings`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Card_content($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<div class="max-w-md">`;
              Label($$payload4, {
                for: "name",
                class: "mb-2 block",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Stack Name`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                type: "text",
                id: "name",
                name: "name",
                required: true,
                disabled: isLoading.saving || stack?.status === "running" || stack?.status === "partially running",
                get value() {
                  return name;
                },
                set value($$value) {
                  name = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----> `;
              if (stack?.status === "running" || stack?.status === "partially running") {
                $$payload4.out += "<!--[-->";
                $$payload4.out += `<p class="text-sm text-muted-foreground mt-2">Stack name cannot be changed while running. Please stop the stack first.</p>`;
              } else {
                $$payload4.out += "<!--[!-->";
              }
              $$payload4.out += `<!--]--></div>`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> <div class="grid grid-cols-1 lg:grid-cols-3 gap-6"><div class="lg:col-span-2"><!---->`;
      Card($$payload2, {
        class: "border h-full",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_header($$payload3, {
            class: "pb-4 flex-shrink-0",
            children: ($$payload4) => {
              $$payload4.out += `<!---->`;
              Card_title($$payload4, {
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Docker Compose File`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Card_content($$payload3, {
            class: "p-4 flex flex-col h-full",
            children: ($$payload4) => {
              $$payload4.out += `<div class="w-full h-[590px] rounded-md overflow-hidden flex-shrink-0">`;
              Yaml_editor($$payload4, {
                readOnly: isLoading.saving || isLoading.deploying || isLoading.stopping || isLoading.restarting || isLoading.removing,
                get value() {
                  return composeContent;
                },
                set value($$value) {
                  composeContent = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div> <p class="text-sm text-muted-foreground flex-shrink-0">Edit your <span class="font-medium">compose.yaml</span> file directly. Syntax errors will be highlighted.</p>`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div> <div class="lg:col-span-1"><!---->`;
      Card($$payload2, {
        class: "border h-full",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_header($$payload3, {
            class: "pb-4 flex-shrink-0",
            children: ($$payload4) => {
              $$payload4.out += `<!---->`;
              Card_title($$payload4, {
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Environment (.env)`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Card_content($$payload3, {
            class: "p-4 flex flex-col h-full",
            children: ($$payload4) => {
              $$payload4.out += `<div class="w-full h-[590px] rounded-md overflow-hidden flex-shrink-0">`;
              Env_editor($$payload4, {
                readOnly: isLoading.saving || isLoading.deploying || isLoading.stopping || isLoading.restarting || isLoading.removing,
                get value() {
                  return envContent;
                },
                set value($$value) {
                  envContent = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div> <p class="text-sm text-muted-foreground flex-shrink-0">Define environment variables in KEY=value format.</p>`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div></div></section> <section id="logs" class="scroll-mt-20"><div class="flex items-center justify-between mb-6"><h2 class="text-xl font-semibold flex items-center gap-2">`;
      Terminal($$payload2, { class: "size-5" });
      $$payload2.out += `<!----> Stack Logs</h2> <div class="flex items-center gap-3"><label class="flex items-center gap-2"><input type="checkbox"${attr("checked", autoScrollStackLogs, true)} class="size-4"/> Auto-scroll</label> `;
      Button($$payload2, {
        variant: "outline",
        size: "sm",
        onclick: () => stackLogViewer?.clearLogs(),
        children: ($$payload3) => {
          $$payload3.out += `<!---->Clear`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      if (isStackLogsStreaming) {
        $$payload2.out += "<!--[-->";
        $$payload2.out += `<div class="flex items-center gap-2"><div class="size-2 bg-green-500 rounded-full animate-pulse"></div> <span class="text-green-600 text-sm font-medium">Live</span></div> `;
        Button($$payload2, {
          variant: "outline",
          size: "sm",
          onclick: () => stackLogViewer?.stopLogStream(),
          children: ($$payload3) => {
            $$payload3.out += `<!---->Stop`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!---->`;
      } else {
        $$payload2.out += "<!--[!-->";
        Button($$payload2, {
          variant: "outline",
          size: "sm",
          onclick: () => stackLogViewer?.startLogStream(),
          disabled: !stack?.id,
          children: ($$payload3) => {
            $$payload3.out += `<!---->Start`;
          },
          $$slots: { default: true }
        });
      }
      $$payload2.out += `<!--]--> `;
      Button($$payload2, {
        variant: "outline",
        size: "sm",
        onclick: () => {
        },
        children: ($$payload3) => {
          Refresh_cw($$payload3, { class: "size-4" });
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div></div> <!---->`;
      Card($$payload2, {
        class: "border",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_content($$payload3, {
            class: "p-0",
            children: ($$payload4) => {
              LogViewer($$payload4, {
                stackId: stack?.id,
                type: "stack",
                maxLines: 500,
                showTimestamps: true,
                height: "600px",
                onStart: handleStackLogStart,
                onStop: handleStackLogStop,
                onClear: handleStackLogClear,
                onToggleAutoScroll: handleToggleStackAutoScroll,
                get autoScroll() {
                  return autoScrollStackLogs;
                },
                set autoScroll($$value) {
                  autoScrollStackLogs = $$value;
                  $$settled = false;
                }
              });
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></section></div></div></div></div>`;
    } else if (!data.error) {
      $$payload2.out += "<!--[1-->";
      $$payload2.out += `<div class="min-h-screen flex items-center justify-center"><div class="text-center"><div class="rounded-full bg-muted/50 p-6 mb-6 inline-flex">`;
      File_stack($$payload2, { class: "text-muted-foreground size-10" });
      $$payload2.out += `<!----></div> <h2 class="text-2xl font-medium mb-3">Stack Not Found</h2> <p class="text-center text-muted-foreground max-w-md mb-8">Could not load stack data. It may have been removed or the Docker engine is not accessible.</p> `;
      Button($$payload2, {
        variant: "outline",
        href: "/compose",
        children: ($$payload3) => {
          Arrow_left($$payload3, { class: "mr-2 size-4" });
          $$payload3.out += `<!----> Back to Stacks`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div></div>`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--></div> <!---->`;
    Root($$payload2, {
      get open() {
        return deployDialogOpen;
      },
      set open($$value) {
        deployDialogOpen = $$value;
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
                    $$payload6.out += `<!---->Deploy Stack to Agent`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Deploy "${escape_html(data.stack?.name || "Unknown Stack")}" to a remote agent`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <div class="space-y-4 py-4"><div class="space-y-2">`;
            Label($$payload4, {
              for: "agent-select",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Select Agent`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Root$1($$payload4, {
              type: "single",
              disabled: deploying,
              get value() {
                return selectedAgentId;
              },
              set value($$value) {
                selectedAgentId = $$value;
                $$settled = false;
              },
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Select_trigger($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->${escape_html(selectedAgentId)}`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Select_content($$payload5, {
                  children: ($$payload6) => {
                    const each_array_3 = ensure_array_like(onlineAgents);
                    $$payload6.out += `<!--[-->`;
                    for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
                      let agent = each_array_3[$$index_3];
                      $$payload6.out += `<!---->`;
                      Select_item($$payload6, {
                        value: agent.id,
                        children: ($$payload7) => {
                          $$payload7.out += `<div class="flex items-center gap-2"><div class="size-2 rounded-full bg-green-500"></div> <span>${escape_html(agent.hostname)}</span> <span class="text-xs text-muted-foreground">(${escape_html(agent.platform)})</span></div>`;
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
            $$payload4.out += `<!----> <p class="text-xs text-muted-foreground">This will deploy the current stack configuration to the selected agent.</p></div></div> <!---->`;
            Dialog_footer($$payload4, {
              children: ($$payload5) => {
                Button($$payload5, {
                  variant: "outline",
                  onclick: () => deployDialogOpen = false,
                  disabled: deploying,
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Cancel`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> `;
                Button($$payload5, {
                  onclick: handleDeployToAgent,
                  disabled: !selectedAgentId || deploying,
                  children: ($$payload6) => {
                    if (deploying) {
                      $$payload6.out += "<!--[-->";
                      Loader_circle($$payload6, { class: "size-4 mr-2 animate-spin" });
                    } else {
                      $$payload6.out += "<!--[!-->";
                      Send($$payload6, { class: "size-4 mr-2" });
                    }
                    $$payload6.out += `<!--]--> Deploy`;
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
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-5NHsZ7lV.js.map
