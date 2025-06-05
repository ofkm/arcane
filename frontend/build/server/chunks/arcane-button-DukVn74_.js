import { p as push, b as spread_props, a as pop, g as stringify, t as escape_html } from './index3-DI1Ivwzg.js';
import { B as Button } from './button-CUTwDrbo.js';
import { L as Layout_template } from './layout-template-C_FDbO2k.js';
import { I as Icon } from './Icon-DbVCNmsR.js';
import { S as Save } from './save-C3QNHVRC.js';
import { X } from './x-BTRU5OLu.js';
import { C as Check } from './check-CkcwyHfy.js';
import { F as File_text } from './file-text-C4b752KJ.js';
import { D as Download, P as Play } from './play-_c2l8cZS.js';
import { T as Trash_2 } from './trash-2-BUIKTnnR.js';
import { C as Circle_stop } from './circle-stop-CL2cQsOt.js';
import { L as Loader_circle } from './loader-circle-BJifzSLw.js';

function Circle_plus($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "circle",
      { "cx": "12", "cy": "12", "r": "10" }
    ],
    ["path", { "d": "M8 12h8" }],
    ["path", { "d": "M12 8v8" }]
  ];
  Icon($$payload, spread_props([
    { name: "circle-plus" },
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
function Refresh_ccw_dot($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M3 2v6h6" }],
    ["path", { "d": "M21 12A9 9 0 0 0 6 5.3L3 8" }],
    ["path", { "d": "M21 22v-6h-6" }],
    [
      "path",
      { "d": "M3 12a9 9 0 0 0 15 6.7l3-2.7" }
    ],
    [
      "circle",
      { "cx": "12", "cy": "12", "r": "1" }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "refresh-ccw-dot" },
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
function Rotate_ccw($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
      }
    ],
    ["path", { "d": "M3 3v5h5" }]
  ];
  Icon($$payload, spread_props([
    { name: "rotate-ccw" },
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
function Scan_search($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M3 7V5a2 2 0 0 1 2-2h2" }],
    ["path", { "d": "M17 3h2a2 2 0 0 1 2 2v2" }],
    ["path", { "d": "M21 17v2a2 2 0 0 1-2 2h-2" }],
    ["path", { "d": "M7 21H5a2 2 0 0 1-2-2v-2" }],
    [
      "circle",
      { "cx": "12", "cy": "12", "r": "3" }
    ],
    ["path", { "d": "m16 16-1.9-1.9" }]
  ];
  Icon($$payload, spread_props([
    { name: "scan-search" },
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
function Square_pen($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
      }
    ],
    [
      "path",
      {
        "d": "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "square-pen" },
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
function Arcane_button($$payload, $$props) {
  let {
    action,
    onClick,
    loading = false,
    disabled = false,
    label: propLabel = void 0,
    customLabel = void 0,
    // Alternate name for label
    loadingLabel: customLoadingLabel = void 0,
    showLabel = true,
    class: extraClass = "",
    size: customSize = "default"
  } = $$props;
  const label = propLabel ?? customLabel;
  const actionConfigs = {
    start: {
      defaultLabel: "Start",
      IconComponent: Play,
      variant: "default",
      loadingLabel: "Starting...",
      customClass: "arcane-button-start"
    },
    deploy: {
      defaultLabel: "Deploy",
      IconComponent: Play,
      variant: "default",
      loadingLabel: "Deploying...",
      customClass: "arcane-button-deploy"
    },
    stop: {
      defaultLabel: "Stop",
      IconComponent: Circle_stop,
      variant: "destructive",
      loadingLabel: "Stopping...",
      customClass: "arcane-button-stop"
    },
    restart: {
      defaultLabel: "Restart",
      IconComponent: Rotate_ccw,
      variant: "secondary",
      loadingLabel: "Restarting...",
      customClass: "arcane-button-restart"
    },
    remove: {
      defaultLabel: "Remove",
      IconComponent: Trash_2,
      variant: "destructive",
      loadingLabel: "Removing...",
      customClass: "arcane-button-remove"
    },
    pull: {
      defaultLabel: "Pull",
      IconComponent: Download,
      variant: "secondary",
      loadingLabel: "Pulling...",
      customClass: "arcane-button-pull"
    },
    redeploy: {
      defaultLabel: "Redeploy",
      IconComponent: Refresh_ccw_dot,
      variant: "secondary",
      loadingLabel: "Redeploying...",
      customClass: "arcane-button-redeploy"
    },
    inspect: {
      defaultLabel: "Inspect",
      IconComponent: Scan_search,
      variant: "outline",
      loadingLabel: "Inspecting...",
      customClass: "arcane-button-inspect"
    },
    logs: {
      defaultLabel: "Logs",
      IconComponent: File_text,
      variant: "ghost",
      loadingLabel: "Fetching...",
      customClass: "arcane-button-logs"
    },
    edit: {
      defaultLabel: "Edit",
      IconComponent: Square_pen,
      variant: "secondary",
      loadingLabel: "Saving...",
      customClass: "arcane-button-edit"
    },
    confirm: {
      defaultLabel: "Confirm",
      IconComponent: Check,
      variant: "default",
      loadingLabel: "Confirming...",
      customClass: "arcane-button-confirm"
    },
    cancel: {
      defaultLabel: "Cancel",
      IconComponent: X,
      variant: "ghost",
      loadingLabel: "Cancelling...",
      customClass: "arcane-button-cancel"
    },
    save: {
      defaultLabel: "Save",
      IconComponent: Save,
      variant: "default",
      loadingLabel: "Saving...",
      customClass: "arcane-button-save"
    },
    create: {
      defaultLabel: "Create",
      IconComponent: Circle_plus,
      variant: "default",
      loadingLabel: "Creating...",
      customClass: "arcane-button-create"
    },
    template: {
      defaultLabel: "Use Template",
      IconComponent: Layout_template,
      variant: "secondary",
      loadingLabel: "Creating...",
      customClass: "arcane-button-restart"
    }
  };
  let config = actionConfigs[action];
  let displayLabel = label ?? config.defaultLabel;
  let displayLoadingLabel = customLoadingLabel ?? config.loadingLabel ?? "Processing...";
  let isIconOnlyButton = customSize === "icon" || !showLabel;
  let iconMarginClass = !isIconOnlyButton ? "mr-2" : "";
  Button($$payload, {
    variant: config.variant,
    size: customSize,
    class: `${extraClass} ${config.customClass || ""}`,
    disabled: disabled || loading,
    onclick: onClick,
    "aria-label": isIconOnlyButton ? displayLabel : void 0,
    children: ($$payload2) => {
      if (loading) {
        $$payload2.out += "<!--[-->";
        Loader_circle($$payload2, {
          class: `animate-spin ${stringify(iconMarginClass)} size-4`
        });
        $$payload2.out += `<!----> `;
        if (!isIconOnlyButton) {
          $$payload2.out += "<!--[-->";
          $$payload2.out += `${escape_html(displayLoadingLabel)}`;
        } else {
          $$payload2.out += "<!--[!-->";
        }
        $$payload2.out += `<!--]-->`;
      } else {
        $$payload2.out += "<!--[!-->";
        $$payload2.out += `<!---->`;
        config.IconComponent($$payload2, {
          class: `${stringify(iconMarginClass)} size-4`
        });
        $$payload2.out += `<!----> `;
        if (!isIconOnlyButton) {
          $$payload2.out += "<!--[-->";
          $$payload2.out += `${escape_html(displayLabel)}`;
        } else {
          $$payload2.out += "<!--[!-->";
        }
        $$payload2.out += `<!--]-->`;
      }
      $$payload2.out += `<!--]-->`;
    },
    $$slots: { default: true }
  });
}

export { Arcane_button as A, Rotate_ccw as R, Scan_search as S };
//# sourceMappingURL=arcane-button-DukVn74_.js.map
