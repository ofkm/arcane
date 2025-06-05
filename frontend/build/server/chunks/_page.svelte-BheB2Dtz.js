import { p as push, c as copy_payload, d as assign_payload, a as pop, j as ensure_array_like, f as attr, t as escape_html, o as attr_class, g as stringify, b as spread_props } from './index3-DI1Ivwzg.js';
import { C as Card } from './card-BHGzpLb_.js';
import { C as Card_content, a as Card_header, b as Card_title } from './card-title-Cbe9TU5i.js';
import { B as Button } from './button-CUTwDrbo.js';
import { I as Input } from './input-Bs5Bjqyo.js';
import { L as Label } from './label-DF0BU6VF.js';
import { i as invalidateAll } from './client-Cc1XkR80.js';
import { a as toast } from './Toaster.svelte_svelte_type_style_lang-B5vkOu6x.js';
import { S as Status_badge } from './status-badge-55QtloxC.js';
import { s as statusVariantMap } from './statuses-C3eNtnq-.js';
import { c as capitalizeFirstLetter } from './string.utils-DW_mmI0J.js';
import { Y as Yaml_editor, E as Env_editor } from './env-editor-TVtvVtyb.js';
import { R as Rotate_ccw, A as Arcane_button } from './arcane-button-DukVn74_.js';
import { F as File_stack } from './file-stack-D1dTmoce.js';
import { L as Layers } from './layers-B6y2ShX1.js';
import { S as Settings } from './settings-dVRciV0i.js';
import { A as Arrow_left } from './arrow-left-Na-IoffC.js';
import { P as Play } from './play-_c2l8cZS.js';
import { I as Icon } from './Icon-DbVCNmsR.js';
import { A as Activity } from './activity-BBw87ym0.js';
import { U as Users } from './users-BzqSZjJ1.js';
import { L as Loader_circle } from './loader-circle-BJifzSLw.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import './create-id-DRrkdd12.js';
import './index-server-_G0R5Qhl.js';
import './exports-Cv9LZeD1.js';
import './index2-Da1jJcEh.js';
import 'js-yaml';
import 'thememirror';
import './layout-template-C_FDbO2k.js';
import './save-C3QNHVRC.js';
import './x-BTRU5OLu.js';
import './check-CkcwyHfy.js';
import './file-text-C4b752KJ.js';
import './trash-2-BUIKTnnR.js';
import './circle-stop-CL2cQsOt.js';

function Square($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "rect",
      {
        "width": "18",
        "height": "18",
        "x": "3",
        "y": "3",
        "rx": "2"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "square" },
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
  let { agent, stack, composeName } = data;
  let name = composeName;
  let composeContent = stack.composeContent || "";
  let envContent = stack.envContent || "";
  let originalName = composeName;
  let originalComposeContent = stack.composeContent || "";
  let originalEnvContent = stack.envContent || "";
  let isLoading = {
    deploying: false,
    stopping: false,
    restarting: false,
    saving: false
  };
  let hasChanges = name !== originalName || composeContent !== originalComposeContent || envContent !== originalEnvContent;
  let activeSection = "overview";
  async function handleSaveChanges() {
    if (!hasChanges) return;
    isLoading.saving = true;
    try {
      const response = await fetch(`/api/agents/${agent.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "stack_update",
          payload: {
            project_name: composeName,
            compose_content: composeContent,
            env_content: envContent
          }
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save stack");
      }
      toast.success("Stack updated successfully!");
      originalComposeContent = composeContent;
      originalEnvContent = envContent;
      await invalidateAll();
    } catch (error) {
      console.error("Failed to save stack:", error);
      toast.error(`Failed to save stack: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      isLoading.saving = false;
    }
  }
  async function handleStackAction(action) {
    const actionKey = action === "up" ? "deploying" : action === "down" ? "stopping" : "restarting";
    isLoading[actionKey] = true;
    try {
      let taskType;
      switch (action) {
        case "up":
          taskType = "compose_up";
          break;
        case "down":
          taskType = "compose_down";
          break;
        case "restart":
          taskType = "compose_restart";
          break;
      }
      const response = await fetch(`/api/agents/${agent.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: taskType,
          payload: { project_name: composeName }
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} stack`);
      }
      toast.success(`Stack ${action === "up" ? "started" : action === "down" ? "stopped" : "restarted"} successfully`);
      await invalidateAll();
    } catch (error) {
      console.error(`Failed to ${action} stack:`, error);
      toast.error(`Failed to ${action} stack: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      isLoading[actionKey] = false;
    }
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
    }
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
      $$payload2.out += `<!----> <div class="h-4 w-px bg-border"></div> <div class="flex items-center gap-2"><h1 class="text-lg font-semibold truncate max-w-[300px]"${attr("title", stack.name)}>${escape_html(stack.name)}</h1> <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">${escape_html(agent.hostname)}</span> `;
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
      Button($$payload2, {
        variant: "outline",
        size: "sm",
        onclick: () => handleStackAction("up"),
        disabled: Object.values(isLoading).some(Boolean) || stack.status === "running",
        children: ($$payload3) => {
          if (isLoading.deploying) {
            $$payload3.out += "<!--[-->";
            Loader_circle($$payload3, { class: "size-4 mr-2 animate-spin" });
          } else {
            $$payload3.out += "<!--[!-->";
            Play($$payload3, { class: "size-4 mr-2" });
          }
          $$payload3.out += `<!--]--> Start`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      Button($$payload2, {
        variant: "outline",
        size: "sm",
        onclick: () => handleStackAction("restart"),
        disabled: Object.values(isLoading).some(Boolean),
        children: ($$payload3) => {
          if (isLoading.restarting) {
            $$payload3.out += "<!--[-->";
            Loader_circle($$payload3, { class: "size-4 mr-2 animate-spin" });
          } else {
            $$payload3.out += "<!--[!-->";
            Rotate_ccw($$payload3, { class: "size-4 mr-2" });
          }
          $$payload3.out += `<!--]--> Restart`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      Button($$payload2, {
        variant: "outline",
        size: "sm",
        onclick: () => handleStackAction("down"),
        disabled: Object.values(isLoading).some(Boolean) || stack.status !== "running",
        children: ($$payload3) => {
          if (isLoading.stopping) {
            $$payload3.out += "<!--[-->";
            Loader_circle($$payload3, { class: "size-4 mr-2 animate-spin" });
          } else {
            $$payload3.out += "<!--[!-->";
            Square($$payload3, { class: "size-4 mr-2" });
          }
          $$payload3.out += `<!--]--> Stop`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div></div></div></div> <div class="flex h-[calc(100vh-64px)]"><div class="w-48 shrink-0 border-r bg-background/50"><div class="sticky top-16 p-3"><nav class="space-y-1"><!--[-->`;
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
      $$payload2.out += `<!----> Overview <span class="text-sm font-normal text-muted-foreground">(Remote Agent)</span></h2> <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"><!---->`;
      Card($$payload2, {
        class: "border",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_content($$payload3, {
            class: "p-6 flex items-center justify-between",
            children: ($$payload4) => {
              $$payload4.out += `<div><p class="text-sm font-medium text-muted-foreground">Services</p> <p class="text-2xl font-bold">${escape_html(stack.serviceCount || 0)}</p></div> <div class="bg-primary/10 p-3 rounded-full">`;
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
              $$payload4.out += `<div><p class="text-sm font-medium text-muted-foreground">Running</p> <p class="text-2xl font-bold">${escape_html(stack.runningCount || 0)}</p></div> <div class="bg-green-500/10 p-3 rounded-full">`;
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
              $$payload4.out += `<div><p class="text-sm font-medium text-muted-foreground">Agent</p> <p class="text-lg font-medium">${escape_html(agent.hostname)}</p></div> <div class="bg-blue-500/10 p-3 rounded-full">`;
              Users($$payload4, { class: "text-blue-500 size-5" });
              $$payload4.out += `<!----></div>`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div></section> <section id="services" class="scroll-mt-20"><h2 class="text-xl font-semibold mb-6 flex items-center gap-2">`;
      Layers($$payload2, { class: "size-5" });
      $$payload2.out += `<!----> Services (${escape_html(stack.serviceCount || 0)})</h2> <!---->`;
      Card($$payload2, {
        class: "border",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_content($$payload3, {
            class: "p-6",
            children: ($$payload4) => {
              if (stack.services && stack.services.length > 0) {
                $$payload4.out += "<!--[-->";
                const each_array_1 = ensure_array_like(stack.services);
                $$payload4.out += `<div class="space-y-4"><!--[-->`;
                for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                  let service = each_array_1[$$index_1];
                  const status = service.state?.Status || "unknown";
                  const variant = statusVariantMap[status.toLowerCase()] || "gray";
                  $$payload4.out += `<div class="flex items-center justify-between p-4 border rounded-lg bg-muted/20"><div class="flex items-center gap-3"><div class="bg-muted/50 p-2 rounded-full">`;
                  Layers($$payload4, { class: "text-muted-foreground size-4" });
                  $$payload4.out += `<!----></div> <div><p class="font-medium">${escape_html(service.name)}</p> <p class="text-sm text-muted-foreground">Remote service</p></div></div> `;
                  Status_badge($$payload4, {
                    variant,
                    text: capitalizeFirstLetter(status)
                  });
                  $$payload4.out += `<!----></div>`;
                }
                $$payload4.out += `<!--]--></div>`;
              } else {
                $$payload4.out += "<!--[!-->";
                $$payload4.out += `<div class="text-center py-12"><div class="mb-4 rounded-full bg-muted/50 flex items-center justify-center mx-auto size-16">`;
                Layers($$payload4, { class: "size-6 text-muted-foreground" });
                $$payload4.out += `<!----></div> <div class="text-muted-foreground">No services defined in this stack</div></div>`;
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
      $$payload2.out += `<!----> Configuration <span class="text-sm font-normal text-muted-foreground">(Remote)</span></h2> `;
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
                disabled: true,
                get value() {
                  return name;
                },
                set value($$value) {
                  name = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----> <p class="text-sm text-muted-foreground mt-2">Agent stack names cannot be changed from the web interface.</p></div>`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> <div class="grid grid-cols-1 xl:grid-cols-3 gap-6"><div class="xl:col-span-2"><!---->`;
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
            children: ($$payload4) => {
              $$payload4.out += `<div class="border rounded-lg overflow-hidden h-[600px]">`;
              Yaml_editor($$payload4, {
                readOnly: Object.values(isLoading).some(Boolean),
                get value() {
                  return composeContent;
                },
                set value($$value) {
                  composeContent = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div> <p class="text-sm text-muted-foreground mt-2">Edit your <span class="font-medium">compose.yaml</span> file directly. Changes will be applied to the remote agent.</p>`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div> <div><!---->`;
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
            children: ($$payload4) => {
              $$payload4.out += `<div class="border rounded-lg overflow-hidden h-[600px]">`;
              Env_editor($$payload4, {
                readOnly: Object.values(isLoading).some(Boolean),
                get value() {
                  return envContent;
                },
                set value($$value) {
                  envContent = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div> <p class="text-sm text-muted-foreground mt-2">Define environment variables in KEY=value format. Variables will be applied on the remote agent.</p>`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div></div></section></div></div></div></div>`;
    } else {
      $$payload2.out += "<!--[!-->";
      $$payload2.out += `<div class="min-h-screen flex items-center justify-center"><div class="text-center"><div class="rounded-full bg-muted/50 p-6 mb-6 inline-flex">`;
      File_stack($$payload2, { class: "text-muted-foreground size-10" });
      $$payload2.out += `<!----></div> <h2 class="text-2xl font-medium mb-3">Stack Not Found</h2> <p class="text-center text-muted-foreground max-w-md mb-8">Could not load agent stack data. The stack may not exist on the agent or the agent may be offline.</p> `;
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
    }
    $$payload2.out += `<!--]--></div>`;
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
//# sourceMappingURL=_page.svelte-BheB2Dtz.js.map
