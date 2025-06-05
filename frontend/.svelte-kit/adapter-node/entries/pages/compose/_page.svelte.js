import { p as push, j as spread_props, a as pop, k as escape_html, b as attr, n as stringify } from "../../../chunks/index3.js";
import { C as Card } from "../../../chunks/card.js";
import { C as Card_content, a as Card_header, b as Card_title } from "../../../chunks/card-title.js";
import "clsx";
import { B as Button } from "../../../chunks/button.js";
import { U as Universal_table, T as Table_cell, E as Ellipsis } from "../../../chunks/universal-table.js";
import { o as openConfirmDialog } from "../../../chunks/index8.js";
import { R as Root, T as Trigger, D as Dropdown_menu_content, G as Group } from "../../../chunks/index10.js";
import { A as Alert } from "../../../chunks/alert.js";
import { A as Alert_title, a as Alert_description } from "../../../chunks/alert-title.js";
import { g as goto, i as invalidateAll } from "../../../chunks/client.js";
import { S as Status_badge } from "../../../chunks/status-badge.js";
import { c as capitalizeFirstLetter } from "../../../chunks/string.utils.js";
import { s as statusVariantMap } from "../../../chunks/statuses.js";
import { a as toast } from "../../../chunks/Toaster.svelte_svelte_type_style_lang.js";
import { t as tryCatch } from "../../../chunks/try-catch.js";
import { S as StackAPIService } from "../../../chunks/stack-api-service.js";
import { h as handleApiResultWithCallbacks } from "../../../chunks/api.util.js";
import { A as Arcane_button, R as Rotate_ccw } from "../../../chunks/arcane-button.js";
import { t as tablePersistence } from "../../../chunks/table-store.js";
import { C as Circle_alert } from "../../../chunks/circle-alert.js";
import { F as File_stack } from "../../../chunks/file-stack.js";
import { L as Layers } from "../../../chunks/layers.js";
import { L as Loader_circle } from "../../../chunks/loader-circle.js";
import { D as Dropdown_menu_item } from "../../../chunks/dropdown-menu-item.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { P as Play } from "../../../chunks/play.js";
import { C as Circle_stop } from "../../../chunks/circle-stop.js";
import { D as Dropdown_menu_separator } from "../../../chunks/dropdown-menu-separator.js";
import { T as Trash_2 } from "../../../chunks/trash-2.js";
function Pen($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "pen" },
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
function Square_mouse_pointer($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"
      }
    ],
    [
      "path",
      {
        "d": "M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "square-mouse-pointer" },
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
function formatFriendlyDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}
function _page($$payload, $$props) {
  push();
  let { data } = $$props;
  let stacks = data.stacks;
  let agents = data.agents || [];
  let loadingAgentStacks = false;
  const isLoading = {
    start: false,
    stop: false,
    restart: false,
    remove: false,
    import: false,
    redeploy: false,
    destroy: false,
    pull: false,
    migrate: false
  };
  const isAnyLoading = Object.values(isLoading).some((loading) => loading);
  const stackApi = new StackAPIService();
  const allStacks = stacks;
  const totalStacks = allStacks?.length || 0;
  const runningStacks = allStacks?.filter((s) => s.status === "running").length || 0;
  const partialStacks = allStacks?.filter((s) => s.status === "partially running").length || 0;
  let isRemoteActionLoading = null;
  async function performStackAction(action, id) {
    isLoading[action] = true;
    if (action === "start") {
      handleApiResultWithCallbacks({
        result: await tryCatch(stackApi.deploy(id)),
        message: "Failed to Start Stack",
        setLoadingState: (value) => isLoading.start = value,
        onSuccess: async () => {
          toast.success("Stack Started Successfully.");
          await invalidateAll();
        }
      });
    } else if (action === "stop") {
      handleApiResultWithCallbacks({
        result: await tryCatch(stackApi.down(id)),
        message: "Failed to Stop Stack",
        setLoadingState: (value) => isLoading.stop = value,
        onSuccess: async () => {
          toast.success("Stack Stopped Successfully.");
          await invalidateAll();
        }
      });
    } else if (action === "restart") {
      handleApiResultWithCallbacks({
        result: await tryCatch(stackApi.restart(id)),
        message: "Failed to Restart Stack",
        setLoadingState: (value) => isLoading.restart = value,
        onSuccess: async () => {
          toast.success("Stack Restarted Successfully.");
          await invalidateAll();
        }
      });
    } else if (action === "redeploy") {
      handleApiResultWithCallbacks({
        result: await tryCatch(stackApi.redeploy(id)),
        message: "Failed to Redeploy Stack",
        setLoadingState: (value) => isLoading.redeploy = value,
        onSuccess: async () => {
          toast.success("Stack redeployed successfully.");
          await invalidateAll();
        }
      });
    } else if (action === "pull") {
      handleApiResultWithCallbacks({
        result: await tryCatch(stackApi.pull(id)),
        message: "Failed to pull Stack",
        setLoadingState: (value) => isLoading.pull = value,
        onSuccess: async () => {
          toast.success("Stack Pulled successfully.");
          await invalidateAll();
        }
      });
    } else if (action === "destroy") {
      openConfirmDialog({
        title: `Confirm Removal`,
        message: `Are you sure you want to remove this Stack? This action cannot be undone.`,
        confirm: {
          label: "Remove",
          destructive: true,
          action: async () => {
            handleApiResultWithCallbacks({
              result: await tryCatch(stackApi.destroy(id)),
              message: "Failed to Remove Stack",
              setLoadingState: (value) => isLoading.destroy = value,
              onSuccess: async () => {
                toast.success("Stack Removed Successfully");
                await invalidateAll();
              }
            });
          }
        }
      });
    } else if (action === "migrate") {
      handleApiResultWithCallbacks({
        result: await tryCatch(stackApi.migrate(id)),
        message: "Failed to Migrate Stack",
        setLoadingState: (value) => isLoading.migrate = value,
        onSuccess: async () => {
          toast.success("Stack Migrated Successfully.");
          await invalidateAll();
        }
      });
    } else {
      console.error("An Unknown Error Occurred");
      toast.error("An Unknown Error Occurred");
    }
  }
  async function handleImportStack(id, name) {
    isLoading["import"] = true;
    const result = await tryCatch(stackApi.import(id, name));
    if (result.error) {
      console.error(`Failed to import Stack ${id}:`, result.error);
      toast.error(`Failed to import Stack: ${result.error.message}`);
      isLoading["import"] = false;
      return;
    }
    toast.success("Stack Imported successfully.");
    await invalidateAll();
    isLoading["import"] = false;
  }
  async function handleRemoveRemoteStack(agentId, stackName) {
    openConfirmDialog({
      title: `Confirm Stack Removal`,
      message: `Are you sure you want to remove the stack "${stackName}" from agent "${agentId}"? This action cannot be undone.`,
      confirm: {
        label: "Remove",
        destructive: true,
        action: async () => {
          isRemoteActionLoading = `${agentId}:${stackName}:remove`;
          try {
            const response = await fetch(`/api/agents/${agentId}/tasks`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "stack_destroy",
                payload: { project_name: stackName }
              })
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to remove stack");
            }
            toast.success(`Stack ${stackName} destroyed successfully`);
            await invalidateAll();
          } catch (error) {
            console.error(`Failed to remove remote stack:`, error);
            toast.error(`Failed to remove stack: ${error instanceof Error ? error.message : "Unknown error"}`);
          } finally {
            isRemoteActionLoading = null;
          }
        }
      }
    });
  }
  async function loadAgentStacks() {
    if (agents.length === 0) return;
    loadingAgentStacks = true;
    try {
      const agentStackPromises = agents.map(async (agent) => {
        try {
          const response = await fetch(`/api/agents/${agent.id}/stacks`);
          if (!response.ok) throw new Error(`Failed to fetch stacks from ${agent.hostname}`);
          const data2 = await response.json();
          return (data2.stacks || []).map((stack) => ({
            ...stack,
            agentId: agent.id,
            agentHostname: agent.hostname,
            isRemote: true,
            id: `${agent.id}:${stack.Name || stack.id}`,
            name: stack.Name || stack.name,
            status: stack.Status?.toLowerCase() || "unknown",
            serviceCount: stack.ServiceCount || 0,
            source: "Remote",
            createdAt: stack.CreatedAt || (/* @__PURE__ */ new Date()).toISOString()
          }));
        } catch (error) {
          console.error(`Failed to load stacks from agent ${agent.hostname}:`, error);
          return [];
        }
      });
      await invalidateAll();
      toast.success("Remote stacks refreshed");
    } catch (error) {
      console.error("Failed to load agent stacks:", error);
      toast.error("Failed to load some remote stacks");
    } finally {
      loadingAgentStacks = false;
    }
  }
  async function handleRemoteStackAction(agentId, stackName, action) {
    const actionId = `${agentId}:${stackName}:${action}`;
    isRemoteActionLoading = actionId;
    try {
      let taskType;
      let payload;
      switch (action) {
        case "up":
          taskType = "compose_up";
          payload = { project_name: stackName };
          break;
        case "down":
          taskType = "compose_down";
          payload = { project_name: stackName };
          break;
        case "restart":
          taskType = "compose_restart";
          payload = { project_name: stackName };
          break;
        case "remove":
          taskType = "compose_remove";
          payload = { project_name: stackName };
          break;
        case "pull":
          taskType = "compose_pull";
          payload = { project_name: stackName };
          break;
      }
      const response = await fetch(`/api/agents/${agentId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: taskType, payload })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} stack`);
      }
      const result = await response.json();
      const taskId = result.task?.id;
      if (!taskId) {
        throw new Error("No task ID returned from agent");
      }
      const pollTask = async (taskId2) => {
        const maxAttempts = 30;
        const delay = 1e3;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          try {
            const taskResponse = await fetch(`/api/agents/${agentId}/tasks/${taskId2}`);
            if (!taskResponse.ok) continue;
            const taskData = await taskResponse.json();
            const taskStatus = taskData.task?.status;
            if (taskStatus === "completed") {
              return true;
            } else if (taskStatus === "failed") {
              throw new Error(taskData.task?.error || "Task failed");
            }
          } catch (pollError) {
            console.warn(`Polling attempt ${i + 1} failed:`, pollError);
          }
        }
        throw new Error("Task polling timed out");
      };
      await pollTask(taskId);
      if (action === "pull") {
        toast.success(`Images pulled for ${stackName}`);
        const upResponse = await fetch(`/api/agents/${agentId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "compose_up",
            payload: { project_name: stackName }
          })
        });
        if (upResponse.ok) {
          const upResult = await upResponse.json();
          if (upResult.task?.id) {
            await pollTask(upResult.task.id);
          }
        }
        toast.success(`Stack ${stackName} redeployed with new images`);
      } else if (action === "remove") {
        toast.success(`Compose Project ${stackName} destroyed successfully`);
      } else {
        toast.success(`Compose Project ${stackName} ${action === "up" ? "started" : action === "down" ? "stopped" : "restarted"} successfully`);
      }
      await invalidateAll();
    } catch (error) {
      console.error(`Failed to ${action} remote Compose Project:`, error);
      toast.error(`Failed to ${action} stack: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      isRemoteActionLoading = null;
    }
  }
  $$payload.out += `<div class="space-y-6"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><h1 class="text-3xl font-bold tracking-tight">Compose Projects</h1> <p class="text-sm text-muted-foreground mt-1">View and Manage Compose Projects</p></div></div> `;
  if (data.error) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<!---->`;
    Alert($$payload, {
      variant: "destructive",
      children: ($$payload2) => {
        Circle_alert($$payload2, { class: "size-4" });
        $$payload2.out += `<!----> <!---->`;
        Alert_title($$payload2, {
          children: ($$payload3) => {
            $$payload3.out += `<!---->Error Loading Compose Projects`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!----> <!---->`;
        Alert_description($$payload2, {
          children: ($$payload3) => {
            $$payload3.out += `<!---->${escape_html(data.error)}`;
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
  $$payload.out += `<!--]--> <div class="grid grid-cols-1 sm:grid-cols-3 gap-4"><!---->`;
  Card($$payload, {
    children: ($$payload2) => {
      $$payload2.out += `<!---->`;
      Card_content($$payload2, {
        class: "p-4 flex items-center justify-between",
        children: ($$payload3) => {
          $$payload3.out += `<div><p class="text-sm font-medium text-muted-foreground">Total Compose Projects</p> <p class="text-2xl font-bold">${escape_html(totalStacks)}</p></div> <div class="bg-primary/10 p-2 rounded-full">`;
          File_stack($$payload3, { class: "text-primary size-5" });
          $$payload3.out += `<!----></div>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----> <!---->`;
  Card($$payload, {
    children: ($$payload2) => {
      $$payload2.out += `<!---->`;
      Card_content($$payload2, {
        class: "p-4 flex items-center justify-between",
        children: ($$payload3) => {
          $$payload3.out += `<div><p class="text-sm font-medium text-muted-foreground">Running</p> <p class="text-2xl font-bold">${escape_html(runningStacks)}</p></div> <div class="bg-green-500/10 p-2 rounded-full">`;
          Layers($$payload3, { class: "text-green-500 size-5" });
          $$payload3.out += `<!----></div>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----> <!---->`;
  Card($$payload, {
    children: ($$payload2) => {
      $$payload2.out += `<!---->`;
      Card_content($$payload2, {
        class: "p-4 flex items-center justify-between",
        children: ($$payload3) => {
          $$payload3.out += `<div><p class="text-sm font-medium text-muted-foreground">Partially Running</p> <p class="text-2xl font-bold">${escape_html(partialStacks)}</p></div> <div class="bg-amber-500/10 p-2 rounded-full">`;
          Layers($$payload3, { class: "text-amber-500 size-5" });
          $$payload3.out += `<!----></div>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----></div> <!---->`;
  Card($$payload, {
    class: "border shadow-sm",
    children: ($$payload2) => {
      $$payload2.out += `<!---->`;
      Card_header($$payload2, {
        class: "px-6",
        children: ($$payload3) => {
          $$payload3.out += `<div class="flex items-center justify-between"><div><!---->`;
          Card_title($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->Compose Projects List`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> `;
          if (loadingAgentStacks) {
            $$payload3.out += "<!--[-->";
            $$payload3.out += `<p class="text-sm text-muted-foreground">Loading remote compose projects...</p>`;
          } else {
            $$payload3.out += "<!--[!-->";
          }
          $$payload3.out += `<!--]--></div> <div class="flex items-center gap-2">`;
          if (agents.length > 0) {
            $$payload3.out += "<!--[-->";
            Button($$payload3, {
              variant: "outline",
              size: "sm",
              onclick: loadAgentStacks,
              disabled: loadingAgentStacks,
              children: ($$payload4) => {
                if (loadingAgentStacks) {
                  $$payload4.out += "<!--[-->";
                  Loader_circle($$payload4, { class: "size-4 animate-spin mr-2" });
                } else {
                  $$payload4.out += "<!--[!-->";
                }
                $$payload4.out += `<!--]--> Refresh Remote`;
              },
              $$slots: { default: true }
            });
          } else {
            $$payload3.out += "<!--[!-->";
          }
          $$payload3.out += `<!--]--> `;
          Arcane_button($$payload3, {
            action: "create",
            customLabel: "Create Compose Project",
            onClick: () => goto()
          });
          $$payload3.out += `<!----></div></div>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> <!---->`;
      Card_content($$payload2, {
        children: ($$payload3) => {
          if (allStacks && allStacks.length > 0) {
            $$payload3.out += "<!--[-->";
            {
              let rows = function($$payload4, { item }) {
                const stateVariant = item.status ? statusVariantMap[item.status.toLowerCase()] : "gray";
                $$payload4.out += `<!---->`;
                Table_cell($$payload4, {
                  children: ($$payload5) => {
                    if (item.isExternal) {
                      $$payload5.out += "<!--[-->";
                      $$payload5.out += `<div class="flex items-center gap-2">${escape_html(item.name)}</div>`;
                    } else {
                      $$payload5.out += "<!--[!-->";
                      $$payload5.out += `<div class="flex items-center gap-2">`;
                      if (item.isRemote) {
                        $$payload5.out += "<!--[-->";
                        $$payload5.out += `<a class="font-medium hover:underline"${attr("href", `/compose/agent/${stringify(item.agentId)}/${stringify(item.name)}`)}>${escape_html(item.name)}</a> <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">On ${escape_html(item.agentId)}</span>`;
                      } else {
                        $$payload5.out += "<!--[!-->";
                        $$payload5.out += `<a class="font-medium hover:underline"${attr("href", `/compose/${stringify(item.id)}/`)}>${escape_html(item.name)}</a>`;
                      }
                      $$payload5.out += `<!--]--> `;
                      if (item.isLegacy) {
                        $$payload5.out += "<!--[-->";
                        $$payload5.out += `<span title="This stack uses the legacy layout. Migrate to the new layout from the dropdown menu." class="ml-1 flex items-center" style="filter: drop-shadow(0 0 4px #fbbf24);">`;
                        Circle_alert($$payload5, { class: "text-amber-400 animate-pulse size-4" });
                        $$payload5.out += `<!----></span>`;
                      } else {
                        $$payload5.out += "<!--[!-->";
                      }
                      $$payload5.out += `<!--]--></div>`;
                    }
                    $$payload5.out += `<!--]-->`;
                  },
                  $$slots: { default: true }
                });
                $$payload4.out += `<!----> <!---->`;
                Table_cell($$payload4, {
                  children: ($$payload5) => {
                    $$payload5.out += `<!---->${escape_html(item.serviceCount)}`;
                  },
                  $$slots: { default: true }
                });
                $$payload4.out += `<!----> <!---->`;
                Table_cell($$payload4, {
                  children: ($$payload5) => {
                    Status_badge($$payload5, {
                      variant: stateVariant,
                      text: capitalizeFirstLetter(item.status)
                    });
                  },
                  $$slots: { default: true }
                });
                $$payload4.out += `<!----> <!---->`;
                Table_cell($$payload4, {
                  children: ($$payload5) => {
                    Status_badge($$payload5, {
                      variant: item.isExternal ? "amber" : item.isRemote ? "blue" : "green",
                      text: item.isExternal ? "External" : item.isRemote ? "Remote" : "Managed"
                    });
                  },
                  $$slots: { default: true }
                });
                $$payload4.out += `<!----> <!---->`;
                Table_cell($$payload4, {
                  children: ($$payload5) => {
                    $$payload5.out += `<!---->${escape_html(formatFriendlyDate(item.createdAt || ""))}`;
                  },
                  $$slots: { default: true }
                });
                $$payload4.out += `<!----> <!---->`;
                Table_cell($$payload4, {
                  children: ($$payload5) => {
                    if (item.isExternal) {
                      $$payload5.out += "<!--[-->";
                      Arcane_button($$payload5, {
                        action: "pull",
                        customLabel: "Import",
                        onClick: () => handleImportStack(item.id, item.name),
                        loading: isLoading.import,
                        disabled: isLoading.import
                      });
                    } else if (item.isRemote) {
                      $$payload5.out += "<!--[1-->";
                      $$payload5.out += `<!---->`;
                      Root($$payload5, {
                        children: ($$payload6) => {
                          $$payload6.out += `<!---->`;
                          {
                            let child = function($$payload7, { props }) {
                              Button($$payload7, spread_props([
                                props,
                                {
                                  variant: "ghost",
                                  size: "icon",
                                  class: "relative size-8 p-0",
                                  children: ($$payload8) => {
                                    $$payload8.out += `<span class="sr-only">Open menu</span> `;
                                    Ellipsis($$payload8, {});
                                    $$payload8.out += `<!---->`;
                                  },
                                  $$slots: { default: true }
                                }
                              ]));
                            };
                            Trigger($$payload6, { child, $$slots: { child: true } });
                          }
                          $$payload6.out += `<!----> <!---->`;
                          Dropdown_menu_content($$payload6, {
                            align: "end",
                            children: ($$payload7) => {
                              $$payload7.out += `<!---->`;
                              Group($$payload7, {
                                children: ($$payload8) => {
                                  $$payload8.out += `<!---->`;
                                  Dropdown_menu_item($$payload8, {
                                    onclick: () => goto(`/compose/agent/${item.agentId}/${item.name}`),
                                    disabled: !!isRemoteActionLoading,
                                    children: ($$payload9) => {
                                      Pen($$payload9, { class: "size-4" });
                                      $$payload9.out += `<!----> Edit`;
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$payload8.out += `<!----> `;
                                  if (item.status !== "running") {
                                    $$payload8.out += "<!--[-->";
                                    $$payload8.out += `<!---->`;
                                    Dropdown_menu_item($$payload8, {
                                      onclick: () => handleRemoteStackAction(item.agentId || "", item.name, "up"),
                                      disabled: !!isRemoteActionLoading,
                                      children: ($$payload9) => {
                                        if (isRemoteActionLoading === `${item.agentId}:${item.name}:up`) {
                                          $$payload9.out += "<!--[-->";
                                          Loader_circle($$payload9, { class: "animate-spin size-4" });
                                        } else {
                                          $$payload9.out += "<!--[!-->";
                                          Play($$payload9, { class: "size-4" });
                                        }
                                        $$payload9.out += `<!--]--> Start`;
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$payload8.out += `<!---->`;
                                  } else {
                                    $$payload8.out += "<!--[!-->";
                                    $$payload8.out += `<!---->`;
                                    Dropdown_menu_item($$payload8, {
                                      onclick: () => handleRemoteStackAction(item.agentId || "", item.name, "restart"),
                                      disabled: !!isRemoteActionLoading,
                                      children: ($$payload9) => {
                                        if (isRemoteActionLoading === `${item.agentId}:${item.name}:restart`) {
                                          $$payload9.out += "<!--[-->";
                                          Loader_circle($$payload9, { class: "animate-spin size-4" });
                                        } else {
                                          $$payload9.out += "<!--[!-->";
                                          Rotate_ccw($$payload9, { class: "size-4" });
                                        }
                                        $$payload9.out += `<!--]--> Restart`;
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$payload8.out += `<!----> <!---->`;
                                    Dropdown_menu_item($$payload8, {
                                      onclick: () => handleRemoteStackAction(item.agentId || "", item.name, "down"),
                                      disabled: !!isRemoteActionLoading,
                                      children: ($$payload9) => {
                                        if (isRemoteActionLoading === `${item.agentId}:${item.name}:down`) {
                                          $$payload9.out += "<!--[-->";
                                          Loader_circle($$payload9, { class: "animate-spin size-4" });
                                        } else {
                                          $$payload9.out += "<!--[!-->";
                                          Circle_stop($$payload9, { class: "size-4" });
                                        }
                                        $$payload9.out += `<!--]--> Stop`;
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$payload8.out += `<!---->`;
                                  }
                                  $$payload8.out += `<!--]--> <!---->`;
                                  Dropdown_menu_item($$payload8, {
                                    onclick: () => handleRemoteStackAction(item.agentId || "", item.name, "pull"),
                                    disabled: !!isRemoteActionLoading,
                                    children: ($$payload9) => {
                                      if (isRemoteActionLoading === `${item.agentId}:${item.name}:pull`) {
                                        $$payload9.out += "<!--[-->";
                                        Loader_circle($$payload9, { class: "animate-spin size-4" });
                                      } else {
                                        $$payload9.out += "<!--[!-->";
                                        Rotate_ccw($$payload9, { class: "size-4" });
                                      }
                                      $$payload9.out += `<!--]--> Pull &amp; Redeploy`;
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$payload8.out += `<!----> <!---->`;
                                  Dropdown_menu_separator($$payload8, {});
                                  $$payload8.out += `<!----> <!---->`;
                                  Dropdown_menu_item($$payload8, {
                                    class: "text-red-500 focus:text-red-700!",
                                    onclick: () => handleRemoveRemoteStack(item.agentId || "", item.name),
                                    disabled: !!isRemoteActionLoading,
                                    children: ($$payload9) => {
                                      if (isRemoteActionLoading) {
                                        $$payload9.out += "<!--[-->";
                                        Loader_circle($$payload9, { class: "animate-spin size-4" });
                                      } else {
                                        $$payload9.out += "<!--[!-->";
                                        Trash_2($$payload9, { class: "size-4" });
                                      }
                                      $$payload9.out += `<!--]--> Remove`;
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$payload8.out += `<!----> <!---->`;
                                  Dropdown_menu_separator($$payload8, {});
                                  $$payload8.out += `<!----> <!---->`;
                                  Dropdown_menu_item($$payload8, {
                                    onclick: () => goto(`/agents/${item.agentId}`),
                                    children: ($$payload9) => {
                                      Square_mouse_pointer($$payload9, { class: "size-4" });
                                      $$payload9.out += `<!----> View Agent`;
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
                    } else {
                      $$payload5.out += "<!--[!-->";
                      $$payload5.out += `<!---->`;
                      Root($$payload5, {
                        children: ($$payload6) => {
                          $$payload6.out += `<!---->`;
                          {
                            let child = function($$payload7, { props }) {
                              Button($$payload7, spread_props([
                                props,
                                {
                                  variant: "ghost",
                                  size: "icon",
                                  class: "relative size-8 p-0",
                                  children: ($$payload8) => {
                                    $$payload8.out += `<span class="sr-only">Open menu</span> `;
                                    Ellipsis($$payload8, {});
                                    $$payload8.out += `<!---->`;
                                  },
                                  $$slots: { default: true }
                                }
                              ]));
                            };
                            Trigger($$payload6, { child, $$slots: { child: true } });
                          }
                          $$payload6.out += `<!----> <!---->`;
                          Dropdown_menu_content($$payload6, {
                            align: "end",
                            children: ($$payload7) => {
                              $$payload7.out += `<!---->`;
                              Group($$payload7, {
                                children: ($$payload8) => {
                                  $$payload8.out += `<!---->`;
                                  Dropdown_menu_item($$payload8, {
                                    onclick: () => goto(`/compose/${item.id}`),
                                    disabled: isAnyLoading,
                                    children: ($$payload9) => {
                                      Pen($$payload9, { class: "size-4" });
                                      $$payload9.out += `<!----> Edit`;
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$payload8.out += `<!----> `;
                                  if (item.status !== "running") {
                                    $$payload8.out += "<!--[-->";
                                    $$payload8.out += `<!---->`;
                                    Dropdown_menu_item($$payload8, {
                                      onclick: () => performStackAction("start", item.id),
                                      disabled: isLoading.start || isAnyLoading,
                                      children: ($$payload9) => {
                                        if (isLoading.start) {
                                          $$payload9.out += "<!--[-->";
                                          Loader_circle($$payload9, { class: "animate-spin size-4" });
                                        } else {
                                          $$payload9.out += "<!--[!-->";
                                          Play($$payload9, { class: "size-4" });
                                        }
                                        $$payload9.out += `<!--]--> Start`;
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$payload8.out += `<!---->`;
                                  } else {
                                    $$payload8.out += "<!--[!-->";
                                    $$payload8.out += `<!---->`;
                                    Dropdown_menu_item($$payload8, {
                                      onclick: () => performStackAction("restart", item.id),
                                      disabled: isLoading.restart || isAnyLoading,
                                      children: ($$payload9) => {
                                        if (isLoading.restart) {
                                          $$payload9.out += "<!--[-->";
                                          Loader_circle($$payload9, { class: "animate-spin size-4" });
                                        } else {
                                          $$payload9.out += "<!--[!-->";
                                          Rotate_ccw($$payload9, { class: "size-4" });
                                        }
                                        $$payload9.out += `<!--]--> Restart`;
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$payload8.out += `<!----> <!---->`;
                                    Dropdown_menu_item($$payload8, {
                                      onclick: () => performStackAction("stop", item.id),
                                      disabled: isLoading.stop || isAnyLoading,
                                      children: ($$payload9) => {
                                        if (isLoading.stop) {
                                          $$payload9.out += "<!--[-->";
                                          Loader_circle($$payload9, { class: "animate-spin size-4" });
                                        } else {
                                          $$payload9.out += "<!--[!-->";
                                          Circle_stop($$payload9, { class: "size-4" });
                                        }
                                        $$payload9.out += `<!--]--> Stop`;
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$payload8.out += `<!---->`;
                                  }
                                  $$payload8.out += `<!--]--> `;
                                  if (item.isLegacy) {
                                    $$payload8.out += "<!--[-->";
                                    $$payload8.out += `<!---->`;
                                    Dropdown_menu_item($$payload8, {
                                      onclick: () => performStackAction("migrate", item.id),
                                      class: "text-amber-600 hover:text-amber-800 flex items-center",
                                      children: ($$payload9) => {
                                        $$payload9.out += `<span title="This stack uses the legacy layout. Migrate to the new layout." class="mr-2 flex items-center">`;
                                        Circle_alert($$payload9, { class: "text-amber-500 size-4" });
                                        $$payload9.out += `<!----></span> Migrate`;
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$payload8.out += `<!---->`;
                                  } else {
                                    $$payload8.out += "<!--[!-->";
                                  }
                                  $$payload8.out += `<!--]--> <!---->`;
                                  Dropdown_menu_separator($$payload8, {});
                                  $$payload8.out += `<!----> <!---->`;
                                  Dropdown_menu_item($$payload8, {
                                    class: "text-red-500 focus:text-red-700!",
                                    onclick: () => performStackAction("destroy", item.id),
                                    disabled: isLoading.remove || isAnyLoading,
                                    children: ($$payload9) => {
                                      if (isLoading.remove) {
                                        $$payload9.out += "<!--[-->";
                                        Loader_circle($$payload9, { class: "animate-spin size-4" });
                                      } else {
                                        $$payload9.out += "<!--[!-->";
                                        Trash_2($$payload9, { class: "size-4" });
                                      }
                                      $$payload9.out += `<!--]--> Destroy`;
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
                    }
                    $$payload5.out += `<!--]-->`;
                  },
                  $$slots: { default: true }
                });
                $$payload4.out += `<!---->`;
              };
              Universal_table($$payload3, {
                data: allStacks,
                columns: [
                  { accessorKey: "name", header: "Name" },
                  {
                    accessorKey: "serviceCount",
                    header: "Services"
                  },
                  { accessorKey: "status", header: "Status" },
                  { accessorKey: "source", header: "Source" },
                  { accessorKey: "createdAt", header: "Created" },
                  {
                    accessorKey: "actions",
                    header: " ",
                    enableSorting: false
                  }
                ],
                features: { selection: false },
                pagination: {
                  pageSize: tablePersistence.getPageSize("stacks")
                },
                onPageSizeChange: (newSize) => {
                  tablePersistence.setPageSize("stacks", newSize);
                },
                sort: { defaultSort: { id: "name", desc: false } },
                display: {
                  filterPlaceholder: "Search compose projects...",
                  noResultsMessage: "No stacks found"
                },
                rows,
                $$slots: { rows: true }
              });
            }
          } else if (!data.error) {
            $$payload3.out += "<!--[1-->";
            $$payload3.out += `<div class="flex flex-col items-center justify-center py-12 px-6 text-center">`;
            File_stack($$payload3, {
              class: "text-muted-foreground mb-4 opacity-40 size-12"
            });
            $$payload3.out += `<!----> <p class="text-lg font-medium">No stacks found</p> <p class="text-sm text-muted-foreground mt-1 max-w-md">Create a new stack using the "Create Stack" button above or import an existing compose file</p> <div class="flex gap-3 mt-4">`;
            Arcane_button($$payload3, {
              action: "create",
              customLabel: "Create Stack",
              onClick: () => goto(),
              size: "sm"
            });
            $$payload3.out += `<!----></div></div>`;
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
  $$payload.out += `<!----></div>`;
  pop();
}
export {
  _page as default
};
