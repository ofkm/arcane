import { p as push, a as pop, t as escape_html, o as attr_class, g as stringify, b as spread_props } from './index3-DI1Ivwzg.js';
import { P as Provider, R as Root, T as Tooltip_trigger, a as Tooltip_content } from './index9-JqctHbMH.js';
import { C as Circle_check } from './circle-check-CTBnpdJg.js';
import { I as Icon } from './Icon-DbVCNmsR.js';
import { T as Triangle_alert } from './triangle-alert-DaMn4J5b.js';
import { C as Clock } from './clock-BAJle9Um.js';
import { L as Loader_circle } from './loader-circle-BJifzSLw.js';

function Calendar($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M8 2v4" }],
    ["path", { "d": "M16 2v4" }],
    [
      "rect",
      {
        "width": "18",
        "height": "18",
        "x": "3",
        "y": "4",
        "rx": "2"
      }
    ],
    ["path", { "d": "M3 10h18" }]
  ];
  Icon($$payload, spread_props([
    { name: "calendar" },
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
function Circle_arrow_up($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "circle",
      { "cx": "12", "cy": "12", "r": "10" }
    ],
    ["path", { "d": "m16 12-4-4-4 4" }],
    ["path", { "d": "M12 16V8" }]
  ];
  Icon($$payload, spread_props([
    { name: "circle-arrow-up" },
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
function Circle_fading_arrow_up($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      { "d": "M12 2a10 10 0 0 1 7.38 16.75" }
    ],
    ["path", { "d": "m16 12-4-4-4 4" }],
    ["path", { "d": "M12 16V8" }],
    [
      "path",
      { "d": "M2.5 8.875a10 10 0 0 0-.5 3" }
    ],
    [
      "path",
      { "d": "M2.83 16a10 10 0 0 0 2.43 3.4" }
    ],
    [
      "path",
      { "d": "M4.636 5.235a10 10 0 0 1 .891-.857" }
    ],
    [
      "path",
      { "d": "M8.644 21.42a10 10 0 0 0 7.631-.38" }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "circle-fading-arrow-up" },
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
function Package($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"
      }
    ],
    ["path", { "d": "M12 22V12" }],
    [
      "polyline",
      { "points": "3.29 7 12 12 20.71 7" }
    ],
    ["path", { "d": "m7.5 4.27 9 5.15" }]
  ];
  Icon($$payload, spread_props([
    { name: "package" },
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
function Maturity_item($$payload, $$props) {
  push();
  let {
    maturity = void 0,
    isLoadingInBackground = false
  } = $$props;
  function formatDate(dateString) {
    if (!dateString || dateString === "Unknown date" || dateString === "Invalid date") {
      return "Unknown";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Unknown";
      const now = /* @__PURE__ */ new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.floor(diffTime / (1e3 * 60 * 60 * 24));
      const absDiffDays = Math.abs(diffDays);
      if (absDiffDays === 0) {
        const diffHours = Math.floor(Math.abs(diffTime) / (1e3 * 60 * 60));
        if (diffHours === 0) return "Now";
        return diffTime > 0 ? `In ${diffHours} hours` : `${diffHours} hours ago`;
      }
      if (diffTime > 0) {
        if (diffDays === 1) return "Tomorrow";
        if (diffDays < 7) return `In ${diffDays} days`;
        if (diffDays < 30) {
          const weeks = Math.floor(diffDays / 7);
          return weeks === 1 ? "In 1 week" : `In ${weeks} weeks`;
        }
        const futureDate = new Date(date);
        const currentDate2 = new Date(now);
        let monthsDiff2 = (futureDate.getFullYear() - currentDate2.getFullYear()) * 12;
        monthsDiff2 += futureDate.getMonth() - currentDate2.getMonth();
        if (monthsDiff2 < 12) {
          return monthsDiff2 === 1 ? "In 1 month" : `In ${monthsDiff2} months`;
        }
        const yearsDiff2 = Math.floor(monthsDiff2 / 12);
        const remainingMonths2 = monthsDiff2 % 12;
        if (remainingMonths2 === 0) {
          return yearsDiff2 === 1 ? "In 1 year" : `In ${yearsDiff2} years`;
        } else {
          return `In ${yearsDiff2} years, ${remainingMonths2} months`;
        }
      }
      if (absDiffDays === 1) return "Yesterday";
      if (absDiffDays < 7) return `${absDiffDays} days ago`;
      if (absDiffDays < 30) {
        const weeks = Math.floor(absDiffDays / 7);
        return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
      }
      const pastDate = new Date(date);
      const currentDate = new Date(now);
      let monthsDiff = (currentDate.getFullYear() - pastDate.getFullYear()) * 12;
      monthsDiff += currentDate.getMonth() - pastDate.getMonth();
      if (monthsDiff < 12) {
        return monthsDiff === 1 ? "1 month ago" : `${monthsDiff} months ago`;
      }
      const yearsDiff = Math.floor(monthsDiff / 12);
      const remainingMonths = monthsDiff % 12;
      if (remainingMonths === 0) {
        return yearsDiff === 1 ? "1 year ago" : `${yearsDiff} years ago`;
      } else {
        return `${yearsDiff} years, ${remainingMonths} months ago`;
      }
    } catch {
      return "Unknown";
    }
  }
  function getStatusColor(status) {
    switch (status) {
      case "Matured":
        return "text-green-500";
      case "Not Matured":
        return "text-amber-500";
      case "Unknown":
        return "text-gray-500";
      default:
        return "text-gray-500";
    }
  }
  function getUpdatePriority(maturity2) {
    if (!maturity2.updatesAvailable) {
      return {
        level: "None",
        color: "text-green-500",
        description: "Image is up to date"
      };
    }
    if (maturity2.status === "Matured") {
      return {
        level: "Recommended",
        color: "text-blue-500",
        description: "Stable update available"
      };
    }
    if (maturity2.status === "Not Matured") {
      return {
        level: "Optional",
        color: "text-yellow-500",
        description: "Recent update, may be unstable"
      };
    }
    return {
      level: "Unknown",
      color: "text-gray-500",
      description: "Update status unclear"
    };
  }
  if (maturity) {
    $$payload.out += "<!--[-->";
    const priority = getUpdatePriority(maturity);
    $$payload.out += `<!---->`;
    Provider($$payload, {
      children: ($$payload2) => {
        $$payload2.out += `<!---->`;
        Root($$payload2, {
          children: ($$payload3) => {
            $$payload3.out += `<!---->`;
            Tooltip_trigger($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<span class="inline-flex items-center justify-center align-middle mr-2 size-4">`;
                if (!maturity.updatesAvailable) {
                  $$payload4.out += "<!--[-->";
                  Circle_check($$payload4, {
                    class: "text-green-500 size-4",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2"
                  });
                } else if (maturity.status === "Not Matured") {
                  $$payload4.out += "<!--[1-->";
                  Circle_fading_arrow_up($$payload4, {
                    class: "text-yellow-500 size-4",
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "2"
                  });
                } else {
                  $$payload4.out += "<!--[!-->";
                  Circle_arrow_up($$payload4, {
                    class: "text-blue-500 size-4",
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "2"
                  });
                }
                $$payload4.out += `<!--]--></span>`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> <!---->`;
            Tooltip_content($$payload3, {
              side: "right",
              class: "bg-popover text-popover-foreground border border-border shadow-lg p-4 max-w-[280px] relative tooltip-with-arrow maturity-tooltip",
              align: "center",
              children: ($$payload4) => {
                $$payload4.out += `<div class="space-y-3"><div class="flex items-center gap-3 pb-2 border-b border-border">`;
                if (!maturity.updatesAvailable) {
                  $$payload4.out += "<!--[-->";
                  $$payload4.out += `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20">`;
                  Circle_check($$payload4, {
                    class: "text-green-500 size-5",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2"
                  });
                  $$payload4.out += `<!----></div> <div><div class="font-semibold text-sm">Up to Date</div> <div class="text-xs text-muted-foreground">No updates available</div></div>`;
                } else if (maturity.status === "Not Matured") {
                  $$payload4.out += "<!--[1-->";
                  $$payload4.out += `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20">`;
                  Circle_fading_arrow_up($$payload4, {
                    class: "text-yellow-500 size-5",
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "2"
                  });
                  $$payload4.out += `<!----></div> <div><div class="font-semibold text-sm">Update Available</div> <div class="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">`;
                  Triangle_alert($$payload4, { class: "size-3" });
                  $$payload4.out += `<!----> Not yet matured</div></div>`;
                } else {
                  $$payload4.out += "<!--[!-->";
                  $$payload4.out += `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20">`;
                  Circle_arrow_up($$payload4, {
                    class: "text-blue-500 size-5",
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "2"
                  });
                  $$payload4.out += `<!----></div> <div><div class="font-semibold text-sm">Stable Update</div> <div class="text-xs text-blue-600 dark:text-blue-400">Recommended for update</div></div>`;
                }
                $$payload4.out += `<!--]--></div> <div class="grid gap-2 text-xs"><div class="flex items-center justify-between"><div class="flex items-center gap-1.5 text-muted-foreground">`;
                Package($$payload4, { class: "size-3" });
                $$payload4.out += `<!----> <span>Version</span></div> <span class="font-mono font-medium">${escape_html(maturity.version || "Unknown")}</span></div> <div class="flex items-center justify-between"><div class="flex items-center gap-1.5 text-muted-foreground">`;
                Calendar($$payload4, { class: "size-3" });
                $$payload4.out += `<!----> <span>Released</span></div> <span class="font-medium">${escape_html(formatDate(maturity.date))}</span></div> <div class="flex items-center justify-between"><div class="flex items-center gap-1.5 text-muted-foreground">`;
                Clock($$payload4, { class: "size-3" });
                $$payload4.out += `<!----> <span>Status</span></div> <span${attr_class(`font-medium ${stringify(getStatusColor(maturity.status))}`)}>${escape_html(maturity.status || "Unknown")}</span></div> <div class="flex items-center justify-between"><div class="flex items-center gap-1.5 text-muted-foreground"><span>Priority</span></div> <span${attr_class(`font-medium ${stringify(priority.color)}`)}>${escape_html(priority.level)}</span></div></div> <div class="pt-2 border-t border-border"><div class="text-xs text-muted-foreground leading-relaxed">${escape_html(priority.description)}</div> `;
                if (maturity.updatesAvailable) {
                  $$payload4.out += "<!--[-->";
                  if (priority.level === "Optional") {
                    $$payload4.out += "<!--[-->";
                    $$payload4.out += `<div class="mt-1 text-xs text-amber-600 dark:text-amber-400 leading-relaxed">Consider waiting for the update to mature before upgrading.</div>`;
                  } else if (priority.level === "Unknown") {
                    $$payload4.out += "<!--[1-->";
                    $$payload4.out += `<div class="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Verify update stability before proceeding with upgrade.</div>`;
                  } else {
                    $$payload4.out += "<!--[!-->";
                  }
                  $$payload4.out += `<!--]-->`;
                } else {
                  $$payload4.out += "<!--[!-->";
                }
                $$payload4.out += `<!--]--></div></div>`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!---->`;
      }
    });
    $$payload.out += `<!---->`;
  } else if (isLoadingInBackground) {
    $$payload.out += "<!--[1-->";
    $$payload.out += `<!---->`;
    Provider($$payload, {
      children: ($$payload2) => {
        $$payload2.out += `<!---->`;
        Root($$payload2, {
          children: ($$payload3) => {
            $$payload3.out += `<!---->`;
            Tooltip_trigger($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<span class="inline-flex items-center justify-center align-middle mr-2 size-4">`;
                Loader_circle($$payload4, { class: "text-blue-400 size-4 animate-spin" });
                $$payload4.out += `<!----></span>`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> <!---->`;
            Tooltip_content($$payload3, {
              side: "right",
              class: "bg-popover text-popover-foreground border border-border shadow-lg p-3 max-w-[220px] relative tooltip-with-arrow",
              align: "center",
              children: ($$payload4) => {
                $$payload4.out += `<div class="flex items-center gap-2">`;
                Loader_circle($$payload4, { class: "text-blue-400 size-4 animate-spin" });
                $$payload4.out += `<!----> <div><div class="text-sm font-medium">Checking Updates</div> <div class="text-xs text-muted-foreground">Querying registry for latest version...</div></div></div>`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!---->`;
      }
    });
    $$payload.out += `<!---->`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<!---->`;
    Provider($$payload, {
      children: ($$payload2) => {
        $$payload2.out += `<!---->`;
        Root($$payload2, {
          children: ($$payload3) => {
            $$payload3.out += `<!---->`;
            Tooltip_trigger($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<span class="inline-flex items-center justify-center mr-2 opacity-30 size-4"><div class="w-4 h-4 rounded-full border-2 border-gray-400 border-dashed flex items-center justify-center"><div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div></div></span>`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> <!---->`;
            Tooltip_content($$payload3, {
              side: "right",
              class: "bg-popover text-popover-foreground border border-border shadow-lg p-3 max-w-[240px] relative tooltip-with-arrow",
              align: "center",
              children: ($$payload4) => {
                $$payload4.out += `<div class="flex items-center gap-2"><div class="flex items-center justify-center w-6 h-6 rounded-full bg-muted border border-border">`;
                Triangle_alert($$payload4, { class: "text-muted-foreground size-3" });
                $$payload4.out += `<!----></div> <div><div class="text-sm font-medium">Status Unknown</div> <div class="text-xs text-muted-foreground leading-relaxed">Unable to determine maturity status. Registry may be unavailable or rate-limited.</div></div></div>`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!---->`;
      }
    });
    $$payload.out += `<!---->`;
  }
  $$payload.out += `<!--]-->`;
  pop();
}

export { Maturity_item as M };
//# sourceMappingURL=maturity-item-DPTjIEFe.js.map
