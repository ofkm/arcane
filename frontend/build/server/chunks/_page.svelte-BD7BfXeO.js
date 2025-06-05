import { p as push, f as attr, t as escape_html, j as ensure_array_like, o as attr_class, g as stringify, a as pop } from './index3-DI1Ivwzg.js';
import { g as goto, i as invalidateAll } from './client-Cc1XkR80.js';
import { formatDistanceToNow } from 'date-fns';
import { a as toast } from './Toaster.svelte_svelte_type_style_lang-B5vkOu6x.js';
import { g as getActualAgentStatus } from './agent-status.utils-TeMOuzHn.js';
import { o as openConfirmDialog } from './index8-BdgpbvMa.js';
import { h as handleApiResultWithCallbacks } from './api.util-Ci3Q0GvL.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import './button-CUTwDrbo.js';
import { A as Arcane_button } from './arcane-button-DukVn74_.js';
import { R as Refresh_cw } from './refresh-cw-CRz8nTZu.js';
import { M as Monitor } from './monitor-9YUqwWNy.js';
import { C as Container } from './container-CWO-q65_.js';
import { H as Hard_drive } from './hard-drive-DYOg6VMo.js';
import { C as Circle_check_big } from './circle-check-big-Dwoe9JhX.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import './exports-Cv9LZeD1.js';
import './index2-Da1jJcEh.js';
import './index-server-_G0R5Qhl.js';
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
import './loader-circle-BJifzSLw.js';

function _page($$payload, $$props) {
  push();
  let { data } = $$props;
  let agents = data.agents || [];
  let loading = false;
  async function deleteAgent(agentId, hostname) {
    openConfirmDialog({
      title: `Confirm Removal`,
      message: `Are you sure you want to remove this Agent? This action cannot be undone.`,
      confirm: {
        label: "Remove",
        destructive: true,
        action: async () => {
          handleApiResultWithCallbacks({
            result: await tryCatch(fetch(`/api/agents/${agentId}`, { method: "DELETE", credentials: "include" })),
            message: "Failed to Remove Agent",
            onSuccess: async () => {
              toast.success("Agent Removed Successfully");
              await invalidateAll();
            }
          });
        }
      }
    });
  }
  function getStatusColor(agent) {
    const actualStatus = getActualAgentStatus(agent);
    if (actualStatus === "online") return "bg-green-500";
    return "bg-red-500";
  }
  function getStatusText(agent) {
    const actualStatus = getActualAgentStatus(agent);
    if (actualStatus === "online") return "Online";
    return "Offline";
  }
  function viewAgentDetails(agentId) {
    goto();
  }
  $$payload.out += `<div class="container mx-auto px-6 py-8"><div class="flex justify-between items-center mb-8"><div><h1 class="text-3xl font-bold text-gray-900 dark:text-white">Agent Management</h1> <p class="text-gray-600 dark:text-gray-400 mt-1">Manage and monitor your remote agents</p></div> <button class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"${attr("disabled", loading, true)}>`;
  {
    $$payload.out += "<!--[!-->";
    Refresh_cw($$payload, { class: "h-4 w-4" });
  }
  $$payload.out += `<!--]--> ${escape_html("Refresh")}</button></div> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  if (agents.length === 0) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="text-center py-16">`;
    Monitor($$payload, { class: "h-16 w-16 text-gray-400 mx-auto mb-4" });
    $$payload.out += `<!----> <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No agents registered</h3> <p class="text-gray-600 dark:text-gray-400 mb-4">Get started by connecting your first agent</p> <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-w-md mx-auto"><p class="text-sm text-gray-600 dark:text-gray-400">Make sure your Go agent is running and connecting to:</p> <code class="text-sm font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded mt-2 inline-block">http://localhost:3000/agent/register</code></div></div>`;
  } else {
    $$payload.out += "<!--[!-->";
    const each_array = ensure_array_like(agents);
    $$payload.out += `<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"><!--[-->`;
    for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
      let agent = each_array[$$index_1];
      const each_array_1 = ensure_array_like(agent.capabilities);
      $$payload.out += `<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"><div class="flex items-start justify-between mb-4"><div class="flex items-center gap-3"><div class="relative"><div class="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">`;
      Monitor($$payload, {
        class: "h-6 w-6 text-gray-600 dark:text-gray-400"
      });
      $$payload.out += `<!----></div> <div${attr_class(`absolute -top-1 -right-1 w-4 h-4 ${stringify(getStatusColor(agent))} rounded-full border-2 border-white dark:border-gray-800`)}></div></div> <div><h3 class="font-semibold text-gray-900 dark:text-white">${escape_html(agent.hostname)}</h3> <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">${escape_html(agent.id)}</p></div></div> <span${attr_class(`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stringify(getActualAgentStatus(agent) === "online" ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400")}`)}>${escape_html(getStatusText(agent))}</span></div> <div class="space-y-3"><div class="grid grid-cols-2 gap-4 text-sm"><div><span class="text-gray-500 dark:text-gray-400">Platform</span> <p class="font-medium text-gray-900 dark:text-white capitalize">${escape_html(agent.platform)}</p></div> <div><span class="text-gray-500 dark:text-gray-400">Version</span> <p class="font-medium text-gray-900 dark:text-white">${escape_html(agent.version)}</p></div></div> `;
      if (agent.metrics) {
        $$payload.out += "<!--[-->";
        $$payload.out += `<div class="grid grid-cols-2 gap-2 py-3 border-t border-gray-100 dark:border-gray-700"><div class="text-center"><div class="flex items-center justify-center gap-1 mb-1">`;
        Container($$payload, {
          class: "h-3 w-3 text-blue-600 dark:text-blue-400"
        });
        $$payload.out += `<!----> <span class="text-xs text-gray-500 dark:text-gray-400">Containers</span></div> <p class="text-sm font-semibold text-gray-900 dark:text-white">${escape_html(agent.metrics.containerCount ?? 0)}</p></div> <div class="text-center"><div class="flex items-center justify-center gap-1 mb-1">`;
        Hard_drive($$payload, {
          class: "h-3 w-3 text-green-600 dark:text-green-400"
        });
        $$payload.out += `<!----> <span class="text-xs text-gray-500 dark:text-gray-400">Images</span></div> <p class="text-sm font-semibold text-gray-900 dark:text-white">${escape_html(agent.metrics.imageCount ?? 0)}</p></div></div>`;
      } else {
        $$payload.out += "<!--[!-->";
        $$payload.out += `<div class="py-3 border-t border-gray-100 dark:border-gray-700"><p class="text-xs text-gray-400 text-center">No metrics data available</p></div>`;
      }
      $$payload.out += `<!--]--> <div><span class="text-gray-500 dark:text-gray-400 text-sm">Capabilities</span> <div class="flex flex-wrap gap-1 mt-1">`;
      if (each_array_1.length !== 0) {
        $$payload.out += "<!--[-->";
        for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
          let capability = each_array_1[$$index];
          $$payload.out += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">${escape_html(capability)}</span>`;
        }
      } else {
        $$payload.out += "<!--[!-->";
        $$payload.out += `<span class="text-gray-400 dark:text-gray-500 text-sm">None</span>`;
      }
      $$payload.out += `<!--]--></div></div> <div class="pt-3 border-t border-gray-100 dark:border-gray-700"><p class="text-xs text-gray-500 dark:text-gray-400">Last seen: ${escape_html(formatDistanceToNow(new Date(agent.lastSeen)))} ago</p></div></div> `;
      if (getActualAgentStatus(agent) === "online") {
        $$payload.out += "<!--[-->";
        $$payload.out += `<div class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"><div class="flex items-center gap-2">`;
        Circle_check_big($$payload, {
          class: "h-4 w-4 text-green-600 dark:text-green-400"
        });
        $$payload.out += `<!----> <p class="text-sm font-medium text-green-700 dark:text-green-400">Ready to receive commands</p></div></div>`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--> <div class="mt-4 flex gap-2">`;
      Arcane_button($$payload, {
        action: "inspect",
        onClick: () => viewAgentDetails(agent.id),
        label: "View Details",
        class: "flex-1"
      });
      $$payload.out += `<!----> `;
      if (getActualAgentStatus(agent) === "online") {
        $$payload.out += "<!--[-->";
        Arcane_button($$payload, {
          action: "edit",
          onClick: () => viewAgentDetails(agent.id),
          label: "Manage",
          class: "flex-1"
        });
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--> `;
      Arcane_button($$payload, {
        action: "remove",
        onClick: () => deleteAgent(agent.id, agent.hostname),
        label: "Delete",
        loadingLabel: "Deleting...",
        class: "flex-1"
      });
      $$payload.out += `<!----></div></div>`;
    }
    $$payload.out += `<!--]--></div>`;
  }
  $$payload.out += `<!--]--> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div>`;
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-BD7BfXeO.js.map
