import { p as push, e as bind_props, a as pop, q as attr_style, g as stringify, t as escape_html, j as ensure_array_like, o as attr_class, f as attr } from './index3-DI1Ivwzg.js';
import { o as openConfirmDialog } from './index8-BdgpbvMa.js';
import { i as invalidateAll, g as goto } from './client-Cc1XkR80.js';
import { a as toast } from './Toaster.svelte_svelte_type_style_lang-B5vkOu6x.js';
import { C as ContainerAPIService } from './container-api-service-QBCr0kFP.js';
import { S as StackAPIService } from './stack-api-service-Dn9dYXBV.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import { h as handleApiResultWithCallbacks } from './api.util-Ci3Q0GvL.js';
import { A as Arcane_button } from './arcane-button-DukVn74_.js';
import { o as onDestroy } from './use-id-BSIc2y_F.js';

function Action_buttons($$payload, $$props) {
  push();
  const containerApi = new ContainerAPIService();
  const stackApi = new StackAPIService();
  let {
    id,
    type = "container",
    itemState = "stopped",
    loading = {},
    onActionComplete = () => {
    }
  } = $$props;
  let isLoading = {
    start: false,
    stop: false,
    restart: false,
    remove: false,
    pulling: false,
    redeploy: false,
    validating: false
  };
  const isRunning = itemState === "running" || type === "stack" && itemState === "partially running";
  function confirmAction(action) {
    if (action === "remove") {
      openConfirmDialog({
        title: `Confirm ${type === "stack" ? "Destroy" : "Removal"}`,
        message: `Are you sure you want to ${type === "stack" ? "destroy" : "remove"} this ${type}? This action is DESTRUCTIVE and cannot be undone.`,
        confirm: {
          label: type === "stack" ? "Destroy" : "Remove",
          destructive: true,
          action: async (checkboxStates) => {
            console.log("Debug - received checkbox states:", checkboxStates);
            const removeFiles = checkboxStates["removeFiles"] === true;
            const removeVolumes = checkboxStates["removeVolumes"] === true;
            console.log("Debug - removeFiles:", removeFiles, "removeVolumes:", removeVolumes);
            isLoading.remove = true;
            handleApiResultWithCallbacks({
              result: await tryCatch(type === "container" ? containerApi.remove(id) : stackApi.destroy(id, removeVolumes, removeFiles)),
              message: `Failed to ${type === "stack" ? "Destroy" : "Remove"} ${type}`,
              setLoadingState: (value) => isLoading.remove = value,
              onSuccess: async () => {
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ${type === "stack" ? "Destroyed" : "Removed"} Successfully`);
                await invalidateAll();
                goto();
              }
            });
          }
        },
        checkboxes: [
          {
            id: "removeFiles",
            label: "Remove stack files",
            initialState: false
          },
          {
            id: "removeVolumes",
            label: "Remove volumes (Warning: Data will be lost)",
            initialState: false
          }
        ]
      });
    } else if (action === "redeploy") {
      openConfirmDialog({
        title: `Confirm Redeploy`,
        message: `Are you sure you want to redeploy this stack? This will STOP, PULL, and START the Stack.`,
        confirm: {
          label: "Redeploy",
          action: async () => {
            isLoading.redeploy = true;
            handleApiResultWithCallbacks({
              result: await tryCatch(stackApi.redeploy(id)),
              message: `Failed to Redeploy ${type}`,
              setLoadingState: (value) => isLoading.redeploy = value,
              onSuccess: async () => {
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Redeployed Successfully`);
                await invalidateAll();
              }
            });
          }
        }
      });
    }
  }
  async function handleStart() {
    isLoading.start = true;
    handleApiResultWithCallbacks({
      result: await tryCatch(type === "container" ? containerApi.start(id) : stackApi.deploy(id)),
      message: `Failed to Start ${type}`,
      setLoadingState: (value) => isLoading.start = value,
      onSuccess: async () => {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Started Successfully`);
        await invalidateAll();
      }
    });
  }
  async function handleDeploy() {
    isLoading.start = true;
    handleApiResultWithCallbacks({
      result: await tryCatch(stackApi.validate(id)),
      message: `Failed to Validate stack`,
      setLoadingState: (value) => isLoading.validating = value,
      onSuccess: async () => {
        handleApiResultWithCallbacks({
          result: await tryCatch(stackApi.deploy(id)),
          message: `Failed to Start ${type}`,
          setLoadingState: (value) => isLoading.start = value,
          onSuccess: async () => {
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Started Successfully`);
            await invalidateAll();
          }
        });
      }
    });
  }
  async function handleStop() {
    isLoading.stop = true;
    handleApiResultWithCallbacks({
      result: await tryCatch(type === "container" ? containerApi.stop(id) : stackApi.down(id)),
      message: `Failed to Stop ${type}`,
      setLoadingState: (value) => isLoading.stop = value,
      onSuccess: async () => {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Stopped Successfully`);
        await invalidateAll();
      }
    });
  }
  async function handleRestart() {
    isLoading.restart = true;
    handleApiResultWithCallbacks({
      result: await tryCatch(type === "container" ? containerApi.restart(id) : stackApi.restart(id)),
      message: `Failed to Restart ${type}`,
      setLoadingState: (value) => isLoading.restart = value,
      onSuccess: async () => {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Restarted Successfully`);
        await invalidateAll();
      }
    });
  }
  async function handlePull() {
    isLoading.pulling = true;
    handleApiResultWithCallbacks({
      result: await tryCatch(type === "container" ? containerApi.pull(id) : stackApi.pull(id)),
      message: "Failed to Pull Image(s)",
      setLoadingState: (value) => isLoading.pulling = value,
      onSuccess: async () => {
        toast.success("Image(s) Pulled Successfully.");
        await invalidateAll();
      }
    });
  }
  $$payload.out += `<div class="flex items-center gap-2">`;
  if (!isRunning) {
    $$payload.out += "<!--[-->";
    Arcane_button($$payload, {
      action: type === "container" ? "start" : "deploy",
      onClick: type === "container" ? () => handleStart() : () => handleDeploy(),
      loading: isLoading.start
    });
  } else {
    $$payload.out += "<!--[!-->";
    Arcane_button($$payload, {
      label: type === "stack" ? "Down" : "Stop",
      action: "stop",
      onClick: () => handleStop(),
      loading: isLoading.stop
    });
    $$payload.out += `<!----> `;
    Arcane_button($$payload, {
      action: "restart",
      onClick: () => handleRestart(),
      loading: isLoading.restart
    });
    $$payload.out += `<!---->`;
  }
  $$payload.out += `<!--]--> `;
  if (type === "container") {
    $$payload.out += "<!--[-->";
    Arcane_button($$payload, {
      action: "remove",
      onClick: () => confirmAction("remove"),
      loading: isLoading.remove
    });
  } else {
    $$payload.out += "<!--[!-->";
    Arcane_button($$payload, {
      action: "redeploy",
      onClick: () => confirmAction("redeploy"),
      loading: isLoading.redeploy
    });
    $$payload.out += `<!----> `;
    Arcane_button($$payload, {
      action: "pull",
      onClick: handlePull,
      loading: isLoading.pulling
    });
    $$payload.out += `<!----> `;
    Arcane_button($$payload, {
      label: type === "stack" ? "Destroy" : "Remove",
      action: "remove",
      onClick: () => confirmAction("remove"),
      loading: isLoading.remove
    });
    $$payload.out += `<!---->`;
  }
  $$payload.out += `<!--]--></div>`;
  bind_props($$props, { onActionComplete });
  pop();
}
function LogViewer($$payload, $$props) {
  push();
  let {
    containerId = null,
    stackId = null,
    type = "container",
    maxLines = 1e3,
    autoScroll = true,
    showTimestamps = true,
    height = "400px",
    onClear,
    onToggleAutoScroll,
    onStart,
    onStop
  } = $$props;
  let logs = [];
  let isStreaming = false;
  function startLogStream() {
    return;
  }
  function stopLogStream() {
    isStreaming = false;
    onStop?.();
  }
  function clearLogs() {
    logs = [];
    onClear?.();
  }
  function toggleAutoScroll() {
    autoScroll = !autoScroll;
    onToggleAutoScroll?.();
  }
  function getIsStreaming() {
    return isStreaming;
  }
  function getLogCount() {
    return logs.length;
  }
  function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }
  function getLevelClass(level) {
    switch (level) {
      case "stderr":
      case "error":
        return "text-red-400";
      case "stdout":
      case "info":
        return "text-green-400";
      default:
        return "text-gray-300";
    }
  }
  onDestroy(() => {
    stopLogStream();
  });
  $$payload.out += `<div class="log-viewer bg-black text-white border rounded-md svelte-un0ae8">`;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <div class="log-viewer overflow-y-auto font-mono text-sm bg-black text-white border rounded-lg svelte-un0ae8"${attr_style(`height: ${stringify(height)}`)}>`;
  if (logs.length === 0) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="p-4 text-center text-gray-500">`;
    if (!containerId) {
      $$payload.out += "<!--[-->";
      $$payload.out += `No ${escape_html(type)} selected`;
    } else if (!isStreaming) {
      $$payload.out += "<!--[1-->";
      $$payload.out += `No logs available. Start streaming to see logs.`;
    } else {
      $$payload.out += "<!--[!-->";
      $$payload.out += `Waiting for logs...`;
    }
    $$payload.out += `<!--]--></div>`;
  } else {
    $$payload.out += "<!--[!-->";
    const each_array = ensure_array_like(logs);
    $$payload.out += `<!--[-->`;
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let log = each_array[$$index];
      $$payload.out += `<div class="flex px-3 py-1 hover:bg-gray-900/50 border-l-2 border-transparent hover:border-blue-500 transition-colors">`;
      if (showTimestamps) {
        $$payload.out += "<!--[-->";
        $$payload.out += `<span class="text-gray-500 text-xs mr-3 shrink-0 w-20">${escape_html(formatTimestamp(log.timestamp))}</span>`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--> <span${attr_class(`text-xs mr-2 shrink-0 w-12 ${stringify(getLevelClass(log.level))}`, "svelte-un0ae8")}>${escape_html(log.level.toUpperCase())}</span> `;
      if (type === "stack" && log.service) {
        $$payload.out += "<!--[-->";
        $$payload.out += `<span class="text-blue-400 text-xs mr-2 shrink-0 w-16 truncate"${attr("title", log.service)}>${escape_html(log.service)}</span>`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--> <span class="text-gray-300 whitespace-pre-wrap break-all">${escape_html(log.message)}</span></div>`;
    }
    $$payload.out += `<!--]-->`;
  }
  $$payload.out += `<!--]--></div></div>`;
  bind_props($$props, {
    autoScroll,
    startLogStream,
    stopLogStream,
    clearLogs,
    toggleAutoScroll,
    getIsStreaming,
    getLogCount
  });
  pop();
}

export { Action_buttons as A, LogViewer as L };
//# sourceMappingURL=LogViewer-ClItUTq5.js.map
