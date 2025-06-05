import { u as copy_payload, v as assign_payload, a as pop, p as push, l as ensure_array_like, b as attr, k as escape_html, d as attr_class, n as stringify } from "../../../../chunks/index3.js";
import { C as Card } from "../../../../chunks/card.js";
import { a as Card_header, b as Card_title, C as Card_content } from "../../../../chunks/card-title.js";
import "clsx";
import { B as Button } from "../../../../chunks/button.js";
import { i as invalidateAll } from "../../../../chunks/client.js";
import { B as Badge } from "../../../../chunks/badge.js";
import { A as Action_buttons, L as LogViewer } from "../../../../chunks/LogViewer.js";
import { f as formatDate } from "../../../../chunks/string.utils.js";
import { f as formatBytes } from "../../../../chunks/bytes.util.js";
import { S as Status_badge } from "../../../../chunks/status-badge.js";
import { o as onDestroy } from "../../../../chunks/use-id.js";
import { M as Meter_1 } from "../../../../chunks/meter.js";
import { H as Hard_drive } from "../../../../chunks/hard-drive.js";
import { A as Activity } from "../../../../chunks/activity.js";
import { F as File_text } from "../../../../chunks/file-text.js";
import { S as Settings } from "../../../../chunks/settings.js";
import { N as Network } from "../../../../chunks/network.js";
import { D as Database } from "../../../../chunks/database.js";
import { A as Arrow_left } from "../../../../chunks/arrow-left.js";
import { R as Refresh_cw } from "../../../../chunks/refresh-cw.js";
import { C as Clock } from "../../../../chunks/clock.js";
import { T as Terminal } from "../../../../chunks/terminal.js";
import { C as Circle_alert } from "../../../../chunks/circle-alert.js";
function _page($$payload, $$props) {
  push();
  function ensureNetworkConfig(config) {
    return config;
  }
  let { data } = $$props;
  let { container, stats } = data;
  let starting = false;
  let stopping = false;
  let restarting = false;
  let removing = false;
  let isRefreshing = false;
  let activeSection = "overview";
  let autoScrollLogs = true;
  let isStreaming = false;
  let logViewer = void 0;
  const cleanContainerName = (name) => {
    if (!name) return "Container Details";
    return name.replace(/^\/+/, "");
  };
  const containerDisplayName = cleanContainerName(container?.Name);
  onDestroy(() => {
  });
  const calculateCPUPercent = (statsData) => {
    if (!statsData || !statsData.cpu_stats || !statsData.precpu_stats) {
      return 0;
    }
    const cpuDelta = statsData.cpu_stats.cpu_usage.total_usage - (statsData.precpu_stats.cpu_usage?.total_usage || 0);
    const systemDelta = statsData.cpu_stats.system_cpu_usage - (statsData.precpu_stats.system_cpu_usage || 0);
    const numberCPUs = statsData.cpu_stats.online_cpus || statsData.cpu_stats.cpu_usage?.percpu_usage?.length || 1;
    if (systemDelta > 0 && cpuDelta > 0) {
      const cpuPercent = cpuDelta / systemDelta * numberCPUs * 100;
      return Math.min(Math.max(cpuPercent, 0), 100 * numberCPUs);
    }
    return 0;
  };
  const cpuUsagePercent = calculateCPUPercent(stats);
  const memoryUsageBytes = stats?.memory_stats?.usage || 0;
  const memoryLimitBytes = stats?.memory_stats?.limit || 0;
  const memoryUsageFormatted = formatBytes(memoryUsageBytes);
  const memoryLimitFormatted = formatBytes(memoryLimitBytes);
  const memoryUsagePercent = memoryLimitBytes > 0 ? memoryUsageBytes / memoryLimitBytes * 100 : 0;
  const getPrimaryIpAddress = (networkSettings) => {
    if (!networkSettings) return "N/A";
    if (networkSettings.IPAddress) {
      return networkSettings.IPAddress;
    }
    if (networkSettings.Networks) {
      for (const networkName in networkSettings.Networks) {
        const network = networkSettings.Networks[networkName];
        if (network?.IPAddress) {
          return network.IPAddress;
        }
      }
    }
    return "N/A";
  };
  const primaryIpAddress = getPrimaryIpAddress(container?.NetworkSettings);
  async function refreshData() {
    isRefreshing = true;
    await invalidateAll();
    setTimeout(
      () => {
        isRefreshing = false;
      },
      500
    );
  }
  function handleLogStart() {
    isStreaming = true;
  }
  function handleLogStop() {
    isStreaming = false;
  }
  function handleLogClear() {
  }
  function handleToggleAutoScroll() {
  }
  const navigationSections = [
    {
      id: "overview",
      label: "Overview",
      icon: Hard_drive
    },
    {
      id: "stats",
      label: "Metrics",
      icon: Activity
    },
    { id: "logs", label: "Logs", icon: File_text },
    {
      id: "config",
      label: "Configuration",
      icon: Settings
    },
    {
      id: "network",
      label: "Networks",
      icon: Network
    },
    {
      id: "storage",
      label: "Storage",
      icon: Database
    }
  ];
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div class="min-h-screen bg-background">`;
    if (container) {
      $$payload2.out += "<!--[-->";
      const each_array = ensure_array_like(navigationSections);
      $$payload2.out += `<div class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b"><div class="max-w-full px-4 py-3"><div class="flex items-center justify-between"><div class="flex items-center gap-3">`;
      Button($$payload2, {
        variant: "ghost",
        size: "sm",
        href: "/containers",
        children: ($$payload3) => {
          Arrow_left($$payload3, { class: "size-4 mr-2" });
          $$payload3.out += `<!----> Back`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> <div class="h-4 w-px bg-border"></div> <div class="flex items-center gap-2"><h1 class="text-lg font-semibold truncate max-w-[300px]"${attr("title", containerDisplayName)}>${escape_html(containerDisplayName)}</h1> `;
      if (container?.State) {
        $$payload2.out += "<!--[-->";
        Status_badge($$payload2, {
          variant: container.State.Status === "running" ? "green" : container.State.Status === "exited" ? "red" : "amber",
          text: container.State.Status
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--></div></div> <div class="flex items-center gap-2">`;
      Button($$payload2, {
        variant: "ghost",
        size: "sm",
        onclick: refreshData,
        disabled: isRefreshing,
        children: ($$payload3) => {
          Refresh_cw($$payload3, {
            class: `size-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`
          });
          $$payload3.out += `<!----> Refresh`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      if (container) {
        $$payload2.out += "<!--[-->";
        Action_buttons($$payload2, {
          id: container.Id,
          type: "container",
          itemState: container.State?.Running ? "running" : "stopped",
          loading: {
            start: starting,
            stop: stopping,
            restart: restarting,
            remove: removing
          }
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--></div></div></div></div> <div class="flex h-[calc(100vh-64px)]"><div class="w-48 shrink-0 border-r bg-background/50"><div class="sticky top-16 p-3"><nav class="space-y-1"><!--[-->`;
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let section = each_array[$$index];
        const IconComponent = section.icon;
        $$payload2.out += `<button${attr_class(`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${stringify(activeSection === section.id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}`)}><!---->`;
        IconComponent($$payload2, { class: "size-4 shrink-0" });
        $$payload2.out += `<!----> <span class="truncate">${escape_html(section.label)}</span></button>`;
      }
      $$payload2.out += `<!--]--></nav></div></div> <div class="flex-1 overflow-y-auto"><div class="p-6 max-w-none"><div class="space-y-8"><section id="overview" class="scroll-mt-20"><h2 class="text-xl font-semibold mb-6 flex items-center gap-2">`;
      Hard_drive($$payload2, { class: "size-5" });
      $$payload2.out += `<!----> Overview</h2> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"><!---->`;
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
                  $$payload5.out += `<!---->Container Details`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Card_content($$payload3, {
            class: "space-y-4",
            children: ($$payload4) => {
              $$payload4.out += `<div class="flex items-center gap-3"><div class="bg-blue-50 dark:bg-blue-950/20 p-2 rounded">`;
              Hard_drive($$payload4, { class: "size-4 text-blue-600" });
              $$payload4.out += `<!----></div> <div class="min-w-0 flex-1"><div class="text-sm text-muted-foreground">Image</div> <div class="font-medium truncate"${attr("title", container.Config?.Image)}>${escape_html(container.Config?.Image || "N/A")}</div></div></div> <div class="flex items-center gap-3"><div class="bg-green-50 dark:bg-green-950/20 p-2 rounded">`;
              Clock($$payload4, { class: "size-4 text-green-600" });
              $$payload4.out += `<!----></div> <div class="min-w-0 flex-1"><div class="text-sm text-muted-foreground">Created</div> <div class="font-medium"${attr("title", formatDate(container.Created))}>${escape_html(formatDate(container.Created))}</div></div></div> <div class="flex items-center gap-3"><div class="bg-purple-50 dark:bg-purple-950/20 p-2 rounded">`;
              Network($$payload4, { class: "size-4 text-purple-600" });
              $$payload4.out += `<!----></div> <div class="min-w-0 flex-1"><div class="text-sm text-muted-foreground">IP Address</div> <div class="font-medium">${escape_html(primaryIpAddress)}</div></div></div> <div class="flex items-center gap-3"><div class="bg-amber-50 dark:bg-amber-950/20 p-2 rounded">`;
              Terminal($$payload4, { class: "size-4 text-amber-600" });
              $$payload4.out += `<!----></div> <div class="min-w-0 flex-1"><div class="text-sm text-muted-foreground">Command</div> <div class="font-medium truncate"${attr("title", container.Config?.Cmd?.join(" "))}>${escape_html(container.Config?.Cmd?.join(" ") || "N/A")}</div></div></div>`;
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
          Card_header($$payload3, {
            class: "pb-4",
            children: ($$payload4) => {
              $$payload4.out += `<!---->`;
              Card_title($$payload4, {
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Quick Stats`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Card_content($$payload3, {
            class: "space-y-6",
            children: ($$payload4) => {
              if (stats && container.State?.Running) {
                $$payload4.out += "<!--[-->";
                Meter_1($$payload4, {
                  label: "CPU Usage",
                  valueLabel: `${stringify(cpuUsagePercent.toFixed(1))}%`,
                  value: cpuUsagePercent,
                  max: 100,
                  variant: cpuUsagePercent > 80 ? "destructive" : cpuUsagePercent > 60 ? "warning" : "default"
                });
                $$payload4.out += `<!----> `;
                Meter_1($$payload4, {
                  label: "Memory Usage",
                  valueLabel: `${stringify(memoryUsageFormatted)} / ${stringify(memoryLimitFormatted)}`,
                  value: memoryUsagePercent,
                  max: 100,
                  variant: memoryUsagePercent > 80 ? "destructive" : memoryUsagePercent > 60 ? "warning" : "default"
                });
                $$payload4.out += `<!---->`;
              } else {
                $$payload4.out += "<!--[!-->";
                $$payload4.out += `<div class="text-muted-foreground text-center py-8">${escape_html(container.State?.Running ? "Loading stats..." : "Container not running")}</div>`;
              }
              $$payload4.out += `<!--]-->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div> <!---->`;
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
                  $$payload5.out += `<!---->System Information`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Card_content($$payload3, {
            class: "space-y-4",
            children: ($$payload4) => {
              $$payload4.out += `<div><div class="text-sm text-muted-foreground mb-2">Container ID</div> <div class="font-mono bg-muted/50 p-3 rounded text-sm break-all">${escape_html(container.Id)}</div></div> `;
              if (container.Config?.WorkingDir) {
                $$payload4.out += "<!--[-->";
                $$payload4.out += `<div><div class="text-sm text-muted-foreground mb-2">Working Directory</div> <div class="font-mono bg-muted/50 p-3 rounded break-all">${escape_html(container.Config.WorkingDir)}</div></div>`;
              } else {
                $$payload4.out += "<!--[!-->";
              }
              $$payload4.out += `<!--]--> `;
              if (container.Config?.User) {
                $$payload4.out += "<!--[-->";
                $$payload4.out += `<div><div class="text-sm text-muted-foreground mb-2">User</div> <div class="font-mono bg-muted/50 p-3 rounded">${escape_html(container.Config.User)}</div></div>`;
              } else {
                $$payload4.out += "<!--[!-->";
              }
              $$payload4.out += `<!--]--> `;
              if (container.State?.Health) {
                $$payload4.out += "<!--[-->";
                $$payload4.out += `<div><div class="text-sm text-muted-foreground mb-2">Health Status</div> <div class="flex items-center gap-3">`;
                Status_badge($$payload4, {
                  variant: container.State.Health.Status === "healthy" ? "green" : container.State.Health.Status === "unhealthy" ? "red" : "amber",
                  text: container.State.Health.Status
                });
                $$payload4.out += `<!----> `;
                if (container.State.Health.Log && container.State.Health.Log.length > 0) {
                  $$payload4.out += "<!--[-->";
                  $$payload4.out += `<span class="text-sm text-muted-foreground">Last check: ${escape_html(new Date(container.State.Health.Log[0].Start).toLocaleString())}</span>`;
                } else {
                  $$payload4.out += "<!--[!-->";
                }
                $$payload4.out += `<!--]--></div></div>`;
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
      $$payload2.out += `<!----></section> <section id="stats" class="scroll-mt-20"><h2 class="text-xl font-semibold mb-6 flex items-center gap-2">`;
      Activity($$payload2, { class: "size-5" });
      $$payload2.out += `<!----> Resource Metrics</h2> <!---->`;
      Card($$payload2, {
        class: "border",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_content($$payload3, {
            class: "p-6",
            children: ($$payload4) => {
              if (stats && container.State?.Running) {
                $$payload4.out += "<!--[-->";
                $$payload4.out += `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-6">`;
                Meter_1($$payload4, {
                  label: "CPU Usage",
                  valueLabel: `${stringify(cpuUsagePercent.toFixed(2))}%`,
                  value: cpuUsagePercent,
                  max: 100,
                  variant: cpuUsagePercent > 80 ? "destructive" : cpuUsagePercent > 60 ? "warning" : "default",
                  size: "lg"
                });
                $$payload4.out += `<!----> `;
                Meter_1($$payload4, {
                  label: "Memory Usage",
                  valueLabel: `${stringify(memoryUsageFormatted)} / ${stringify(memoryLimitFormatted)} (${stringify(memoryUsagePercent.toFixed(1))}%)`,
                  value: memoryUsagePercent,
                  max: 100,
                  variant: memoryUsagePercent > 80 ? "destructive" : memoryUsagePercent > 60 ? "warning" : "default",
                  size: "lg"
                });
                $$payload4.out += `<!----></div> <div class="space-y-6"><div><h4 class="font-medium mb-4 flex items-center gap-2">`;
                Network($$payload4, { class: "size-4" });
                $$payload4.out += `<!----> Network I/O</h4> <div class="grid grid-cols-2 gap-4"><div class="bg-muted/30 p-4 rounded"><div class="text-sm text-muted-foreground">Received</div> <div class="font-medium mt-1">${escape_html(formatBytes(stats.networks?.eth0?.rx_bytes || 0))}</div></div> <div class="bg-muted/30 p-4 rounded"><div class="text-sm text-muted-foreground">Transmitted</div> <div class="font-medium mt-1">${escape_html(formatBytes(stats.networks?.eth0?.tx_bytes || 0))}</div></div></div></div> `;
                if (stats.blkio_stats && stats.blkio_stats.io_service_bytes_recursive && stats.blkio_stats.io_service_bytes_recursive.length > 0) {
                  $$payload4.out += "<!--[-->";
                  $$payload4.out += `<div><h4 class="font-medium mb-4">Block I/O</h4> <div class="grid grid-cols-2 gap-4"><div class="bg-muted/30 p-4 rounded"><div class="text-sm text-muted-foreground">Read</div> <div class="font-medium mt-1">${escape_html(formatBytes(stats.blkio_stats.io_service_bytes_recursive.filter((item) => item.op === "Read").reduce((acc, item) => acc + item.value, 0)))}</div></div> <div class="bg-muted/30 p-4 rounded"><div class="text-sm text-muted-foreground">Write</div> <div class="font-medium mt-1">${escape_html(formatBytes(stats.blkio_stats.io_service_bytes_recursive.filter((item) => item.op === "Write").reduce((acc, item) => acc + item.value, 0)))}</div></div></div></div>`;
                } else {
                  $$payload4.out += "<!--[!-->";
                }
                $$payload4.out += `<!--]--></div></div> `;
                if (stats.pids_stats && stats.pids_stats.current !== void 0) {
                  $$payload4.out += "<!--[-->";
                  $$payload4.out += `<div class="mt-6 pt-6 border-t"><div class="text-sm"><span class="text-muted-foreground">Process count:</span> <span class="ml-2 font-medium">${escape_html(stats.pids_stats.current)}</span></div></div>`;
                } else {
                  $$payload4.out += "<!--[!-->";
                }
                $$payload4.out += `<!--]-->`;
              } else if (!container.State?.Running) {
                $$payload4.out += "<!--[1-->";
                $$payload4.out += `<div class="text-center text-muted-foreground py-12">Container is not running. Stats unavailable.</div>`;
              } else {
                $$payload4.out += "<!--[!-->";
                $$payload4.out += `<div class="text-center text-muted-foreground py-12">Loading stats...</div>`;
              }
              $$payload4.out += `<!--]-->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></section> <section id="logs" class="scroll-mt-20"><div class="flex items-center justify-between mb-6"><h2 class="text-xl font-semibold flex items-center gap-2">`;
      File_text($$payload2, { class: "size-5" });
      $$payload2.out += `<!----> Container Logs</h2> <div class="flex items-center gap-3"><label class="flex items-center gap-2"><input type="checkbox"${attr("checked", autoScrollLogs, true)} class="size-4"/> Auto-scroll</label> `;
      Button($$payload2, {
        variant: "outline",
        size: "sm",
        onclick: () => logViewer?.clearLogs(),
        children: ($$payload3) => {
          $$payload3.out += `<!---->Clear`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      if (isStreaming) {
        $$payload2.out += "<!--[-->";
        $$payload2.out += `<div class="flex items-center gap-2"><div class="size-2 bg-green-500 rounded-full animate-pulse"></div> <span class="text-green-600 text-sm font-medium">Live</span></div> `;
        Button($$payload2, {
          variant: "outline",
          size: "sm",
          onclick: () => logViewer?.stopLogStream(),
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
          onclick: () => logViewer?.startLogStream(),
          disabled: !container?.Id,
          children: ($$payload3) => {
            $$payload3.out += `<!---->Start`;
          },
          $$slots: { default: true }
        });
      }
      $$payload2.out += `<!--]--></div></div> <!---->`;
      Card($$payload2, {
        class: "border",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_content($$payload3, {
            class: "p-0",
            children: ($$payload4) => {
              LogViewer($$payload4, {
                type: "container",
                containerId: container?.Id,
                maxLines: 500,
                showTimestamps: true,
                height: "400px",
                onStart: handleLogStart,
                onStop: handleLogStop,
                onClear: handleLogClear,
                onToggleAutoScroll: handleToggleAutoScroll,
                get autoScroll() {
                  return autoScrollLogs;
                },
                set autoScroll($$value) {
                  autoScrollLogs = $$value;
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
      $$payload2.out += `<!----></section> <section id="config" class="scroll-mt-20"><h2 class="text-xl font-semibold mb-6 flex items-center gap-2">`;
      Settings($$payload2, { class: "size-5" });
      $$payload2.out += `<!----> Configuration</h2> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><!---->`;
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
                  $$payload5.out += `<!---->Environment Variables`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Card_content($$payload3, {
            class: "max-h-80 overflow-y-auto",
            children: ($$payload4) => {
              if (container.Config?.Env && container.Config.Env.length > 0) {
                $$payload4.out += "<!--[-->";
                const each_array_1 = ensure_array_like(container.Config.Env);
                $$payload4.out += `<div class="space-y-2"><!--[-->`;
                for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
                  let env = each_array_1[index];
                  if (env.includes("=")) {
                    $$payload4.out += "<!--[-->";
                    const [key, ...valueParts] = env.split("=");
                    const value = valueParts.join("=");
                    $$payload4.out += `<div class="flex border-b border-muted/30 py-2"><span class="font-medium w-1/3 pr-3 truncate"${attr("title", key)}>${escape_html(key)}</span> <span class="w-2/3 truncate text-muted-foreground"${attr("title", value)}>${escape_html(value)}</span></div>`;
                  } else {
                    $$payload4.out += "<!--[!-->";
                    $$payload4.out += `<div class="border-b border-muted/30 py-2">${escape_html(env)}</div>`;
                  }
                  $$payload4.out += `<!--]-->`;
                }
                $$payload4.out += `<!--]--></div>`;
              } else {
                $$payload4.out += "<!--[!-->";
                $$payload4.out += `<div class="text-muted-foreground text-center py-8">No environment variables</div>`;
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
        class: "border",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_header($$payload3, {
            class: "pb-4",
            children: ($$payload4) => {
              $$payload4.out += `<!---->`;
              Card_title($$payload4, {
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Port Mappings`;
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
              if (container.NetworkSettings?.Ports && Object.keys(container.NetworkSettings.Ports).length > 0) {
                $$payload4.out += "<!--[-->";
                const each_array_2 = ensure_array_like(Object.entries(container.NetworkSettings.Ports));
                $$payload4.out += `<div class="space-y-3"><!--[-->`;
                for (let $$index_3 = 0, $$length = each_array_2.length; $$index_3 < $$length; $$index_3++) {
                  let [containerPort, hostBindings] = each_array_2[$$index_3];
                  $$payload4.out += `<div class="flex items-center justify-between p-3 bg-muted/20 rounded"><span class="font-mono">${escape_html(containerPort)}</span> <div class="flex items-center gap-2"><span class="text-muted-foreground">→</span> `;
                  if (Array.isArray(hostBindings) && hostBindings.length > 0) {
                    $$payload4.out += "<!--[-->";
                    const each_array_3 = ensure_array_like(hostBindings);
                    $$payload4.out += `<!--[-->`;
                    for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
                      let binding = each_array_3[$$index_2];
                      Badge($$payload4, {
                        variant: "outline",
                        class: "font-mono",
                        children: ($$payload5) => {
                          $$payload5.out += `<!---->${escape_html(binding.HostIp || "0.0.0.0")}:${escape_html(binding.HostPort)}`;
                        },
                        $$slots: { default: true }
                      });
                    }
                    $$payload4.out += `<!--]-->`;
                  } else {
                    $$payload4.out += "<!--[!-->";
                    $$payload4.out += `<span class="text-muted-foreground">Not published</span>`;
                  }
                  $$payload4.out += `<!--]--></div></div>`;
                }
                $$payload4.out += `<!--]--></div>`;
              } else {
                $$payload4.out += "<!--[!-->";
                $$payload4.out += `<div class="text-muted-foreground text-center py-8">No ports exposed</div>`;
              }
              $$payload4.out += `<!--]-->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div> <!---->`;
      Card($$payload2, {
        class: "border mt-6",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_header($$payload3, {
            class: "pb-4",
            children: ($$payload4) => {
              $$payload4.out += `<!---->`;
              Card_title($$payload4, {
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Labels`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!---->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Card_content($$payload3, {
            class: "max-h-60 overflow-y-auto",
            children: ($$payload4) => {
              if (container.Config?.Labels && Object.keys(container.Config.Labels).length > 0) {
                $$payload4.out += "<!--[-->";
                const each_array_4 = ensure_array_like(Object.entries(container.Config.Labels));
                $$payload4.out += `<div class="space-y-2"><!--[-->`;
                for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
                  let [key, value] = each_array_4[$$index_4];
                  $$payload4.out += `<div class="flex border-b border-muted/30 py-2"><span class="font-medium w-1/3 pr-3 truncate"${attr("title", key)}>${escape_html(key)}</span> <span class="w-2/3 truncate text-muted-foreground"${attr("title", value?.toString())}>${escape_html(value?.toString() || "")}</span></div>`;
                }
                $$payload4.out += `<!--]--></div>`;
              } else {
                $$payload4.out += "<!--[!-->";
                $$payload4.out += `<div class="text-muted-foreground text-center py-8">No labels defined</div>`;
              }
              $$payload4.out += `<!--]-->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></section> <section id="network" class="scroll-mt-20"><h2 class="text-xl font-semibold mb-6 flex items-center gap-2">`;
      Network($$payload2, { class: "size-5" });
      $$payload2.out += `<!----> Networks</h2> <!---->`;
      Card($$payload2, {
        class: "border",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_content($$payload3, {
            class: "p-6",
            children: ($$payload4) => {
              if (container.NetworkSettings?.Networks && Object.keys(container.NetworkSettings.Networks).length > 0) {
                $$payload4.out += "<!--[-->";
                const each_array_5 = ensure_array_like(Object.entries(container.NetworkSettings.Networks));
                $$payload4.out += `<div class="space-y-6"><!--[-->`;
                for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
                  let [networkName, rawNetworkConfig] = each_array_5[$$index_5];
                  const networkConfig = ensureNetworkConfig(rawNetworkConfig);
                  $$payload4.out += `<div class="border rounded p-4"><div class="font-medium mb-4">${escape_html(networkName)}</div> <div class="grid grid-cols-2 lg:grid-cols-4 gap-4"><div><div class="text-sm text-muted-foreground">IP Address</div> <div class="font-mono">${escape_html(networkConfig.IPAddress || "N/A")}</div></div> <div><div class="text-sm text-muted-foreground">Gateway</div> <div class="font-mono">${escape_html(networkConfig.Gateway || "N/A")}</div></div> <div><div class="text-sm text-muted-foreground">MAC Address</div> <div class="font-mono">${escape_html(networkConfig.MacAddress || "N/A")}</div></div> <div><div class="text-sm text-muted-foreground">Subnet</div> <div class="font-mono">${escape_html(networkConfig.IPPrefixLen ? `${networkConfig.IPAddress}/${networkConfig.IPPrefixLen}` : "N/A")}</div></div> `;
                  if (networkConfig.Aliases && networkConfig.Aliases.length > 0) {
                    $$payload4.out += "<!--[-->";
                    $$payload4.out += `<div class="col-span-2"><div class="text-sm text-muted-foreground">Aliases</div> <div class="font-mono">${escape_html(networkConfig.Aliases.join(", "))}</div></div>`;
                  } else {
                    $$payload4.out += "<!--[!-->";
                  }
                  $$payload4.out += `<!--]--></div></div>`;
                }
                $$payload4.out += `<!--]--></div>`;
              } else {
                $$payload4.out += "<!--[!-->";
                $$payload4.out += `<div class="text-muted-foreground text-center py-12">No networks connected</div>`;
              }
              $$payload4.out += `<!--]-->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></section> <section id="storage" class="scroll-mt-20"><h2 class="text-xl font-semibold mb-6 flex items-center gap-2">`;
      Database($$payload2, { class: "size-5" });
      $$payload2.out += `<!----> Storage &amp; Mounts</h2> <!---->`;
      Card($$payload2, {
        class: "border",
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_content($$payload3, {
            class: "p-6",
            children: ($$payload4) => {
              if (container.Mounts && container.Mounts.length > 0) {
                $$payload4.out += "<!--[-->";
                const each_array_6 = ensure_array_like(container.Mounts);
                $$payload4.out += `<div class="space-y-4"><!--[-->`;
                for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
                  let mount = each_array_6[$$index_6];
                  $$payload4.out += `<div class="border rounded overflow-hidden"><div class="flex items-center justify-between p-4 bg-muted/20"><div class="flex items-center gap-3"><div${attr_class(`p-2 rounded ${stringify(mount.Type === "volume" ? "bg-purple-100 dark:bg-purple-950" : mount.Type === "bind" ? "bg-blue-100 dark:bg-blue-950" : "bg-amber-100 dark:bg-amber-950")}`)}>`;
                  if (mount.Type === "volume") {
                    $$payload4.out += "<!--[-->";
                    Database($$payload4, { class: "size-4 text-purple-600" });
                  } else if (mount.Type === "bind") {
                    $$payload4.out += "<!--[1-->";
                    Hard_drive($$payload4, { class: "size-4 text-blue-600" });
                  } else {
                    $$payload4.out += "<!--[!-->";
                    Terminal($$payload4, { class: "size-4 text-amber-600" });
                  }
                  $$payload4.out += `<!--]--></div> <div><div class="font-medium">${escape_html(mount.Type === "tmpfs" ? "Temporary filesystem" : mount.Type === "volume" ? mount.Name || "Docker volume" : "Host directory")}</div> <div class="text-sm text-muted-foreground">${escape_html(mount.Type)} mount ${escape_html(mount.RW ? "(read-write)" : "(read-only)")}</div></div></div> `;
                  Badge($$payload4, {
                    variant: mount.RW ? "outline" : "secondary",
                    children: ($$payload5) => {
                      $$payload5.out += `<!---->${escape_html(mount.RW ? "RW" : "RO")}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload4.out += `<!----></div> <div class="p-4 space-y-3"><div class="flex"><span class="w-24 text-muted-foreground font-medium">Container:</span> <span class="font-mono bg-muted/50 px-2 py-1 rounded flex-1">${escape_html(mount.Destination)}</span></div> <div class="flex"><span class="w-24 text-muted-foreground font-medium">${escape_html(mount.Type === "volume" ? "Volume:" : mount.Type === "bind" ? "Host:" : "Source:")}</span> <span class="font-mono bg-muted/50 px-2 py-1 rounded flex-1">${escape_html(mount.Source)}</span></div></div></div>`;
                }
                $$payload4.out += `<!--]--></div>`;
              } else {
                $$payload4.out += "<!--[!-->";
                $$payload4.out += `<div class="text-center py-12"><div class="mb-4 rounded-full bg-muted/50 flex items-center justify-center mx-auto size-16">`;
                Database($$payload4, { class: "size-6 text-muted-foreground" });
                $$payload4.out += `<!----></div> <div class="text-muted-foreground">No volumes or mounts configured</div></div>`;
              }
              $$payload4.out += `<!--]-->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></section></div></div></div></div>`;
    } else {
      $$payload2.out += "<!--[!-->";
      $$payload2.out += `<div class="min-h-screen flex items-center justify-center"><div class="text-center"><div class="rounded-full bg-muted/50 p-6 mb-6 inline-flex">`;
      Circle_alert($$payload2, { class: "text-muted-foreground size-10" });
      $$payload2.out += `<!----></div> <h2 class="text-2xl font-medium mb-3">Container Not Found</h2> <p class="text-center text-muted-foreground max-w-md mb-8">Could not load container data. It may have been removed or the Docker engine is not accessible.</p> <div class="flex gap-4 justify-center">`;
      Button($$payload2, {
        variant: "outline",
        href: "/containers",
        children: ($$payload3) => {
          Arrow_left($$payload3, { class: "mr-2 size-4" });
          $$payload3.out += `<!----> Back to Containers`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      Button($$payload2, {
        variant: "default",
        onclick: refreshData,
        children: ($$payload3) => {
          Refresh_cw($$payload3, { class: "mr-2 size-4" });
          $$payload3.out += `<!----> Retry`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div></div></div>`;
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
export {
  _page as default
};
