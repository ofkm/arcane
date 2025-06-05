import { p as push, c as copy_payload, d as assign_payload, a as pop, h as head, t as escape_html, o as attr_class, g as stringify, j as ensure_array_like, f as attr, D as maybe_selected, b as spread_props } from './index3-DI1Ivwzg.js';
import { g as goto, i as invalidateAll } from './client-Cc1XkR80.js';
import { formatDistanceToNow } from 'date-fns';
import { a as toast } from './Toaster.svelte_svelte_type_style_lang-B5vkOu6x.js';
import { C as Card } from './card-BHGzpLb_.js';
import { C as Card_content, a as Card_header, b as Card_title } from './card-title-Cbe9TU5i.js';
import { B as Breadcrumb, a as Breadcrumb_list, b as Breadcrumb_item, c as Breadcrumb_link, d as Breadcrumb_separator, e as Breadcrumb_page } from './breadcrumb-page-BG7b-RXW.js';
import { A as Alert } from './alert-BRXlGSSu.js';
import { A as Alert_title, a as Alert_description } from './alert-title-Ce5Et4hB.js';
import { R as Root, D as Dialog_content, a as Dialog_header, g as Dialog_title, b as Dialog_footer } from './index7-tn3QlYte.js';
import { R as Root$2, S as Select_trigger, a as Select_content, b as Select_item } from './index11-Bwdsa0vi.js';
import { R as Root$1, T as Tabs_list, a as Tabs_trigger, b as Tabs_content } from './index12-KPazSD2I.js';
import { D as Dropdown_card } from './dropdown-card-CzBtl4nH.js';
import { U as Universal_table } from './universal-table-CB6RbjtA.js';
import { B as Button } from './button-CUTwDrbo.js';
import { I as Input } from './input-Bs5Bjqyo.js';
import { L as Label } from './label-DF0BU6VF.js';
import { S as Status_badge } from './status-badge-55QtloxC.js';
import { L as Loader_circle } from './loader-circle-BJifzSLw.js';
import { T as Textarea } from './textarea-DUoDVtW1.js';
import { F as File_text } from './file-text-C4b752KJ.js';
import { I as Icon } from './Icon-DbVCNmsR.js';
import { S as Switch } from './switch-D8BK2W40.js';
import { P as Plus } from './plus-HtkF3wKK.js';
import { T as Trash_2 } from './trash-2-BUIKTnnR.js';
import { g as getActualAgentStatus } from './agent-status.utils-TeMOuzHn.js';
import { o as openConfirmDialog } from './index8-BdgpbvMa.js';
import { h as handleApiResultWithCallbacks } from './api.util-Ci3Q0GvL.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import { A as Arrow_left } from './arrow-left-Na-IoffC.js';
import { T as Terminal } from './terminal-B-RMUQnz.js';
import { S as Server } from './server-BmND8eZ8.js';
import { M as Monitor } from './monitor-9YUqwWNy.js';
import { S as Settings } from './settings-dVRciV0i.js';
import { C as Clock } from './clock-BAJle9Um.js';
import { A as Activity } from './activity-BBw87ym0.js';
import { C as Container } from './container-CWO-q65_.js';
import { H as Hard_drive } from './hard-drive-DYOg6VMo.js';
import { N as Network } from './network-BOuWhYHB.js';
import { D as Database } from './database-B1l6QNBG.js';
import { R as Refresh_cw } from './refresh-cw-CRz8nTZu.js';
import { L as Layers } from './layers-B6y2ShX1.js';
import { D as Download, P as Play } from './play-_c2l8cZS.js';
import { C as Circle_alert } from './circle-alert-Cc7lYjCi.js';
import { D as Dialog_description } from './dialog-description-R10GNeQ8.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import './exports-Cv9LZeD1.js';
import './index2-Da1jJcEh.js';
import './index-server-_G0R5Qhl.js';
import './chevron-right-EG31JOyw.js';
import './create-id-DRrkdd12.js';
import './scroll-lock-C_EWKkAl.js';
import './events-CVA3EDdV.js';
import './use-id-BSIc2y_F.js';
import './noop-BrWcRgZY.js';
import './x-BTRU5OLu.js';
import './check-CkcwyHfy.js';
import './chevron-down-DOg7W4Qb.js';
import './popper-layer-force-mount-A94KrKTq.js';
import './hidden-input-BsZkZal-.js';
import './use-roving-focus.svelte-Cnaf6bhO.js';
import './get-directional-keys-4fLrGlIs.js';
import './card-description-D9_vEbkT.js';
import '@tanstack/table-core';
import './checkbox-CMEX2hM2.js';
import './errors.util-g315AnHn.js';

function Upload($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M12 3v12" }],
    ["path", { "d": "m17 8-5-5-5 5" }],
    [
      "path",
      {
        "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "upload" },
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
function ImagePullForm($$payload, $$props) {
  push();
  let { onClose, onPull } = $$props;
  let pulling = false;
  let imageRef = "";
  let tag = "latest";
  function buildFullImageName(imageRef2, tag2) {
    const trimmedImageRef = imageRef2.trim();
    const trimmedTag = tag2.trim();
    if (trimmedImageRef.includes(":")) {
      return trimmedImageRef;
    }
    if (!trimmedTag || trimmedTag === "latest") {
      return `${trimmedImageRef}:latest`;
    }
    return `${trimmedImageRef}:${trimmedTag}`;
  }
  async function handlePull() {
    if (!imageRef.trim()) {
      toast.error("Please enter an image name");
      return;
    }
    pulling = true;
    try {
      const fullImageName = buildFullImageName(imageRef, tag);
      await onPull(fullImageName);
      onClose();
      toast.success(`Started pulling image: ${fullImageName}`);
    } catch (err) {
      console.error("Pull error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to pull image");
    } finally {
      pulling = false;
    }
  }
  function handleKeyPress(event) {
    if (event.key === "Enter" && !pulling) {
      handlePull();
    }
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div class="space-y-4"><div class="space-y-2">`;
    Label($$payload2, {
      for: "imageRef",
      children: ($$payload3) => {
        $$payload3.out += `<!---->Image Name`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Input($$payload2, {
      id: "imageRef",
      placeholder: "nginx, redis, ubuntu, etc.",
      disabled: pulling,
      onkeypress: handleKeyPress,
      get value() {
        return imageRef;
      },
      set value($$value) {
        imageRef = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----> <p class="text-xs text-muted-foreground">Enter the image name (e.g., nginx, redis, ubuntu)</p></div> <div class="space-y-2">`;
    Label($$payload2, {
      for: "tag",
      children: ($$payload3) => {
        $$payload3.out += `<!---->Tag (Optional)`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Input($$payload2, {
      id: "tag",
      placeholder: "latest",
      disabled: pulling,
      onkeypress: handleKeyPress,
      get value() {
        return tag;
      },
      set value($$value) {
        tag = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----> <p class="text-xs text-muted-foreground">Specify a tag version (defaults to 'latest')</p></div> <div class="flex justify-end space-x-2">`;
    Button($$payload2, {
      variant: "outline",
      onclick: onClose,
      disabled: pulling,
      children: ($$payload3) => {
        $$payload3.out += `<!---->Cancel`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Button($$payload2, {
      onclick: handlePull,
      disabled: pulling || !imageRef.trim(),
      children: ($$payload3) => {
        if (pulling) {
          $$payload3.out += "<!--[-->";
          Loader_circle($$payload3, { class: "size-4 mr-2 animate-spin" });
        } else {
          $$payload3.out += "<!--[!-->";
        }
        $$payload3.out += `<!--]--> Pull Image`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div></div>`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
function StackDeploymentForm($$payload, $$props) {
  push();
  let { onClose, onDeploy } = $$props;
  let deploying = false;
  let deploymentMode = "compose";
  let stackName = "";
  let composeContent = "";
  let envContent = "";
  let selectedStack = "";
  const templates = [
    {
      id: "nginx",
      name: "Nginx Web Server",
      description: "Simple Nginx web server",
      compose: `version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped`
    },
    {
      id: "redis",
      name: "Redis Cache",
      description: "Redis in-memory database",
      compose: `version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  redis_data:`
    },
    {
      id: "postgres",
      name: "PostgreSQL Database",
      description: "PostgreSQL database server",
      compose: `version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: changeme
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:`
    }
  ];
  async function handleDeploy() {
    if (!stackName.trim()) {
      toast.error("Please enter a stack name");
      return;
    }
    const stackNameRegex = /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/;
    const trimmedStackName = stackName.trim().toLowerCase();
    if (!stackNameRegex.test(trimmedStackName)) {
      toast.error("Stack name must start with a letter, contain only lowercase letters, numbers, and hyphens, and not end with a hyphen");
      return;
    }
    if (trimmedStackName.length > 63) {
      toast.error("Stack name must be 63 characters or less");
      return;
    }
    const reservedNames = [
      "system",
      "docker",
      "default",
      "admin",
      "root",
      "api"
    ];
    if (reservedNames.includes(trimmedStackName)) {
      toast.error(`"${trimmedStackName}" is a reserved name. Please choose a different stack name`);
      return;
    }
    if (deploymentMode === "compose") {
      if (!composeContent.trim()) {
        toast.error("Please enter Docker Compose content");
        return;
      }
      try {
        const lines = composeContent.trim().split("\n");
        const firstLine = lines[0].trim();
        if (!firstLine.startsWith("version:") && !composeContent.includes("services:")) {
          toast.error("Compose content should include a version and services section");
          return;
        }
        if (composeContent.includes("	")) {
          toast.error("Compose content contains tabs. Please use spaces for indentation");
          return;
        }
        if (!composeContent.includes("services:")) {
          toast.error('Compose content must include a "services:" section');
          return;
        }
        const servicesMatch = composeContent.match(/services:\s*\n([\s\S]*?)(?=\n\w|\n$|$)/);
        if (servicesMatch) {
          const servicesSection = servicesMatch[1];
          const serviceLines = servicesSection.split("\n").filter((line) => line.trim() && !line.startsWith(" "));
          if (serviceLines.length === 0) {
            toast.error("At least one service must be defined in the services section");
            return;
          }
        }
      } catch (error) {
        toast.error("Invalid Docker Compose format. Please check your YAML syntax");
        return;
      }
      if (envContent.trim()) {
        const envLines = envContent.trim().split("\n");
        for (let i = 0; i < envLines.length; i++) {
          const line = envLines[i].trim();
          if (!line) continue;
          if (!line.includes("=")) {
            toast.error(`Environment variable line ${i + 1} must be in KEY=VALUE format`);
            return;
          }
          const [key, ...valueParts] = line.split("=");
          if (!key.trim()) {
            toast.error(`Environment variable line ${i + 1} is missing a key`);
            return;
          }
          const envKeyRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
          if (!envKeyRegex.test(key.trim())) {
            toast.error(`Environment variable "${key}" must start with letter or underscore and contain only letters, numbers, and underscores`);
            return;
          }
        }
      }
    } else if (deploymentMode === "template") {
      if (!composeContent.trim()) {
        toast.error("Please select a template first");
        return;
      }
    } else if (deploymentMode === "existing") {
      if (!selectedStack.trim()) {
        toast.error("Please select an existing stack");
        return;
      }
    }
    deploying = true;
    try {
      const data = {
        mode: deploymentMode,
        stackName: trimmedStackName,
        composeContent: composeContent.trim(),
        envContent: envContent.trim(),
        selectedStack: selectedStack.trim() || void 0
      };
      console.log(`🚀 Deploying stack "${trimmedStackName}" with mode "${deploymentMode}"`);
      await onDeploy(data);
      onClose();
      toast.success(`Stack "${trimmedStackName}" deployed successfully`);
    } catch (err) {
      console.error("Deploy error:", err);
      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase();
        if (errorMessage.includes("network") || errorMessage.includes("connection") || errorMessage.includes("timeout")) {
          toast.error("Network error: Unable to connect to the deployment service. Please check your connection and try again.");
          return;
        }
        if (errorMessage.includes("unauthorized") || errorMessage.includes("forbidden") || errorMessage.includes("permission")) {
          toast.error("Permission denied: You may not have sufficient permissions to deploy stacks.");
          return;
        }
        if (errorMessage.includes("already exists") || errorMessage.includes("conflict")) {
          toast.error(`Stack "${trimmedStackName}" already exists. Please choose a different name or remove the existing stack first.`);
          return;
        }
        if (errorMessage.includes("yaml") || errorMessage.includes("compose") || errorMessage.includes("invalid")) {
          toast.error("Invalid Docker Compose configuration. Please check your compose content and try again.");
          return;
        }
        if (errorMessage.includes("memory") || errorMessage.includes("disk") || errorMessage.includes("resource")) {
          toast.error("Insufficient resources: The deployment requires more memory, disk space, or other resources than available.");
          return;
        }
        if (errorMessage.includes("pull") || errorMessage.includes("image") || errorMessage.includes("registry")) {
          toast.error("Image error: Unable to pull required Docker images. Please check image names and registry availability.");
          return;
        }
        if (errorMessage.includes("port") || errorMessage.includes("bind") || errorMessage.includes("address already in use")) {
          toast.error("Port conflict: One or more ports are already in use. Please check your port mappings.");
          return;
        }
        if (errorMessage.includes("volume") || errorMessage.includes("mount") || errorMessage.includes("path")) {
          toast.error("Volume error: There was an issue with volume mounts or paths. Please check your volume configurations.");
          return;
        }
        if (errorMessage.includes("agent") || errorMessage.includes("offline")) {
          toast.error("Agent error: The target agent is offline or unavailable. Please try again later.");
          return;
        }
        toast.error(`Deployment failed: ${err.message}`);
      } else {
        console.error("Unknown error type:", err);
        toast.error("An unexpected error occurred during deployment. Please try again.");
      }
    } finally {
      deploying = false;
    }
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div class="space-y-6"><div class="space-y-3">`;
    Label($$payload2, {
      children: ($$payload3) => {
        $$payload3.out += `<!---->How would you like to deploy?`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <div class="grid grid-cols-3 gap-2">`;
    Button($$payload2, {
      variant: deploymentMode === "compose" ? "default" : "outline",
      size: "sm",
      onclick: () => deploymentMode = "compose",
      class: "flex flex-col h-auto p-3",
      children: ($$payload3) => {
        File_text($$payload3, { class: "size-4 mb-1" });
        $$payload3.out += `<!----> <span class="text-xs">Write Compose</span>`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Button($$payload2, {
      variant: deploymentMode === "template" ? "default" : "outline",
      size: "sm",
      onclick: () => deploymentMode = "template",
      class: "flex flex-col h-auto p-3",
      children: ($$payload3) => {
        Upload($$payload3, { class: "size-4 mb-1" });
        $$payload3.out += `<!----> <span class="text-xs">Use Template</span>`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Button($$payload2, {
      variant: deploymentMode === "existing" ? "default" : "outline",
      size: "sm",
      onclick: () => deploymentMode = "existing",
      class: "flex flex-col h-auto p-3",
      disabled: true,
      children: ($$payload3) => {
        File_text($$payload3, { class: "size-4 mb-1" });
        $$payload3.out += `<!----> <span class="text-xs">Existing Stack</span>`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div></div> `;
    if (deploymentMode === "template") {
      $$payload2.out += "<!--[-->";
      const each_array = ensure_array_like(templates);
      $$payload2.out += `<div class="space-y-3">`;
      Label($$payload2, {
        children: ($$payload3) => {
          $$payload3.out += `<!---->Choose a template`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> <div class="grid gap-2"><!--[-->`;
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let template = each_array[$$index];
        $$payload2.out += `<button class="p-3 text-left border rounded-lg hover:border-primary/50 transition-colors"><div class="font-medium text-sm">${escape_html(template.name)}</div> <div class="text-xs text-muted-foreground">${escape_html(template.description)}</div></button>`;
      }
      $$payload2.out += `<!--]--></div></div>`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> <div class="space-y-2">`;
    Label($$payload2, {
      for: "stackName",
      children: ($$payload3) => {
        $$payload3.out += `<!---->Stack Name`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Input($$payload2, {
      id: "stackName",
      placeholder: "my-awesome-app",
      disabled: deploying,
      get value() {
        return stackName;
      },
      set value($$value) {
        stackName = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----></div> `;
    if (deploymentMode === "compose") {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<div class="space-y-2">`;
      Label($$payload2, {
        for: "compose",
        children: ($$payload3) => {
          $$payload3.out += `<!---->Docker Compose Content`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      Textarea($$payload2, {
        id: "compose",
        placeholder: "version: '3.8' services:   web:     image: nginx:alpine     ports:       - '80:80'",
        class: "font-mono text-sm min-h-[200px]",
        disabled: deploying,
        get value() {
          return composeContent;
        },
        set value($$value) {
          composeContent = $$value;
          $$settled = false;
        }
      });
      $$payload2.out += `<!----></div> <div class="space-y-2">`;
      Label($$payload2, {
        for: "env",
        children: ($$payload3) => {
          $$payload3.out += `<!---->Environment Variables (Optional)`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      Textarea($$payload2, {
        id: "env",
        placeholder: "DATABASE_URL=postgres://user:pass@db:5432/myapp REDIS_URL=redis://redis:6379",
        class: "font-mono text-sm min-h-[80px]",
        disabled: deploying,
        get value() {
          return envContent;
        },
        set value($$value) {
          envContent = $$value;
          $$settled = false;
        }
      });
      $$payload2.out += `<!----></div>`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> <div class="flex justify-end space-x-2">`;
    Button($$payload2, {
      variant: "outline",
      onclick: onClose,
      disabled: deploying,
      children: ($$payload3) => {
        $$payload3.out += `<!---->Cancel`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Button($$payload2, {
      onclick: handleDeploy,
      disabled: deploying || !stackName.trim(),
      children: ($$payload3) => {
        if (deploying) {
          $$payload3.out += "<!--[-->";
          Loader_circle($$payload3, { class: "size-4 mr-2 animate-spin" });
        } else {
          $$payload3.out += "<!--[!-->";
        }
        $$payload3.out += `<!--]--> Deploy Stack`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div></div>`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
function QuickContainerForm($$payload, $$props) {
  push();
  let { onClose, onRun } = $$props;
  let running = false;
  let containerName = "";
  let imageName = "";
  let ports = [];
  let volumes = [];
  let envVars = [];
  let detached = true;
  let autoRemove = false;
  let restartPolicy = "no";
  function addPort() {
    ports = [...ports, { host: "", container: "" }];
  }
  function removePort(index) {
    ports = ports.filter((_, i) => i !== index);
  }
  function addVolume() {
    volumes = [...volumes, { host: "", container: "" }];
  }
  function removeVolume(index) {
    volumes = volumes.filter((_, i) => i !== index);
  }
  function addEnvVar() {
    envVars = [...envVars, { key: "", value: "" }];
  }
  function removeEnvVar(index) {
    envVars = envVars.filter((_, i) => i !== index);
  }
  async function handleRun() {
    if (!imageName.trim()) {
      toast.error("Please enter an image name");
      return;
    }
    if (containerName.trim()) {
      const containerNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
      if (!containerNameRegex.test(containerName.trim())) {
        toast.error("Container name must start with alphanumeric character and can only contain letters, numbers, underscores, periods, and hyphens");
        return;
      }
    }
    for (let i = 0; i < ports.length; i++) {
      const port = ports[i];
      if (!port.host && !port.container) continue;
      if (!port.host || !port.container) {
        toast.error(`Port mapping ${i + 1}: Both host and container ports must be specified`);
        return;
      }
      const hostPort = parseInt(port.host);
      if (isNaN(hostPort) || hostPort < 1 || hostPort > 65535) {
        toast.error(`Port mapping ${i + 1}: Host port must be a number between 1 and 65535`);
        return;
      }
      const containerPort = parseInt(port.container);
      if (isNaN(containerPort) || containerPort < 1 || containerPort > 65535) {
        toast.error(`Port mapping ${i + 1}: Container port must be a number between 1 and 65535`);
        return;
      }
    }
    const hostPorts = ports.filter((p) => p.host && p.container).map((p) => parseInt(p.host));
    const uniqueHostPorts = new Set(hostPorts);
    if (hostPorts.length !== uniqueHostPorts.size) {
      toast.error("Duplicate host ports are not allowed");
      return;
    }
    for (let i = 0; i < volumes.length; i++) {
      const volume = volumes[i];
      if (!volume.host && !volume.container) continue;
      if (!volume.host || !volume.container) {
        toast.error(`Volume mapping ${i + 1}: Both host and container paths must be specified`);
        return;
      }
      if (!volume.host.trim()) {
        toast.error(`Volume mapping ${i + 1}: Host path cannot be empty`);
        return;
      }
      const hostPath = volume.host.trim();
      if (!hostPath.startsWith("/") && !hostPath.match(/^[a-zA-Z]:/)) {
        toast.error(`Volume mapping ${i + 1}: Host path should be an absolute path (e.g., /path/to/dir or C:/path/to/dir)`);
        return;
      }
      const containerPath = volume.container.trim();
      if (!containerPath.startsWith("/")) {
        toast.error(`Volume mapping ${i + 1}: Container path must be an absolute path starting with /`);
        return;
      }
      const reservedPaths = ["/proc", "/sys", "/dev"];
      if (reservedPaths.some((reserved) => containerPath.startsWith(reserved))) {
        toast.error(`Volume mapping ${i + 1}: Cannot mount to reserved system path ${containerPath}`);
        return;
      }
    }
    const containerPaths = volumes.filter((v) => v.host && v.container).map((v) => v.container.trim());
    const uniqueContainerPaths = new Set(containerPaths);
    if (containerPaths.length !== uniqueContainerPaths.size) {
      toast.error("Duplicate container mount points are not allowed");
      return;
    }
    for (let i = 0; i < envVars.length; i++) {
      const envVar = envVars[i];
      if (!envVar.key && !envVar.value) continue;
      if (!envVar.key || !envVar.value) {
        toast.error(`Environment variable ${i + 1}: Both key and value must be specified`);
        return;
      }
      const envKeyRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      if (!envKeyRegex.test(envVar.key.trim())) {
        toast.error(`Environment variable ${i + 1}: Key must start with letter or underscore and contain only letters, numbers, and underscores`);
        return;
      }
      const reservedEnvVars = ["PATH", "HOME", "USER", "SHELL"];
      if (reservedEnvVars.includes(envVar.key.trim().toUpperCase())) {
        toast.error(`Environment variable ${i + 1}: Cannot override reserved variable ${envVar.key}`);
        return;
      }
    }
    const envKeys = envVars.filter((e) => e.key && e.value).map((e) => e.key.trim().toUpperCase());
    const uniqueEnvKeys = new Set(envKeys);
    if (envKeys.length !== uniqueEnvKeys.size) {
      toast.error("Duplicate environment variable keys are not allowed");
      return;
    }
    running = true;
    try {
      const data = {
        imageName: imageName.trim(),
        containerName: containerName.trim() || void 0,
        ports: ports.filter((p) => p.host && p.container),
        volumes: volumes.filter((v) => v.host && v.container),
        envVars: envVars.filter((e) => e.key && e.value),
        detached,
        autoRemove,
        restartPolicy
      };
      await onRun(data);
      onClose();
      toast.success(`Started container from ${imageName}`);
    } catch (err) {
      console.error("Run error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to run container");
    } finally {
      running = false;
    }
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    const each_array = ensure_array_like(ports);
    const each_array_1 = ensure_array_like(volumes);
    const each_array_2 = ensure_array_like(envVars);
    $$payload2.out += `<div class="space-y-6"><div class="space-y-4"><div class="space-y-2">`;
    Label($$payload2, {
      for: "imageName",
      children: ($$payload3) => {
        $$payload3.out += `<!---->Image Name *`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Input($$payload2, {
      id: "imageName",
      placeholder: "nginx:alpine",
      disabled: running,
      get value() {
        return imageName;
      },
      set value($$value) {
        imageName = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----></div> <div class="space-y-2">`;
    Label($$payload2, {
      for: "containerName",
      children: ($$payload3) => {
        $$payload3.out += `<!---->Container Name (Optional)`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Input($$payload2, {
      id: "containerName",
      placeholder: "my-container",
      disabled: running,
      get value() {
        return containerName;
      },
      set value($$value) {
        containerName = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----></div></div> <div class="space-y-3"><div class="flex items-center justify-between">`;
    Label($$payload2, {
      children: ($$payload3) => {
        $$payload3.out += `<!---->Port Mappings`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Button($$payload2, {
      variant: "outline",
      size: "sm",
      onclick: addPort,
      disabled: running,
      children: ($$payload3) => {
        Plus($$payload3, { class: "size-4 mr-1" });
        $$payload3.out += `<!----> Add Port`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div> <!--[-->`;
    for (let index = 0, $$length = each_array.length; index < $$length; index++) {
      let port = each_array[index];
      $$payload2.out += `<div class="flex items-center gap-2">`;
      Input($$payload2, {
        placeholder: "8080",
        disabled: running,
        class: "flex-1",
        get value() {
          return port.host;
        },
        set value($$value) {
          port.host = $$value;
          $$settled = false;
        }
      });
      $$payload2.out += `<!----> <span class="text-muted-foreground">:</span> `;
      Input($$payload2, {
        placeholder: "80",
        disabled: running,
        class: "flex-1",
        get value() {
          return port.container;
        },
        set value($$value) {
          port.container = $$value;
          $$settled = false;
        }
      });
      $$payload2.out += `<!----> `;
      Button($$payload2, {
        variant: "outline",
        size: "sm",
        onclick: () => removePort(index),
        disabled: running,
        children: ($$payload3) => {
          Trash_2($$payload3, { class: "size-4" });
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div>`;
    }
    $$payload2.out += `<!--]--></div> <div class="space-y-3"><div class="flex items-center justify-between">`;
    Label($$payload2, {
      children: ($$payload3) => {
        $$payload3.out += `<!---->Volume Mounts`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Button($$payload2, {
      variant: "outline",
      size: "sm",
      onclick: addVolume,
      disabled: running,
      children: ($$payload3) => {
        Plus($$payload3, { class: "size-4 mr-1" });
        $$payload3.out += `<!----> Add Volume`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div> <!--[-->`;
    for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
      let volume = each_array_1[index];
      $$payload2.out += `<div class="flex items-center gap-2">`;
      Input($$payload2, {
        placeholder: "/host/path",
        disabled: running,
        class: "flex-1",
        get value() {
          return volume.host;
        },
        set value($$value) {
          volume.host = $$value;
          $$settled = false;
        }
      });
      $$payload2.out += `<!----> <span class="text-muted-foreground">:</span> `;
      Input($$payload2, {
        placeholder: "/container/path",
        disabled: running,
        class: "flex-1",
        get value() {
          return volume.container;
        },
        set value($$value) {
          volume.container = $$value;
          $$settled = false;
        }
      });
      $$payload2.out += `<!----> `;
      Button($$payload2, {
        variant: "outline",
        size: "sm",
        onclick: () => removeVolume(index),
        disabled: running,
        children: ($$payload3) => {
          Trash_2($$payload3, { class: "size-4" });
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div>`;
    }
    $$payload2.out += `<!--]--></div> <div class="space-y-3"><div class="flex items-center justify-between">`;
    Label($$payload2, {
      children: ($$payload3) => {
        $$payload3.out += `<!---->Environment Variables`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Button($$payload2, {
      variant: "outline",
      size: "sm",
      onclick: addEnvVar,
      disabled: running,
      children: ($$payload3) => {
        Plus($$payload3, { class: "size-4 mr-1" });
        $$payload3.out += `<!----> Add Variable`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div> <!--[-->`;
    for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
      let envVar = each_array_2[index];
      $$payload2.out += `<div class="flex items-center gap-2">`;
      Input($$payload2, {
        placeholder: "VARIABLE_NAME",
        disabled: running,
        class: "flex-1",
        get value() {
          return envVar.key;
        },
        set value($$value) {
          envVar.key = $$value;
          $$settled = false;
        }
      });
      $$payload2.out += `<!----> <span class="text-muted-foreground">=</span> `;
      Input($$payload2, {
        placeholder: "value",
        disabled: running,
        class: "flex-1",
        get value() {
          return envVar.value;
        },
        set value($$value) {
          envVar.value = $$value;
          $$settled = false;
        }
      });
      $$payload2.out += `<!----> `;
      Button($$payload2, {
        variant: "outline",
        size: "sm",
        onclick: () => removeEnvVar(index),
        disabled: running,
        children: ($$payload3) => {
          Trash_2($$payload3, { class: "size-4" });
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div>`;
    }
    $$payload2.out += `<!--]--></div> <div class="space-y-4"><div class="flex items-center justify-between"><div>`;
    Label($$payload2, {
      children: ($$payload3) => {
        $$payload3.out += `<!---->Run in Background`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <p class="text-sm text-muted-foreground">Run container in detached mode</p></div> `;
    Switch($$payload2, {
      disabled: running,
      get checked() {
        return detached;
      },
      set checked($$value) {
        detached = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----></div> <div class="flex items-center justify-between"><div>`;
    Label($$payload2, {
      children: ($$payload3) => {
        $$payload3.out += `<!---->Auto Remove`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <p class="text-sm text-muted-foreground">Remove container when it stops</p></div> `;
    Switch($$payload2, {
      disabled: running,
      get checked() {
        return autoRemove;
      },
      set checked($$value) {
        autoRemove = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----></div> <div class="space-y-2">`;
    Label($$payload2, {
      for: "restartPolicy",
      children: ($$payload3) => {
        $$payload3.out += `<!---->Restart Policy`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <select id="restartPolicy"${attr("disabled", running, true)} class="w-full px-3 py-2 border border-input bg-background rounded-md">`;
    $$payload2.select_value = restartPolicy;
    $$payload2.out += `<option value="no"${maybe_selected($$payload2, "no")}>No</option><option value="always"${maybe_selected($$payload2, "always")}>Always</option><option value="unless-stopped"${maybe_selected($$payload2, "unless-stopped")}>Unless Stopped</option><option value="on-failure"${maybe_selected($$payload2, "on-failure")}>On Failure</option>`;
    $$payload2.select_value = void 0;
    $$payload2.out += `</select></div></div> <div class="flex justify-end space-x-2">`;
    Button($$payload2, {
      variant: "outline",
      onclick: onClose,
      disabled: running,
      children: ($$payload3) => {
        $$payload3.out += `<!---->Cancel`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    Button($$payload2, {
      onclick: handleRun,
      disabled: running || !imageName.trim(),
      children: ($$payload3) => {
        if (running) {
          $$payload3.out += "<!--[-->";
          Loader_circle($$payload3, { class: "size-4 mr-2 animate-spin" });
        } else {
          $$payload3.out += "<!--[!-->";
        }
        $$payload3.out += `<!--]--> Run Container`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div></div>`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
function _page($$payload, $$props) {
  push();
  let { data } = $$props;
  let agent = data.agent;
  let tasks = data.tasks;
  let deployments = data.deployments;
  let agentId = data.agentId;
  let loading = false;
  let error = "";
  let resourcesLoading = false;
  let resourcesError = "";
  let resourcesData = {
    containers: [],
    images: [],
    networks: [],
    volumes: [],
    stacks: []
  };
  let selectedCommand = void 0;
  let commandArgs = "";
  let customCommand = "";
  let commandDialogOpen = false;
  let taskExecuting = false;
  let deployDialogOpen = false;
  let imageDialogOpen = false;
  let containerDialogOpen = false;
  let deleting = false;
  const predefinedCommands = [
    {
      value: "docker_version",
      label: "Docker Version"
    },
    {
      value: "docker_info",
      label: "Docker System Info"
    },
    { value: "docker_ps", label: "List Containers" },
    { value: "docker_images", label: "List Images" },
    {
      value: "system_info",
      label: "System Information"
    },
    {
      value: "agent_upgrade",
      label: "Upgrade Agent"
    },
    {
      value: "docker_prune",
      label: "Docker Cleanup"
    },
    { value: "custom", label: "Custom Command" }
  ];
  async function refreshAgentData() {
    if (loading) return;
    try {
      loading = true;
      const [
        agentResponse,
        tasksResponse,
        deploymentsResponse
      ] = await Promise.allSettled([
        fetch(`/api/agents/${agentId}`),
        fetch(`/api/agents/${agentId}/tasks?admin=true`),
        fetch(`/api/agents/${agentId}/deployments`)
      ]);
      if (agentResponse.status === "fulfilled" && agentResponse.value.ok) {
        const agentData = await agentResponse.value.json();
        agent = agentData.agent;
      }
      if (tasksResponse.status === "fulfilled" && tasksResponse.value.ok) {
        const tasksData = await tasksResponse.value.json();
        tasks = tasksData.tasks || [];
      }
      if (deploymentsResponse.status === "fulfilled" && deploymentsResponse.value.ok) {
        const deploymentsData = await deploymentsResponse.value.json();
        deployments = deploymentsData.deployments || [];
      }
      error = "";
    } catch (err) {
      console.error("Failed to refresh agent data:", err);
    } finally {
      loading = false;
    }
  }
  async function loadResourcesData() {
    if (!agent || getActualAgentStatus(agent) !== "online") {
      resourcesError = "Agent must be online to load resource data";
      return;
    }
    resourcesLoading = true;
    resourcesError = "";
    try {
      const commands = [
        {
          type: "docker_command",
          payload: {
            command: "ps",
            args: ["-a", "--format", "json"]
          }
        },
        {
          type: "docker_command",
          payload: {
            command: "images",
            args: ["--format", "json"]
          }
        },
        {
          type: "docker_command",
          payload: {
            command: "network",
            args: ["ls", "--format", "json"]
          }
        },
        {
          type: "docker_command",
          payload: {
            command: "volume",
            args: ["ls", "--format", "json"]
          }
        },
        {
          type: "docker_command",
          payload: {
            command: "compose",
            args: ["ls", "--format", "json"]
          }
        }
      ];
      const results = await Promise.allSettled(commands.map(async (cmd, index) => {
        const response = await fetch(`/api/agents/${agentId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cmd)
        });
        if (!response.ok) throw new Error(`Failed to execute ${cmd.payload.command}`);
        const result = await response.json();
        console.log("Task creation response:", result);
        if (!result.task?.id) {
          throw new Error(`No task ID returned for ${cmd.payload.command}`);
        }
        const taskId = result.task.id;
        return pollTaskCompletion(taskId, [
          "containers",
          "images",
          "networks",
          "volumes",
          "stacks"
        ][index]);
      }));
      const newResourcesData = {
        containers: [],
        images: [],
        networks: [],
        volumes: [],
        stacks: []
      };
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          const resourceType = [
            "containers",
            "images",
            "networks",
            "volumes",
            "stacks"
          ][index];
          console.log(`Assigning ${result.value.length} items to ${resourceType}:`, result.value);
          newResourcesData[resourceType] = result.value;
        } else {
          console.log(`Result ${index} failed:`, result);
        }
      });
      resourcesData = newResourcesData;
    } catch (err) {
      console.error("Failed to load resources data:", err);
      resourcesError = err instanceof Error ? err.message : "Failed to load resource data";
      toast.error("Failed to load resource data");
    } finally {
      resourcesLoading = false;
    }
  }
  async function pollTaskCompletion(taskId, resourceType) {
    const maxAttempts = 30;
    const delay = 1e3;
    console.log(`Polling task ${taskId} for ${resourceType}`);
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const response = await fetch(`/api/agents/${agentId}/tasks/${taskId}`, { credentials: "include" });
        console.log(`Task ${taskId} polling attempt ${i + 1}: ${response.status}`);
        if (!response.ok) {
          if (response.status === 403) {
            console.error(`Authentication failed for task ${taskId}`);
          }
          console.error(`Failed to fetch task ${taskId}: ${response.status} ${response.statusText}`);
          continue;
        }
        const responseData = await response.json();
        console.log(`Task ${taskId} response:`, responseData);
        const task = responseData.task;
        if (!task) {
          console.error(`No task data in response for ${taskId}`);
          continue;
        }
        console.log(`Task ${taskId} status: ${task.status}`);
        if (task.status === "completed") {
          console.log(`Task ${taskId} completed with result:`, task.result);
          if (!task.result) {
            console.warn(`Task ${taskId} completed but has no result`);
            return [];
          }
          let data2 = [];
          let outputString = "";
          if (task.result && typeof task.result === "object" && task.result.output) {
            outputString = task.result.output;
          } else if (typeof task.result === "string") {
            outputString = task.result;
          } else {
            console.warn(`Unexpected result format for task ${taskId}:`, task.result);
            return [];
          }
          console.log(`Raw output for ${resourceType}:`, outputString);
          if (outputString) {
            try {
              const parsed = JSON.parse(outputString);
              if (Array.isArray(parsed)) {
                data2 = parsed;
                console.log(`Parsed entire output as JSON array for ${resourceType}:`, data2);
              } else {
                data2.push(parsed);
              }
            } catch (parseError) {
              const lines = outputString.split("\n").filter((line) => line.trim());
              console.log(`Task ${taskId} has ${lines.length} lines to parse`);
              for (const line of lines) {
                try {
                  const parsed = JSON.parse(line.trim());
                  data2.push(parsed);
                } catch (lineParseError) {
                  console.warn(`Failed to parse line as JSON:`, line, lineParseError);
                }
              }
            }
          }
          console.log(`Parsed data for ${resourceType}:`, data2);
          return data2;
        } else if (task.status === "failed") {
          console.error(`Task ${taskId} failed:`, task.error);
          throw new Error(task.error || "Task failed");
        } else if (task.status === "running") {
          console.log(`Task ${taskId} is still running...`);
        } else {
          console.log(`Task ${taskId} is ${task.status}, continuing to poll...`);
        }
      } catch (err) {
        console.error(`Error polling task ${taskId}:`, err);
      }
    }
    console.error(`Task ${taskId} timed out after ${maxAttempts} seconds`);
    throw new Error(`Task ${taskId} timed out after ${maxAttempts} seconds`);
  }
  async function sendCommand() {
    if (!selectedCommand || taskExecuting) return;
    taskExecuting = true;
    try {
      let payload = {};
      switch (selectedCommand.value) {
        case "docker_version":
          payload = { command: "version" };
          break;
        case "docker_info":
          payload = { command: "info" };
          break;
        case "docker_ps":
          payload = { command: "ps", args: ["-a"] };
          break;
        case "docker_images":
          payload = { command: "images" };
          break;
        case "system_info":
          payload = { command: "system", args: ["info"] };
          break;
        case "agent_upgrade":
          payload = { action: "upgrade" };
          break;
        case "docker_prune":
          payload = { command: "system", args: ["prune", "-f"] };
          break;
        case "custom":
          if (!customCommand.trim()) {
            toast.error("Please enter a custom command");
            return;
          }
          const parts = customCommand.trim().split(" ");
          payload = {
            command: parts[0],
            args: parts.slice(1).concat(commandArgs ? commandArgs.split(" ") : [])
          };
          break;
      }
      const taskType = selectedCommand.value === "agent_upgrade" ? "agent_upgrade" : "docker_command";
      const response = await fetch(`/api/agents/${agentId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: taskType, payload })
      });
      if (!response.ok) {
        throw new Error(`Failed to send command: ${response.statusText}`);
      }
      const result = await response.json();
      toast.success("Command sent successfully");
      commandDialogOpen = false;
      selectedCommand = void 0;
      commandArgs = "";
      customCommand = "";
      setTimeout(refreshAgentData, 1e3);
    } catch (err) {
      console.error("Failed to send command:", err);
      toast.error(err instanceof Error ? err.message : "Failed to send command");
    } finally {
      taskExecuting = false;
    }
  }
  async function deleteAgentHandler() {
    if (!agent || deleting) return;
    openConfirmDialog({
      title: `Confirm Removal`,
      message: `Are you sure you want to remove this Agent? This action cannot be undone.`,
      confirm: {
        label: "Remove",
        destructive: true,
        action: async () => {
          handleApiResultWithCallbacks({
            result: await tryCatch(fetch(`/api/agents/${agentId}`, { method: "DELETE", credentials: "include" })),
            setLoadingState: (value) => deleting = value,
            message: "Failed to Remove Agent",
            onSuccess: async () => {
              toast.success("Agent Removed Successfully");
              await invalidateAll();
              goto();
            }
          });
        }
      }
    });
  }
  function getStatusClasses(agent2) {
    const actualStatus = getActualAgentStatus(agent2);
    if (actualStatus === "online") return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
  }
  function getStatusText(agent2) {
    const actualStatus = getActualAgentStatus(agent2);
    if (actualStatus === "online") return "Online";
    return "Offline";
  }
  function canSendCommands(agent2) {
    return getActualAgentStatus(agent2) === "online";
  }
  function getTaskStatusClasses(status) {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "running":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  }
  async function handleStackDeploy(data2) {
    try {
      const response = await fetch(`/api/agents/${agentId}/deploy/stack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data2),
        credentials: "include"
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to deploy stack: ${response.statusText}`);
      }
      const result = await response.json();
      toast.success(`Stack deployment started: ${result.task?.id || "Unknown task"}`);
      setTimeout(() => refreshAgentData(), 1e3);
    } catch (err) {
      console.error("Stack deploy error:", err);
      throw err;
    }
  }
  async function handleImagePull(imageName) {
    try {
      const response = await fetch(`/api/agents/${agentId}/deploy/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageName }),
        credentials: "include"
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to pull image: ${response.statusText}`);
      }
      const result = await response.json();
      toast.success(`Image pull started: ${result.task?.id || "Unknown task"}`);
    } catch (err) {
      console.error("Image pull error:", err);
      throw err;
    }
  }
  async function handleContainerRun(data2) {
    try {
      const response = await fetch(`/api/agents/${agentId}/deploy/container`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data2),
        credentials: "include"
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to run container: ${response.statusText}`);
      }
      const result = await response.json();
      toast.success(`Container started: ${result.task?.id || "Unknown task"}`);
    } catch (err) {
      console.error("Container run error:", err);
      throw err;
    }
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    head($$payload2, ($$payload3) => {
      $$payload3.title = `<title>Agent ${escape_html(agent?.hostname || agentId)} - Arcane</title>`;
    });
    $$payload2.out += `<div class="space-y-6"><!---->`;
    Breadcrumb($$payload2, {
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Breadcrumb_list($$payload3, {
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Breadcrumb_item($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Breadcrumb_link($$payload5, {
                  href: "/agents",
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Agents`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Breadcrumb_separator($$payload4, {});
            $$payload4.out += `<!----> <!---->`;
            Breadcrumb_item($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Breadcrumb_page($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->${escape_html(agent?.hostname || agentId)}`;
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
    $$payload2.out += `<!----> <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><h1 class="text-3xl font-bold tracking-tight">${escape_html(agent?.hostname || "Agent Details")}</h1> <p class="text-sm text-muted-foreground mt-1">${escape_html(agent ? `Agent ID: ${agent.id}` : "Loading agent information...")}</p></div> <div class="flex items-center gap-2">`;
    Button($$payload2, {
      variant: "outline",
      onclick: () => goto(),
      children: ($$payload3) => {
        Arrow_left($$payload3, { class: "size-4 mr-2" });
        $$payload3.out += `<!----> Back to Agents`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> `;
    if (agent) {
      $$payload2.out += "<!--[-->";
      Button($$payload2, {
        variant: "destructive",
        onclick: deleteAgentHandler,
        disabled: deleting,
        children: ($$payload3) => {
          Trash_2($$payload3, { class: "size-4 mr-2" });
          $$payload3.out += `<!----> Delete Agent`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      if (getActualAgentStatus(agent) === "online") {
        $$payload2.out += "<!--[-->";
        Button($$payload2, {
          onclick: () => commandDialogOpen = true,
          disabled: taskExecuting,
          children: ($$payload3) => {
            Terminal($$payload3, { class: "size-4 mr-2" });
            $$payload3.out += `<!----> Send Command`;
          },
          $$slots: { default: true }
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]-->`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--></div></div> `;
    if (error) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<!---->`;
      Alert($$payload2, {
        variant: "destructive",
        children: ($$payload3) => {
          Circle_alert($$payload3, { class: "size-4" });
          $$payload3.out += `<!----> <!---->`;
          Alert_title($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->Error`;
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
    } else if (agent) {
      $$payload2.out += "<!--[1-->";
      $$payload2.out += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><!---->`;
      Card($$payload2, {
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_content($$payload3, {
            class: "p-4 flex items-center space-x-3",
            children: ($$payload4) => {
              $$payload4.out += `<div class="bg-blue-500/10 p-2 rounded-full">`;
              Server($$payload4, { class: "size-5 text-blue-500" });
              $$payload4.out += `<!----></div> <div><p class="text-sm font-medium text-muted-foreground">Status</p> <span${attr_class(`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stringify(getStatusClasses(agent))}`)}>${escape_html(getStatusText(agent))}</span></div>`;
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
            class: "p-4 flex items-center space-x-3",
            children: ($$payload4) => {
              $$payload4.out += `<div class="bg-green-500/10 p-2 rounded-full">`;
              Monitor($$payload4, { class: "size-5 text-green-500" });
              $$payload4.out += `<!----></div> <div><p class="text-sm font-medium text-muted-foreground">Platform</p> <p class="font-semibold capitalize">${escape_html(agent.platform)}</p></div>`;
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
            class: "p-4 flex items-center space-x-3",
            children: ($$payload4) => {
              $$payload4.out += `<div class="bg-purple-500/10 p-2 rounded-full">`;
              Settings($$payload4, { class: "size-5 text-purple-500" });
              $$payload4.out += `<!----></div> <div><p class="text-sm font-medium text-muted-foreground">Version</p> <p class="font-semibold">${escape_html(agent.version)}</p></div>`;
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
            class: "p-4 flex items-center space-x-3",
            children: ($$payload4) => {
              $$payload4.out += `<div class="bg-amber-500/10 p-2 rounded-full">`;
              Clock($$payload4, { class: "size-5 text-amber-500" });
              $$payload4.out += `<!----></div> <div><p class="text-sm font-medium text-muted-foreground">Last Seen</p> <p class="font-semibold text-sm">${escape_html(formatDistanceToNow(new Date(agent.lastSeen)))} ago</p></div>`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div> `;
      if (agent.metrics) {
        $$payload2.out += "<!--[-->";
        Dropdown_card($$payload2, {
          id: "agent-metrics",
          title: "Resource Metrics",
          description: "View detailed Docker resource information",
          defaultExpanded: false,
          icon: Activity,
          children: ($$payload3) => {
            $$payload3.out += `<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"><div class="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">`;
            Container($$payload3, {
              class: "size-6 text-blue-600 dark:text-blue-400 mx-auto mb-1"
            });
            $$payload3.out += `<!----> <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">${escape_html(agent.metrics.containerCount ?? 0)}</p> <p class="text-sm text-blue-600/80 dark:text-blue-400/80">Containers</p></div> <div class="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">`;
            Hard_drive($$payload3, {
              class: "size-6 text-green-600 dark:text-green-400 mx-auto mb-1"
            });
            $$payload3.out += `<!----> <p class="text-2xl font-bold text-green-600 dark:text-green-400">${escape_html(agent.metrics.imageCount ?? 0)}</p> <p class="text-sm text-green-600/80 dark:text-green-400/80">Images</p></div> <div class="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">`;
            Network($$payload3, {
              class: "size-6 text-orange-600 dark:text-orange-400 mx-auto mb-1"
            });
            $$payload3.out += `<!----> <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">${escape_html(agent.metrics.networkCount ?? 0)}</p> <p class="text-sm text-orange-600/80 dark:text-orange-400/80">Networks</p></div> <div class="text-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">`;
            Database($$payload3, {
              class: "size-6 text-cyan-600 dark:text-cyan-400 mx-auto mb-1"
            });
            $$payload3.out += `<!----> <p class="text-2xl font-bold text-cyan-600 dark:text-cyan-400">${escape_html(agent.metrics.volumeCount ?? 0)}</p> <p class="text-sm text-cyan-600/80 dark:text-cyan-400/80">Volumes</p></div></div> `;
            if (agent.status === "online") {
              $$payload3.out += "<!--[-->";
              $$payload3.out += `<div class="space-y-4 pt-4 border-t border-border"><div class="flex items-center justify-between"><div><h4 class="font-medium mb-1">Resource Details</h4> <p class="text-sm text-muted-foreground">View detailed information about Docker resources</p></div> `;
              Button($$payload3, {
                variant: "outline",
                size: "sm",
                onclick: loadResourcesData,
                disabled: resourcesLoading,
                children: ($$payload4) => {
                  if (resourcesLoading) {
                    $$payload4.out += "<!--[-->";
                    Loader_circle($$payload4, { class: "size-4 mr-2 animate-spin" });
                    $$payload4.out += `<!----> Loading...`;
                  } else {
                    $$payload4.out += "<!--[!-->";
                    Refresh_cw($$payload4, { class: "size-4 mr-2" });
                    $$payload4.out += `<!----> Load Resources`;
                  }
                  $$payload4.out += `<!--]-->`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!----></div> `;
              if (resourcesError) {
                $$payload3.out += "<!--[-->";
                $$payload3.out += `<!---->`;
                Alert($$payload3, {
                  variant: "destructive",
                  children: ($$payload4) => {
                    Circle_alert($$payload4, { class: "size-4" });
                    $$payload4.out += `<!----> <!---->`;
                    Alert_title($$payload4, {
                      children: ($$payload5) => {
                        $$payload5.out += `<!---->Error Loading Resources`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload4.out += `<!----> <!---->`;
                    Alert_description($$payload4, {
                      children: ($$payload5) => {
                        $$payload5.out += `<!---->${escape_html(resourcesError)}`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload4.out += `<!---->`;
                  },
                  $$slots: { default: true }
                });
                $$payload3.out += `<!---->`;
              } else {
                $$payload3.out += "<!--[!-->";
              }
              $$payload3.out += `<!--]-->  `;
              if (resourcesData.containers.length > 0 || resourcesData.images.length > 0 || resourcesData.networks.length > 0 || resourcesData.volumes.length > 0 || resourcesData.stacks.length > 0) {
                $$payload3.out += "<!--[-->";
                $$payload3.out += `<!---->`;
                Root$1($$payload3, {
                  value: "containers",
                  class: "w-full",
                  children: ($$payload4) => {
                    $$payload4.out += `<!---->`;
                    Tabs_list($$payload4, {
                      class: "grid w-full grid-cols-5",
                      children: ($$payload5) => {
                        $$payload5.out += `<!---->`;
                        Tabs_trigger($$payload5, {
                          value: "containers",
                          class: "flex items-center gap-2",
                          children: ($$payload6) => {
                            Container($$payload6, { class: "size-4" });
                            $$payload6.out += `<!----> Containers (${escape_html(resourcesData.containers.length)})`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload5.out += `<!----> <!---->`;
                        Tabs_trigger($$payload5, {
                          value: "images",
                          class: "flex items-center gap-2",
                          children: ($$payload6) => {
                            Hard_drive($$payload6, { class: "size-4" });
                            $$payload6.out += `<!----> Images (${escape_html(resourcesData.images.length)})`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload5.out += `<!----> <!---->`;
                        Tabs_trigger($$payload5, {
                          value: "networks",
                          class: "flex items-center gap-2",
                          children: ($$payload6) => {
                            Network($$payload6, { class: "size-4" });
                            $$payload6.out += `<!----> Networks (${escape_html(resourcesData.networks.length)})`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload5.out += `<!----> <!---->`;
                        Tabs_trigger($$payload5, {
                          value: "volumes",
                          class: "flex items-center gap-2",
                          children: ($$payload6) => {
                            Database($$payload6, { class: "size-4" });
                            $$payload6.out += `<!----> Volumes (${escape_html(resourcesData.volumes.length)})`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload5.out += `<!----> <!---->`;
                        Tabs_trigger($$payload5, {
                          value: "stacks",
                          class: "flex items-center gap-2",
                          children: ($$payload6) => {
                            Layers($$payload6, { class: "size-4" });
                            $$payload6.out += `<!----> Compose Projects (${escape_html(resourcesData.stacks.length)})`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload5.out += `<!---->`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload4.out += `<!----> <!---->`;
                    Tabs_content($$payload4, {
                      value: "containers",
                      class: "mt-4",
                      children: ($$payload5) => {
                        if (resourcesData.containers.length > 0) {
                          $$payload5.out += "<!--[-->";
                          Universal_table($$payload5, {
                            data: resourcesData.containers,
                            columns: [
                              { accessorKey: "Names", header: "Name" },
                              { accessorKey: "Image", header: "Image" },
                              { accessorKey: "Status", header: "Status" },
                              { accessorKey: "Ports", header: "Ports" },
                              { accessorKey: "CreatedAt", header: "Created" }
                            ],
                            idKey: "ID",
                            features: { selection: false },
                            display: {
                              filterPlaceholder: "Search containers...",
                              noResultsMessage: "No containers found"
                            },
                            pagination: { pageSize: 10 }
                          });
                        } else {
                          $$payload5.out += "<!--[!-->";
                          $$payload5.out += `<div class="text-center py-8 text-muted-foreground">`;
                          Container($$payload5, { class: "size-12 mx-auto mb-4 opacity-50" });
                          $$payload5.out += `<!----> <p>No containers found</p></div>`;
                        }
                        $$payload5.out += `<!--]-->`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload4.out += `<!----> <!---->`;
                    Tabs_content($$payload4, {
                      value: "images",
                      class: "mt-4",
                      children: ($$payload5) => {
                        if (resourcesData.images.length > 0) {
                          $$payload5.out += "<!--[-->";
                          Universal_table($$payload5, {
                            data: resourcesData.images,
                            columns: [
                              {
                                accessorKey: "Repository",
                                header: "Repository"
                              },
                              { accessorKey: "Tag", header: "Tag" },
                              { accessorKey: "ID", header: "Image ID" },
                              { accessorKey: "CreatedAt", header: "Created" },
                              { accessorKey: "Size", header: "Size" }
                            ],
                            idKey: "ID",
                            features: { selection: false },
                            display: {
                              filterPlaceholder: "Search images...",
                              noResultsMessage: "No images found"
                            },
                            pagination: { pageSize: 10 }
                          });
                        } else {
                          $$payload5.out += "<!--[!-->";
                          $$payload5.out += `<div class="text-center py-8 text-muted-foreground">`;
                          Hard_drive($$payload5, { class: "size-12 mx-auto mb-4 opacity-50" });
                          $$payload5.out += `<!----> <p>No images found</p></div>`;
                        }
                        $$payload5.out += `<!--]-->`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload4.out += `<!----> <!---->`;
                    Tabs_content($$payload4, {
                      value: "networks",
                      class: "mt-4",
                      children: ($$payload5) => {
                        if (resourcesData.networks.length > 0) {
                          $$payload5.out += "<!--[-->";
                          Universal_table($$payload5, {
                            data: resourcesData.networks,
                            columns: [
                              { accessorKey: "Name", header: "Name" },
                              { accessorKey: "Driver", header: "Driver" },
                              { accessorKey: "Scope", header: "Scope" },
                              { accessorKey: "ID", header: "Network ID" },
                              { accessorKey: "CreatedAt", header: "Created" }
                            ],
                            idKey: "ID",
                            features: { selection: false },
                            display: {
                              filterPlaceholder: "Search networks...",
                              noResultsMessage: "No networks found"
                            },
                            pagination: { pageSize: 10 }
                          });
                        } else {
                          $$payload5.out += "<!--[!-->";
                          $$payload5.out += `<div class="text-center py-8 text-muted-foreground">`;
                          Network($$payload5, { class: "size-12 mx-auto mb-4 opacity-50" });
                          $$payload5.out += `<!----> <p>No networks found</p></div>`;
                        }
                        $$payload5.out += `<!--]-->`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload4.out += `<!----> <!---->`;
                    Tabs_content($$payload4, {
                      value: "volumes",
                      class: "mt-4",
                      children: ($$payload5) => {
                        if (resourcesData.volumes.length > 0) {
                          $$payload5.out += "<!--[-->";
                          Universal_table($$payload5, {
                            data: resourcesData.volumes,
                            columns: [
                              { accessorKey: "Name", header: "Name" },
                              { accessorKey: "Driver", header: "Driver" },
                              {
                                accessorKey: "Mountpoint",
                                header: "Mountpoint"
                              },
                              { accessorKey: "CreatedAt", header: "Created" }
                            ],
                            idKey: "Name",
                            features: { selection: false },
                            display: {
                              filterPlaceholder: "Search volumes...",
                              noResultsMessage: "No volumes found"
                            },
                            pagination: { pageSize: 10 }
                          });
                        } else {
                          $$payload5.out += "<!--[!-->";
                          $$payload5.out += `<div class="text-center py-8 text-muted-foreground">`;
                          Database($$payload5, { class: "size-12 mx-auto mb-4 opacity-50" });
                          $$payload5.out += `<!----> <p>No volumes found</p></div>`;
                        }
                        $$payload5.out += `<!--]-->`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload4.out += `<!----> <!---->`;
                    Tabs_content($$payload4, {
                      value: "stacks",
                      class: "mt-4",
                      children: ($$payload5) => {
                        if (resourcesData.stacks.length > 0) {
                          $$payload5.out += "<!--[-->";
                          Universal_table($$payload5, {
                            data: resourcesData.stacks,
                            columns: [
                              { accessorKey: "Name", header: "Project Name" },
                              { accessorKey: "Status", header: "Status" },
                              {
                                accessorKey: "ConfigFiles",
                                header: "Config Files"
                              }
                            ],
                            idKey: "Name",
                            features: { selection: false },
                            display: {
                              filterPlaceholder: "Search compose projects...",
                              noResultsMessage: "No compose projects found"
                            },
                            pagination: { pageSize: 10 }
                          });
                        } else {
                          $$payload5.out += "<!--[!-->";
                          $$payload5.out += `<div class="text-center py-8 text-muted-foreground">`;
                          Layers($$payload5, { class: "size-12 mx-auto mb-4 opacity-50" });
                          $$payload5.out += `<!----> <p>No compose projects found</p></div>`;
                        }
                        $$payload5.out += `<!--]-->`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload4.out += `<!---->`;
                  },
                  $$slots: { default: true }
                });
                $$payload3.out += `<!---->`;
              } else {
                $$payload3.out += "<!--[!-->";
                $$payload3.out += `<div class="text-center py-8 text-muted-foreground">`;
                Database($$payload3, { class: "size-12 mx-auto mb-4 opacity-50" });
                $$payload3.out += `<!----> <p class="font-medium">No Resource Data Loaded</p> <p class="text-sm">Click "Load Resources" to fetch Docker resource information</p></div>`;
              }
              $$payload3.out += `<!--]--></div>`;
            } else {
              $$payload3.out += "<!--[!-->";
            }
            $$payload3.out += `<!--]--> `;
            if (getActualAgentStatus(agent) === "online") {
              $$payload3.out += "<!--[-->";
              $$payload3.out += `<div class="space-y-4 pt-4 border-t border-border"><div class="flex items-center justify-between"><div><h4 class="font-medium mb-1">Deploy Resources</h4> <p class="text-sm text-muted-foreground">Deploy stacks, containers, or images to this agent</p></div></div> <div class="grid grid-cols-1 md:grid-cols-3 gap-4"><!---->`;
              Card($$payload3, {
                class: "cursor-pointer hover:border-primary/50 transition-colors",
                onclick: () => deployDialogOpen = true,
                children: ($$payload4) => {
                  $$payload4.out += `<!---->`;
                  Card_content($$payload4, {
                    class: "p-4",
                    children: ($$payload5) => {
                      $$payload5.out += `<div class="flex items-center space-x-3"><div class="bg-blue-500/10 p-2 rounded-lg">`;
                      Layers($$payload5, { class: "size-5 text-blue-500" });
                      $$payload5.out += `<!----></div> <div><h5 class="font-medium">Deploy Stack</h5> <p class="text-sm text-muted-foreground">Deploy a complete application stack</p></div></div>`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload4.out += `<!---->`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!----> <!---->`;
              Card($$payload3, {
                class: "cursor-pointer hover:border-primary/50 transition-colors",
                onclick: () => imageDialogOpen = true,
                children: ($$payload4) => {
                  $$payload4.out += `<!---->`;
                  Card_content($$payload4, {
                    class: "p-4",
                    children: ($$payload5) => {
                      $$payload5.out += `<div class="flex items-center space-x-3"><div class="bg-green-500/10 p-2 rounded-lg">`;
                      Download($$payload5, { class: "size-5 text-green-500" });
                      $$payload5.out += `<!----></div> <div><h5 class="font-medium">Pull Image</h5> <p class="text-sm text-muted-foreground">Download a Docker image</p></div></div>`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload4.out += `<!---->`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!----> <!---->`;
              Card($$payload3, {
                class: "cursor-pointer hover:border-primary/50 transition-colors",
                onclick: () => containerDialogOpen = true,
                children: ($$payload4) => {
                  $$payload4.out += `<!---->`;
                  Card_content($$payload4, {
                    class: "p-4",
                    children: ($$payload5) => {
                      $$payload5.out += `<div class="flex items-center space-x-3"><div class="bg-purple-500/10 p-2 rounded-lg">`;
                      Container($$payload5, { class: "size-5 text-purple-500" });
                      $$payload5.out += `<!----></div> <div><h5 class="font-medium">Run Container</h5> <p class="text-sm text-muted-foreground">Start a single container</p></div></div>`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload4.out += `<!---->`;
                },
                $$slots: { default: true }
              });
              $$payload3.out += `<!----></div> `;
              if (deployments.length > 0) {
                $$payload3.out += "<!--[-->";
                const each_array = ensure_array_like(deployments.slice(0, 3));
                $$payload3.out += `<div class="space-y-2"><h5 class="font-medium">Recent Deployments</h5> <div class="space-y-2"><!--[-->`;
                for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                  let deployment = each_array[$$index];
                  $$payload3.out += `<div class="flex items-center justify-between p-3 bg-muted/30 rounded-lg"><div class="flex items-center space-x-3"><div class="bg-blue-500/10 p-1.5 rounded">`;
                  if (deployment.type === "stack") {
                    $$payload3.out += "<!--[-->";
                    Layers($$payload3, { class: "size-4 text-blue-500" });
                  } else if (deployment.type === "image") {
                    $$payload3.out += "<!--[1-->";
                    Download($$payload3, { class: "size-4 text-green-500" });
                  } else {
                    $$payload3.out += "<!--[!-->";
                    Container($$payload3, { class: "size-4 text-purple-500" });
                  }
                  $$payload3.out += `<!--]--></div> <div><p class="font-medium text-sm">${escape_html(deployment.name)}</p> <p class="text-xs text-muted-foreground">${escape_html(deployment.type)} • ${escape_html(formatDistanceToNow(new Date(deployment.createdAt)))} ago</p></div></div> `;
                  Status_badge($$payload3, {
                    variant: deployment.status === "running" ? "green" : deployment.status === "failed" ? "red" : "amber",
                    text: deployment.status
                  });
                  $$payload3.out += `<!----></div>`;
                }
                $$payload3.out += `<!--]--></div></div>`;
              } else {
                $$payload3.out += "<!--[!-->";
              }
              $$payload3.out += `<!--]--></div>`;
            } else {
              $$payload3.out += "<!--[!-->";
            }
            $$payload3.out += `<!--]-->`;
          }
        });
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]--> <div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><!---->`;
      Card($$payload2, {
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_header($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<!---->`;
              Card_title($$payload4, {
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Agent Information`;
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
              const each_array_1 = ensure_array_like(agent.capabilities);
              $$payload4.out += `<div class="grid grid-cols-2 gap-4 text-sm"><div><span class="text-muted-foreground">Hostname</span> <p class="font-medium">${escape_html(agent.hostname)}</p></div> <div><span class="text-muted-foreground">Agent ID</span> <p class="font-mono text-xs">${escape_html(agent.id)}</p></div> <div><span class="text-muted-foreground">Created</span> <p class="font-medium">${escape_html(new Date(agent.createdAt).toLocaleDateString())}</p></div> <div><span class="text-muted-foreground">Updated</span> <p class="font-medium">${escape_html(agent.updatedAt ? new Date(agent.updatedAt).toLocaleDateString() : "Never")}</p></div></div> <div><span class="text-muted-foreground text-sm">Capabilities</span> <div class="flex flex-wrap gap-1 mt-1">`;
              if (each_array_1.length !== 0) {
                $$payload4.out += "<!--[-->";
                for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                  let capability = each_array_1[$$index_1];
                  $$payload4.out += `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">${escape_html(capability)}</span>`;
                }
              } else {
                $$payload4.out += "<!--[!-->";
                $$payload4.out += `<span class="text-muted-foreground text-sm">None</span>`;
              }
              $$payload4.out += `<!--]--></div></div> `;
              if (agent.dockerInfo) {
                $$payload4.out += "<!--[-->";
                $$payload4.out += `<div class="pt-4 border-t"><h4 class="font-medium mb-3">Docker Information</h4> <div class="grid grid-cols-2 gap-4 text-sm"><div><span class="text-muted-foreground">Docker Version</span> <p class="font-medium">${escape_html(agent.dockerInfo.version)}</p></div> <div><span class="text-muted-foreground">Containers</span> <p class="font-medium">${escape_html(agent.dockerInfo.containers)}</p></div> <div><span class="text-muted-foreground">Images</span> <p class="font-medium">${escape_html(agent.dockerInfo.images)}</p></div></div></div>`;
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
      $$payload2.out += `<!----> <!---->`;
      Card($$payload2, {
        children: ($$payload3) => {
          $$payload3.out += `<!---->`;
          Card_header($$payload3, {
            children: ($$payload4) => {
              $$payload4.out += `<div class="flex items-center justify-between"><!---->`;
              Card_title($$payload4, {
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Recent Tasks`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Button($$payload4, {
                variant: "outline",
                size: "sm",
                onclick: refreshAgentData,
                children: ($$payload5) => {
                  Refresh_cw($$payload5, { class: "size-4" });
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----></div>`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> <!---->`;
          Card_content($$payload3, {
            children: ($$payload4) => {
              if (tasks.length > 0) {
                $$payload4.out += "<!--[-->";
                const each_array_2 = ensure_array_like(tasks.slice(0, 10));
                $$payload4.out += `<div class="space-y-3 max-h-96 overflow-y-auto"><!--[-->`;
                for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                  let task = each_array_2[$$index_2];
                  $$payload4.out += `<div class="border rounded-lg p-3"><div class="flex items-center justify-between mb-2"><div class="flex items-center gap-2"><p class="font-medium text-sm">${escape_html(task.type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()))}</p> <span${attr_class(`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stringify(getTaskStatusClasses(task.status))}`)}>${escape_html(task.status)}</span></div> <p class="text-xs text-muted-foreground">${escape_html(formatDistanceToNow(new Date(task.createdAt)))} ago</p></div> `;
                  if (task.payload?.command) {
                    $$payload4.out += "<!--[-->";
                    $$payload4.out += `<div class="text-xs text-muted-foreground mb-2"><code class="bg-muted px-1 rounded">${escape_html(task.payload.command)} `;
                    if (task.payload.args?.length > 0) {
                      $$payload4.out += "<!--[-->";
                      $$payload4.out += `${escape_html(task.payload.args.join(" "))}`;
                    } else {
                      $$payload4.out += "<!--[!-->";
                    }
                    $$payload4.out += `<!--]--></code></div>`;
                  } else {
                    $$payload4.out += "<!--[!-->";
                  }
                  $$payload4.out += `<!--]--> `;
                  if (task.status === "completed" && task.result) {
                    $$payload4.out += "<!--[-->";
                    $$payload4.out += `<details class="mt-2"><summary class="cursor-pointer text-xs text-green-600 hover:text-green-500">View Output</summary> <div class="mt-2 p-2 bg-muted rounded text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">${escape_html(typeof task.result === "string" ? task.result : JSON.stringify(task.result, null, 2))}</div></details>`;
                  } else {
                    $$payload4.out += "<!--[!-->";
                  }
                  $$payload4.out += `<!--]--> `;
                  if (task.error) {
                    $$payload4.out += "<!--[-->";
                    $$payload4.out += `<details class="mt-2"><summary class="cursor-pointer text-xs text-red-600 hover:text-red-500">View Error</summary> <div class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400 max-h-32 overflow-y-auto">${escape_html(task.error)}</div></details>`;
                  } else {
                    $$payload4.out += "<!--[!-->";
                  }
                  $$payload4.out += `<!--]--></div>`;
                }
                $$payload4.out += `<!--]--></div>`;
              } else {
                $$payload4.out += "<!--[!-->";
                $$payload4.out += `<div class="text-center py-8 text-muted-foreground">`;
                Activity($$payload4, { class: "size-12 mx-auto mb-4 opacity-50" });
                $$payload4.out += `<!----> <p>No tasks executed yet</p></div>`;
              }
              $$payload4.out += `<!--]-->`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!---->`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----></div> `;
      if (agent && !canSendCommands(agent)) {
        $$payload2.out += "<!--[-->";
        $$payload2.out += `<!---->`;
        Alert($$payload2, {
          variant: "destructive",
          children: ($$payload3) => {
            Circle_alert($$payload3, { class: "size-4" });
            $$payload3.out += `<!----> <!---->`;
            Alert_title($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<!---->Agent Offline`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!----> <!---->`;
            Alert_description($$payload3, {
              children: ($$payload4) => {
                $$payload4.out += `<!---->This agent is not currently connected. Commands cannot be sent until the agent reconnects.`;
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
      $$payload2.out += `<!--]-->`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--></div> <!---->`;
    Root($$payload2, {
      get open() {
        return commandDialogOpen;
      },
      set open($$value) {
        commandDialogOpen = $$value;
        $$settled = false;
      },
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Dialog_content($$payload3, {
          class: "sm:max-w-md",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Send Command to Agent`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Execute a command on ${escape_html(agent?.hostname)}`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <div class="space-y-4"><div>`;
            Label($$payload4, {
              for: "command-select",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Command`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Root$2($$payload4, {
              type: "single",
              value: selectedCommand?.value,
              onValueChange: (v) => selectedCommand = predefinedCommands.find((cmd) => cmd.value === v),
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Select_trigger($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<span>${escape_html(selectedCommand?.label || "Select a command")}</span>`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Select_content($$payload5, {
                  children: ($$payload6) => {
                    const each_array_3 = ensure_array_like(predefinedCommands);
                    $$payload6.out += `<!--[-->`;
                    for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
                      let command = each_array_3[$$index_3];
                      $$payload6.out += `<!---->`;
                      Select_item($$payload6, {
                        value: command.value,
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->${escape_html(command.label)}`;
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
            $$payload4.out += `<!----></div> `;
            if (selectedCommand?.value === "custom") {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<div>`;
              Label($$payload4, {
                for: "custom-command",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Custom Command`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                id: "custom-command",
                placeholder: "docker ps -a",
                disabled: taskExecuting,
                get value() {
                  return customCommand;
                },
                set value($$value) {
                  customCommand = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div>`;
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]--> `;
            if (selectedCommand && selectedCommand.value !== "agent_upgrade") {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<div>`;
              Label($$payload4, {
                for: "command-args",
                children: ($$payload5) => {
                  $$payload5.out += `<!---->Additional Arguments (optional)`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----> `;
              Input($$payload4, {
                id: "command-args",
                placeholder: "--format table",
                disabled: taskExecuting,
                get value() {
                  return commandArgs;
                },
                set value($$value) {
                  commandArgs = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out += `<!----></div>`;
            } else {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]--></div> <!---->`;
            Dialog_footer($$payload4, {
              children: ($$payload5) => {
                Button($$payload5, {
                  variant: "outline",
                  onclick: () => commandDialogOpen = false,
                  disabled: taskExecuting,
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Cancel`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> `;
                Button($$payload5, {
                  onclick: sendCommand,
                  disabled: !selectedCommand || taskExecuting,
                  children: ($$payload6) => {
                    if (taskExecuting) {
                      $$payload6.out += "<!--[-->";
                      Refresh_cw($$payload6, { class: "size-4 mr-2 animate-spin" });
                      $$payload6.out += `<!----> Sending...`;
                    } else {
                      $$payload6.out += "<!--[!-->";
                      Play($$payload6, { class: "size-4 mr-2" });
                      $$payload6.out += `<!----> Send Command`;
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
    $$payload2.out += `<!----> <!---->`;
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
          class: "sm:max-w-2xl",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Deploy Stack to ${escape_html(agent?.hostname)}`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Choose a stack to deploy or create a new one`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            StackDeploymentForm($$payload4, {
              onClose: () => deployDialogOpen = false,
              onDeploy: handleStackDeploy
            });
            $$payload4.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <!---->`;
    Root($$payload2, {
      get open() {
        return imageDialogOpen;
      },
      set open($$value) {
        imageDialogOpen = $$value;
        $$settled = false;
      },
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Dialog_content($$payload3, {
          class: "sm:max-w-md",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Pull Image to ${escape_html(agent?.hostname)}`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Enter the image name to download`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            ImagePullForm($$payload4, {
              onClose: () => imageDialogOpen = false,
              onPull: handleImagePull
            });
            $$payload4.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <!---->`;
    Root($$payload2, {
      get open() {
        return containerDialogOpen;
      },
      set open($$value) {
        containerDialogOpen = $$value;
        $$settled = false;
      },
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Dialog_content($$payload3, {
          class: "sm:max-w-xl",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Run Container on ${escape_html(agent?.hostname)}`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Quickly start a container from an image`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            QuickContainerForm($$payload4, {
              onClose: () => containerDialogOpen = false,
              onRun: handleContainerRun
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
//# sourceMappingURL=_page.svelte-B8eDj6Ku.js.map
