import { p as push, j as spread_props, a as pop, u as copy_payload, v as assign_payload, t as bind_props, k as escape_html, l as ensure_array_like, d as attr_class, n as stringify, b as attr } from "../../../chunks/index3.js";
import { B as Button, c as cn } from "../../../chunks/button.js";
import { C as Card } from "../../../chunks/card.js";
import { C as Card_content, a as Card_header, b as Card_title } from "../../../chunks/card-title.js";
import "clsx";
import { U as Universal_table, T as Table_cell, E as Ellipsis } from "../../../chunks/universal-table.js";
import { o as openConfirmDialog } from "../../../chunks/index8.js";
import { R as Root$3, T as Trigger, D as Dropdown_menu_content, G as Group$1 } from "../../../chunks/index10.js";
import { R as Root, D as Dialog_content, a as Dialog_header, b as Dialog_title, c as Dialog_footer } from "../../../chunks/index7.js";
import { I as Input } from "../../../chunks/input.js";
import { L as Label } from "../../../chunks/label.js";
import { R as Root$2, S as Select_trigger, a as Select_content, G as Group, b as Select_item } from "../../../chunks/index11.js";
import { R as Root$1, T as Tabs_list, a as Tabs_trigger, b as Tabs_content } from "../../../chunks/index12.js";
import { p as parseBytes } from "../../../chunks/bytes.util.js";
import { a as toast } from "../../../chunks/Toaster.svelte_svelte_type_style_lang.js";
import { i as invalidateAll, g as goto } from "../../../chunks/client.js";
import { S as Switch } from "../../../chunks/switch.js";
import { h as handleApiResultWithCallbacks } from "../../../chunks/api.util.js";
import { t as tryCatch } from "../../../chunks/try-catch.js";
import { C as ContainerAPIService } from "../../../chunks/container-api-service.js";
import { A as Arcane_button, S as Scan_search, R as Rotate_ccw } from "../../../chunks/arcane-button.js";
import { D as Dialog_description } from "../../../chunks/dialog-description.js";
import { C as Circle_alert } from "../../../chunks/circle-alert.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { P as Plus } from "../../../chunks/plus.js";
import { S as Status_badge } from "../../../chunks/status-badge.js";
import { s as statusVariantMap } from "../../../chunks/statuses.js";
import { p as parseStatusTime, s as shortId, c as capitalizeFirstLetter } from "../../../chunks/string.utils.js";
import { t as tablePersistence } from "../../../chunks/table-store.js";
import { B as Box } from "../../../chunks/box.js";
import { R as Refresh_cw } from "../../../chunks/refresh-cw.js";
import { D as Dropdown_menu_item } from "../../../chunks/dropdown-menu-item.js";
import { P as Play } from "../../../chunks/play.js";
import { C as Circle_stop } from "../../../chunks/circle-stop.js";
import { D as Dropdown_menu_separator } from "../../../chunks/dropdown-menu-separator.js";
import { T as Trash_2 } from "../../../chunks/trash-2.js";
import { L as Loader_circle } from "../../../chunks/loader-circle.js";
function Eye_off($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"
      }
    ],
    [
      "path",
      { "d": "M14.084 14.158a3 3 0 0 1-4.242-4.242" }
    ],
    [
      "path",
      {
        "d": "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"
      }
    ],
    ["path", { "d": "m2 2 20 20" }]
  ];
  Icon($$payload, spread_props([
    { name: "eye-off" },
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
function Eye($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
      }
    ],
    [
      "circle",
      { "cx": "12", "cy": "12", "r": "3" }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "eye" },
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
function Trash($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M3 6h18" }],
    [
      "path",
      { "d": "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }
    ],
    [
      "path",
      { "d": "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "trash" },
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
function Create_container_dialog($$payload, $$props) {
  push();
  let {
    open = false,
    volumes = [],
    networks = [],
    images = [],
    onClose: onCloseProp = () => {
    }
  } = $$props;
  const containerApi = new ContainerAPIService();
  let isCreating = false;
  let containerName = "";
  let selectedImage = "";
  let selectedTab = "basic";
  let ports = [
    {
      hostPort: "",
      containerPort: "",
      protocol: "tcp"
    }
  ];
  let volumeMounts = [{ source: "", target: "", readOnly: false }];
  let envVars = [{ key: "", value: "", sensitive: true }];
  const restartPolicyOptions = [
    { value: "no", label: "No" },
    { value: "always", label: "Always" },
    { value: "on-failure", label: "On Failure" },
    {
      value: "unless-stopped",
      label: "Unless Stopped"
    }
  ];
  let networkMode = "";
  let restartPolicy = "unless-stopped";
  const selectedRestartPolicyLabel = restartPolicyOptions.find((opt) => opt.value === restartPolicy)?.label || restartPolicy;
  let ipv4Address = "";
  let ipv6Address = "";
  let enableHealthcheck = false;
  let healthcheckTest = [""];
  let healthcheckInterval = void 0;
  let healthcheckTimeout = void 0;
  let healthcheckRetries = void 0;
  let healthcheckStartPeriod = void 0;
  let labels = [{ key: "", value: "" }];
  let commandOverride = "";
  let runAsUser = "";
  let memoryLimitStr = "";
  let cpuLimitStr = "";
  let autoUpdate = false;
  function handleClose() {
    open = false;
    if (onCloseProp) {
      onCloseProp();
    }
  }
  function validatePortNumber(port) {
    const portStr = typeof port === "number" ? port.toString() : port;
    if (!portStr || !portStr.trim()) return { isValid: true };
    const portNum = parseInt(portStr, 10);
    if (isNaN(portNum) || portNum.toString() !== portStr.trim()) {
      return { isValid: false, error: "Invalid port number" };
    }
    if (portNum < 1 || portNum > 65535) {
      return {
        isValid: false,
        error: "Port must be between 1-65535"
      };
    }
    return { isValid: true };
  }
  function addPort() {
    ports = [
      ...ports,
      {
        hostPort: "",
        containerPort: "",
        protocol: "tcp"
      }
    ];
  }
  function removePort(index) {
    ports = ports.filter((_, i) => i !== index);
    if (ports.length === 0) addPort();
  }
  function addVolumeMount() {
    volumeMounts = [
      ...volumeMounts,
      { source: "", target: "", readOnly: false }
    ];
  }
  function removeVolumeMount(index) {
    volumeMounts = volumeMounts.filter((_, i) => i !== index);
    if (volumeMounts.length === 0) addVolumeMount();
  }
  function addEnvVar() {
    envVars = [
      ...envVars,
      { key: "", value: "", sensitive: true }
    ];
  }
  function removeEnvVar(index) {
    envVars = envVars.filter((_, i) => i !== index);
    if (envVars.length === 0) addEnvVar();
  }
  function addLabel() {
    labels = [...labels, { key: "", value: "" }];
  }
  function removeLabel(index) {
    labels = labels.filter((_, i) => i !== index);
    if (labels.length === 0) addLabel();
  }
  const isUserDefinedNetworkSelected = networkMode && networkMode !== "" && networkMode !== "host" && networkMode !== "none" && networkMode !== "bridge";
  async function handleSubmit() {
    if (!selectedImage) {
      toast.error("Image selection is required");
      return;
    }
    if (!containerName.trim()) {
      toast.error("Container name is required");
      return;
    }
    if (isCreating) {
      return;
    }
    console.log("Creating container with options:", {
      Name: containerName.trim(),
      Image: selectedImage
      // log other important options
    });
    let hasInvalidPort = false;
    ports.forEach((port) => {
      if (port.hostPort && validatePortNumber(port.hostPort).error && validatePortNumber(port.hostPort).error !== "Privileged port (<1024)" || port.containerPort && validatePortNumber(port.containerPort).error && validatePortNumber(port.containerPort).error !== "Privileged port (<1024)") {
        hasInvalidPort = true;
      }
    });
    if (hasInvalidPort) {
      toast.error("Please fix invalid port numbers before submitting.");
      return;
    }
    isCreating = true;
    const finalLabels = labels.filter((l) => l.key.trim()).reduce(
      (acc, label) => {
        acc[label.key.trim()] = label.value.trim();
        return acc;
      },
      {}
    );
    if (autoUpdate) {
      finalLabels["arcane.auto-update"] = "true";
    }
    const exposedPorts = {};
    const portBindings = {};
    ports.filter((p) => p.hostPort.trim() && p.containerPort.trim()).forEach((p) => {
      const key = `${p.containerPort.trim()}/${p.protocol || "tcp"}`;
      exposedPorts[key] = {};
      portBindings[key] = [{ HostPort: p.hostPort.trim() }];
    });
    const binds = volumeMounts.filter((v) => v.source.trim() && v.target.trim()).map((v) => `${v.source.trim()}:${v.target.trim()}${v.readOnly ? ":ro" : ""}`);
    const env = envVars.filter((e) => e.key.trim()).map((e) => `${e.key.trim()}=${e.value}`);
    let healthcheckConfig = void 0;
    if (enableHealthcheck && healthcheckTest.length > 0 && healthcheckTest[0].trim() !== "") {
      const toNano = (seconds) => seconds ? seconds * 1e9 : void 0;
      healthcheckConfig = {
        Test: healthcheckTest.filter((t) => t.trim() !== ""),
        // Ensure Test is not empty strings
        Interval: toNano(healthcheckInterval),
        Timeout: toNano(healthcheckTimeout),
        Retries: healthcheckRetries,
        StartPeriod: toNano(healthcheckStartPeriod)
      };
      if (healthcheckConfig && healthcheckConfig.Test && healthcheckConfig.Test.length === 0) healthcheckConfig = void 0;
    }
    let memoryBytes;
    try {
      memoryBytes = memoryLimitStr.trim() ? parseBytes(memoryLimitStr.trim()) : void 0;
    } catch (e) {
      console.error("Invalid memory format:", e);
      toast.error(`Invalid memory format: ${memoryLimitStr}`);
      isCreating = false;
      return;
    }
    let nanoCPUs;
    try {
      const cpuVal = cpuLimitStr.trim() ? parseFloat(cpuLimitStr.trim()) : void 0;
      if (cpuVal !== void 0) {
        if (isNaN(cpuVal) || cpuVal <= 0) {
          throw new Error("CPU Limit must be a positive number");
        }
        nanoCPUs = cpuVal * 1e9;
      }
    } catch (e) {
      console.error("Invalid CPU format:", e);
      toast.error(e.message || `Invalid CPU format: ${cpuLimitStr}`);
      isCreating = false;
      return;
    }
    const createOptions = {
      name: containerName.trim(),
      Image: selectedImage,
      Cmd: commandOverride.trim() ? commandOverride.trim().split(/\s+/) : void 0,
      User: runAsUser.trim() || void 0,
      Labels: Object.keys(finalLabels).length > 0 ? finalLabels : void 0,
      Env: env.length > 0 ? env : void 0,
      ExposedPorts: Object.keys(exposedPorts).length > 0 ? exposedPorts : void 0,
      Healthcheck: healthcheckConfig,
      HostConfig: {
        PortBindings: Object.keys(portBindings).length > 0 ? portBindings : void 0,
        Binds: binds.length > 0 ? binds : void 0,
        RestartPolicy: { Name: restartPolicy },
        Memory: memoryBytes,
        NanoCpus: nanoCPUs,
        NetworkMode: networkMode || void 0
        // Default is 'bridge' if empty string
      }
    };
    if (isUserDefinedNetworkSelected && (ipv4Address.trim() || ipv6Address.trim())) {
      createOptions.NetworkingConfig = {
        EndpointsConfig: {
          [networkMode]: {
            // networkMode here is the name of the user-defined network
            IPAMConfig: {
              IPv4Address: ipv4Address.trim() || void 0,
              IPv6Address: ipv6Address.trim() || void 0
            }
          }
        }
      };
      if (createOptions.HostConfig) {
        createOptions.HostConfig.NetworkMode = networkMode;
      }
    } else if (networkMode && createOptions.HostConfig) {
      createOptions.HostConfig.NetworkMode = networkMode;
    }
    handleApiResultWithCallbacks({
      result: await tryCatch(containerApi.create(createOptions)),
      // Pass ContainerCreateOptions
      message: "Failed to Create Container",
      setLoadingState: (value) => isCreating = value,
      onSuccess: async () => {
        toast.success(`Container "${createOptions.name}" created successfully!`);
        await invalidateAll();
        handleClose();
      },
      onError: () => {
        isCreating = false;
      }
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
          class: "sm:max-w-[700px]",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Create Container`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Dialog_description($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Configure and run a new Docker container`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Root$1($$payload4, {
              value: selectedTab,
              class: "w-full",
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Tabs_list($$payload5, {
                  class: "w-full grid grid-cols-7",
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->`;
                    Tabs_trigger($$payload6, {
                      value: "basic",
                      class: "px-1 text-xs sm:text-sm",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Basic`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Tabs_trigger($$payload6, {
                      value: "ports",
                      class: "px-1 text-xs sm:text-sm",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Ports`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Tabs_trigger($$payload6, {
                      value: "volumes",
                      class: "px-1 text-xs sm:text-sm",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Volumes`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Tabs_trigger($$payload6, {
                      value: "env",
                      class: "px-1 text-xs sm:text-sm",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Environment`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Tabs_trigger($$payload6, {
                      value: "network",
                      class: "px-1 text-xs sm:text-sm",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Network`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Tabs_trigger($$payload6, {
                      value: "healthcheck",
                      class: "px-1 text-xs sm:text-sm",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Healthcheck`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Tabs_trigger($$payload6, {
                      value: "advanced",
                      class: "px-1 text-xs sm:text-sm",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Advanced`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!---->`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <div class="p-4 max-h-[60vh] overflow-y-auto"><div class="space-y-6"><!---->`;
                Tabs_content($$payload5, {
                  value: "basic",
                  children: ($$payload6) => {
                    $$payload6.out += `<div class="space-y-4"><div class="grid grid-cols-1 gap-2">`;
                    Label($$payload6, {
                      for: "container-name",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Name`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> `;
                    Input($$payload6, {
                      id: "container-name",
                      placeholder: "e.g., my-container",
                      disabled: isCreating,
                      get value() {
                        return containerName;
                      },
                      set value($$value) {
                        containerName = $$value;
                        $$settled = false;
                      }
                    });
                    $$payload6.out += `<!----></div> <div class="grid grid-cols-1 gap-2">`;
                    Label($$payload6, {
                      for: "container-image",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Image`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Root$2($$payload6, {
                      type: "single",
                      disabled: isCreating,
                      get value() {
                        return selectedImage;
                      },
                      set value($$value) {
                        selectedImage = $$value;
                        $$settled = false;
                      },
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->`;
                        Select_trigger($$payload7, {
                          class: "w-full",
                          children: ($$payload8) => {
                            $$payload8.out += `<span>${escape_html(selectedImage || "Select an image")}</span>`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload7.out += `<!----> <!---->`;
                        Select_content($$payload7, {
                          children: ($$payload8) => {
                            $$payload8.out += `<!---->`;
                            Group($$payload8, {
                              children: ($$payload9) => {
                                const each_array = ensure_array_like(images);
                                $$payload9.out += `<!--[-->`;
                                for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                                  let image = each_array[$$index];
                                  $$payload9.out += `<!---->`;
                                  Select_item($$payload9, {
                                    value: image.repo + ":" + image.tag,
                                    children: ($$payload10) => {
                                      $$payload10.out += `<!---->${escape_html(image.repo + ":" + image.tag)}`;
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
                        $$payload7.out += `<!---->`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----></div> <div class="grid grid-cols-1 gap-2">`;
                    Label($$payload6, {
                      for: "restart-policy",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Restart Policy`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Root$2($$payload6, {
                      type: "single",
                      disabled: isCreating,
                      get value() {
                        return restartPolicy;
                      },
                      set value($$value) {
                        restartPolicy = $$value;
                        $$settled = false;
                      },
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->`;
                        Select_trigger($$payload7, {
                          class: "w-full",
                          children: ($$payload8) => {
                            $$payload8.out += `<span>${escape_html(selectedRestartPolicyLabel)}</span>`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload7.out += `<!----> <!---->`;
                        Select_content($$payload7, {
                          children: ($$payload8) => {
                            const each_array_1 = ensure_array_like(restartPolicyOptions);
                            $$payload8.out += `<!--[-->`;
                            for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                              let option = each_array_1[$$index_1];
                              $$payload8.out += `<!---->`;
                              Select_item($$payload8, {
                                label: option.label,
                                value: option.value,
                                children: ($$payload9) => {
                                  $$payload9.out += `<!---->${escape_html(option.label)}`;
                                },
                                $$slots: { default: true }
                              });
                              $$payload8.out += `<!---->`;
                            }
                            $$payload8.out += `<!--]-->`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload7.out += `<!---->`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----></div></div>`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Tabs_content($$payload5, {
                  value: "ports",
                  children: ($$payload6) => {
                    const each_array_2 = ensure_array_like(ports);
                    $$payload6.out += `<div class="space-y-4"><!--[-->`;
                    for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
                      let port = each_array_2[index];
                      $$payload6.out += `<div class="flex space-x-3 items-end"><div class="flex-1 grid grid-cols-3 gap-4"><div>`;
                      Label($$payload6, {
                        for: `host-port-${index}`,
                        class: "mb-2 block text-sm",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Host Port`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: `host-port-${index}`,
                        placeholder: "e.g., 8080",
                        disabled: isCreating,
                        type: "text",
                        pattern: "[0-9]*",
                        inputmode: "numeric",
                        class: port.hostError && port.hostPort && port.hostError !== "Privileged port (<1024)" ? "border-red-500" : "",
                        get value() {
                          return port.hostPort;
                        },
                        set value($$value) {
                          port.hostPort = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----> `;
                      if (port.hostError && port.hostPort) {
                        $$payload6.out += "<!--[-->";
                        $$payload6.out += `<div${attr_class(`flex items-center text-xs mt-1 ${stringify(port.hostError === "Privileged port (<1024)" ? "text-amber-600" : "text-red-500")}`)}>`;
                        Circle_alert($$payload6, { class: "mr-1 size-3" });
                        $$payload6.out += `<!----> ${escape_html(port.hostError)}</div>`;
                      } else {
                        $$payload6.out += "<!--[!-->";
                      }
                      $$payload6.out += `<!--]--></div> <div>`;
                      Label($$payload6, {
                        for: `container-port-${index}`,
                        class: "mb-2 block text-sm",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Container Port`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: `container-port-${index}`,
                        placeholder: "e.g., 80",
                        disabled: isCreating,
                        type: "text",
                        pattern: "[0-9]*",
                        inputmode: "numeric",
                        class: port.containerError && port.containerPort && port.containerError !== "Privileged port (<1024)" ? "border-red-500" : "",
                        get value() {
                          return port.containerPort;
                        },
                        set value($$value) {
                          port.containerPort = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----> `;
                      if (port.containerError && port.containerPort) {
                        $$payload6.out += "<!--[-->";
                        $$payload6.out += `<div${attr_class(`flex items-center text-xs mt-1 ${stringify(port.containerError === "Privileged port (<1024)" ? "text-amber-600" : "text-red-500")}`)}>`;
                        Circle_alert($$payload6, { class: "mr-1 size-3" });
                        $$payload6.out += `<!----> ${escape_html(port.containerError)}</div>`;
                      } else {
                        $$payload6.out += "<!--[!-->";
                      }
                      $$payload6.out += `<!--]--></div> <div>`;
                      Label($$payload6, {
                        for: `port-protocol-${index}`,
                        class: "mb-2 block text-sm",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Protocol`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> <!---->`;
                      Root$2($$payload6, {
                        type: "single",
                        disabled: isCreating,
                        get value() {
                          return port.protocol;
                        },
                        set value($$value) {
                          port.protocol = $$value;
                          $$settled = false;
                        },
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->`;
                          Select_trigger($$payload7, {
                            class: "w-full",
                            children: ($$payload8) => {
                              $$payload8.out += `<span>${escape_html(port.protocol?.toUpperCase() || "TCP")}</span>`;
                            },
                            $$slots: { default: true }
                          });
                          $$payload7.out += `<!----> <!---->`;
                          Select_content($$payload7, {
                            children: ($$payload8) => {
                              $$payload8.out += `<!---->`;
                              Select_item($$payload8, {
                                value: "tcp",
                                children: ($$payload9) => {
                                  $$payload9.out += `<!---->TCP`;
                                },
                                $$slots: { default: true }
                              });
                              $$payload8.out += `<!----> <!---->`;
                              Select_item($$payload8, {
                                value: "udp",
                                children: ($$payload9) => {
                                  $$payload9.out += `<!---->UDP`;
                                },
                                $$slots: { default: true }
                              });
                              $$payload8.out += `<!----> <!---->`;
                              Select_item($$payload8, {
                                value: "sctp",
                                children: ($$payload9) => {
                                  $$payload9.out += `<!---->SCTP`;
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
                      $$payload6.out += `<!----></div></div> `;
                      Button($$payload6, {
                        variant: "destructive",
                        size: "icon",
                        type: "button",
                        onclick: () => removePort(index),
                        disabled: ports.length <= 1 && !ports[0].hostPort && !ports[0].containerPort || isCreating,
                        class: "shrink-0",
                        children: ($$payload7) => {
                          Trash($$payload7, { class: "size-4" });
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----></div>`;
                    }
                    $$payload6.out += `<!--]--> `;
                    Button($$payload6, {
                      variant: "outline",
                      type: "button",
                      onclick: addPort,
                      class: "w-full",
                      disabled: isCreating,
                      children: ($$payload7) => {
                        Plus($$payload7, { class: "mr-2 size-4" });
                        $$payload7.out += `<!----> Add Port Mapping`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----></div>`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Tabs_content($$payload5, {
                  value: "volumes",
                  children: ($$payload6) => {
                    const each_array_3 = ensure_array_like(volumeMounts);
                    $$payload6.out += `<div class="space-y-4"><!--[-->`;
                    for (let index = 0, $$length = each_array_3.length; index < $$length; index++) {
                      let mount = each_array_3[index];
                      $$payload6.out += `<div class="flex space-x-3 items-end"><div class="flex-1 grid grid-cols-2 gap-4 items-center"><div>`;
                      Label($$payload6, {
                        for: `volume-source-${index}`,
                        class: "mb-2 block",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Host Path / Volume Name`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: `volume-source-${index}`,
                        placeholder: "e.g., /path/on/host or my_volume",
                        disabled: isCreating,
                        get value() {
                          return mount.source;
                        },
                        set value($$value) {
                          mount.source = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----></div> <div>`;
                      Label($$payload6, {
                        for: `volume-target-${index}`,
                        class: "mb-2 block",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Container Path`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: `volume-target-${index}`,
                        placeholder: "/data_in_container",
                        disabled: isCreating,
                        get value() {
                          return mount.target;
                        },
                        set value($$value) {
                          mount.target = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----></div></div> <div class="flex items-center pt-6">`;
                      Switch($$payload6, {
                        id: `volume-readonly-${index}`,
                        disabled: isCreating,
                        get checked() {
                          return mount.readOnly;
                        },
                        set checked($$value) {
                          mount.readOnly = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----> `;
                      Label($$payload6, {
                        for: `volume-readonly-${index}`,
                        class: "ml-2 text-sm",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Read-only`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----></div> `;
                      Button($$payload6, {
                        variant: "destructive",
                        size: "icon",
                        type: "button",
                        onclick: () => removeVolumeMount(index),
                        disabled: volumeMounts.length <= 1 && !volumeMounts[0].source && !volumeMounts[0].target || isCreating,
                        class: "shrink-0",
                        children: ($$payload7) => {
                          Trash($$payload7, { class: "size-4" });
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----></div>`;
                    }
                    $$payload6.out += `<!--]--> `;
                    Button($$payload6, {
                      variant: "outline",
                      type: "button",
                      onclick: addVolumeMount,
                      class: "w-full",
                      disabled: isCreating,
                      children: ($$payload7) => {
                        Plus($$payload7, { class: "mr-2 size-4" });
                        $$payload7.out += `<!----> Add Volume Mount`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----></div>`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Tabs_content($$payload5, {
                  value: "env",
                  children: ($$payload6) => {
                    const each_array_4 = ensure_array_like(envVars);
                    $$payload6.out += `<div class="space-y-4"><!--[-->`;
                    for (let index = 0, $$length = each_array_4.length; index < $$length; index++) {
                      let env = each_array_4[index];
                      $$payload6.out += `<div class="flex space-x-3 items-end"><div class="flex-1 grid grid-cols-2 gap-4"><div>`;
                      Label($$payload6, {
                        for: `env-key-${index}`,
                        class: "mb-2 block",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Key`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: `env-key-${index}`,
                        placeholder: "MYSQL_ROOT_PASSWORD",
                        disabled: isCreating,
                        get value() {
                          return env.key;
                        },
                        set value($$value) {
                          env.key = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----></div> <div>`;
                      Label($$payload6, {
                        for: `env-value-${index}`,
                        class: "mb-2 block",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Value`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> <div class="flex items-center gap-2">`;
                      Input($$payload6, {
                        id: `env-value-${index}`,
                        type: env.sensitive ? "password" : "text",
                        placeholder: "secret",
                        disabled: isCreating,
                        get value() {
                          return env.value;
                        },
                        set value($$value) {
                          env.value = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----> `;
                      Button($$payload6, {
                        variant: "outline",
                        size: "icon",
                        type: "button",
                        onclick: () => {
                          env.sensitive = !env.sensitive;
                        },
                        disabled: isCreating,
                        title: env.sensitive ? "Show value" : "Hide value",
                        children: ($$payload7) => {
                          if (env.sensitive) {
                            $$payload7.out += "<!--[-->";
                            Eye($$payload7, { class: "size-4" });
                          } else {
                            $$payload7.out += "<!--[!-->";
                            Eye_off($$payload7, { class: "size-4" });
                          }
                          $$payload7.out += `<!--]-->`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----></div></div></div> `;
                      Button($$payload6, {
                        variant: "destructive",
                        size: "icon",
                        type: "button",
                        onclick: () => removeEnvVar(index),
                        disabled: envVars.length <= 1 && !envVars[0].key && !envVars[0].value || isCreating,
                        class: "shrink-0",
                        children: ($$payload7) => {
                          Trash($$payload7, { class: "size-4" });
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----></div>`;
                    }
                    $$payload6.out += `<!--]--> `;
                    Button($$payload6, {
                      variant: "outline",
                      type: "button",
                      onclick: addEnvVar,
                      class: "w-full",
                      disabled: isCreating,
                      children: ($$payload7) => {
                        Plus($$payload7, { class: "mr-2 size-4" });
                        $$payload7.out += `<!----> Add Environment Variable`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----></div>`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Tabs_content($$payload5, {
                  value: "network",
                  children: ($$payload6) => {
                    $$payload6.out += `<div class="space-y-4"><div class="grid grid-cols-1 gap-2">`;
                    Label($$payload6, {
                      for: "container-network",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Network Mode / Name`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <!---->`;
                    Root$2($$payload6, {
                      type: "single",
                      disabled: isCreating,
                      get value() {
                        return networkMode;
                      },
                      set value($$value) {
                        networkMode = $$value;
                        $$settled = false;
                      },
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->`;
                        Select_trigger($$payload7, {
                          class: "w-full",
                          children: ($$payload8) => {
                            $$payload8.out += `<span>${escape_html(networkMode || "Default (bridge)")}</span>`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload7.out += `<!----> <!---->`;
                        Select_content($$payload7, {
                          children: ($$payload8) => {
                            const each_array_5 = ensure_array_like(networks.filter((n) => n.Name !== "bridge" && n.Name !== "host" && n.Name !== "none"));
                            $$payload8.out += `<!---->`;
                            Select_item($$payload8, {
                              value: "",
                              children: ($$payload9) => {
                                $$payload9.out += `<!---->Default (bridge)`;
                              },
                              $$slots: { default: true }
                            });
                            $$payload8.out += `<!----> <!---->`;
                            Select_item($$payload8, {
                              value: "host",
                              children: ($$payload9) => {
                                $$payload9.out += `<!---->Host`;
                              },
                              $$slots: { default: true }
                            });
                            $$payload8.out += `<!----> <!---->`;
                            Select_item($$payload8, {
                              value: "none",
                              children: ($$payload9) => {
                                $$payload9.out += `<!---->None`;
                              },
                              $$slots: { default: true }
                            });
                            $$payload8.out += `<!----> <!--[-->`;
                            for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
                              let net = each_array_5[$$index_5];
                              $$payload8.out += `<!---->`;
                              Select_item($$payload8, {
                                value: net.Name,
                                children: ($$payload9) => {
                                  $$payload9.out += `<!---->${escape_html(net.Name)} (${escape_html(net.Driver)})`;
                                },
                                $$slots: { default: true }
                              });
                              $$payload8.out += `<!---->`;
                            }
                            $$payload8.out += `<!--]-->`;
                          },
                          $$slots: { default: true }
                        });
                        $$payload7.out += `<!---->`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----></div> `;
                    if (isUserDefinedNetworkSelected) {
                      $$payload6.out += "<!--[-->";
                      $$payload6.out += `<div class="border-t pt-4 mt-4 space-y-4"><p class="text-sm text-muted-foreground">Optional: Assign static IP addresses (requires network with IPAM configured).</p> <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="grid grid-cols-1 gap-2">`;
                      Label($$payload6, {
                        for: "ipv4-address",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->IPv4 Address`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: "ipv4-address",
                        placeholder: "e.g., 172.20.0.10",
                        disabled: isCreating,
                        get value() {
                          return ipv4Address;
                        },
                        set value($$value) {
                          ipv4Address = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----></div> <div class="grid grid-cols-1 gap-2">`;
                      Label($$payload6, {
                        for: "ipv6-address",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->IPv6 Address`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: "ipv6-address",
                        placeholder: "e.g., 2001:db8::10",
                        disabled: isCreating,
                        get value() {
                          return ipv6Address;
                        },
                        set value($$value) {
                          ipv6Address = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----></div></div></div>`;
                    } else {
                      $$payload6.out += "<!--[!-->";
                    }
                    $$payload6.out += `<!--]--></div>`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Tabs_content($$payload5, {
                  value: "healthcheck",
                  children: ($$payload6) => {
                    $$payload6.out += `<div class="space-y-4"><div class="flex items-center space-x-2">`;
                    Switch($$payload6, {
                      id: "enable-healthcheck",
                      disabled: isCreating,
                      get checked() {
                        return enableHealthcheck;
                      },
                      set checked($$value) {
                        enableHealthcheck = $$value;
                        $$settled = false;
                      }
                    });
                    $$payload6.out += `<!----> `;
                    Label($$payload6, {
                      for: "enable-healthcheck",
                      class: "cursor-pointer",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Enable Healthcheck`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----></div> `;
                    if (enableHealthcheck) {
                      $$payload6.out += "<!--[-->";
                      $$payload6.out += `<div class="space-y-6 border-t pt-6 mt-4"><div class="space-y-2">`;
                      Label($$payload6, {
                        for: "healthcheck-test",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Test Command`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: "healthcheck-test",
                        placeholder: "e.g., CMD-SHELL curl -f http://localhost:80 || exit 1",
                        disabled: isCreating,
                        get value() {
                          return healthcheckTest[0];
                        },
                        set value($$value) {
                          healthcheckTest[0] = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----> <p class="text-xs text-muted-foreground">Command to run inside the container. Use \`CMD\` or \`CMD-SHELL\`. For multiple arguments, use advanced settings or configure directly in compose.</p></div> <div class="grid grid-cols-2 md:grid-cols-4 gap-4"><div class="space-y-2">`;
                      Label($$payload6, {
                        for: "healthcheck-interval",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Interval (s)`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: "healthcheck-interval",
                        type: "number",
                        min: "1",
                        placeholder: "e.g., 30",
                        disabled: isCreating,
                        get value() {
                          return healthcheckInterval;
                        },
                        set value($$value) {
                          healthcheckInterval = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----></div> <div class="space-y-2">`;
                      Label($$payload6, {
                        for: "healthcheck-timeout",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Timeout (s)`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: "healthcheck-timeout",
                        type: "number",
                        min: "1",
                        placeholder: "e.g., 10",
                        disabled: isCreating,
                        get value() {
                          return healthcheckTimeout;
                        },
                        set value($$value) {
                          healthcheckTimeout = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----></div> <div class="space-y-2">`;
                      Label($$payload6, {
                        for: "healthcheck-retries",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Retries`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: "healthcheck-retries",
                        type: "number",
                        min: "1",
                        placeholder: "e.g., 3",
                        disabled: isCreating,
                        get value() {
                          return healthcheckRetries;
                        },
                        set value($$value) {
                          healthcheckRetries = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----></div> <div class="space-y-2">`;
                      Label($$payload6, {
                        for: "healthcheck-start-period",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Start Period (s)`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: "healthcheck-start-period",
                        type: "number",
                        min: "0",
                        placeholder: "e.g., 60",
                        disabled: isCreating,
                        get value() {
                          return healthcheckStartPeriod;
                        },
                        set value($$value) {
                          healthcheckStartPeriod = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----> <p class="text-xs text-muted-foreground">Grace period for startup.</p></div></div></div>`;
                    } else {
                      $$payload6.out += "<!--[!-->";
                    }
                    $$payload6.out += `<!--]--></div>`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Tabs_content($$payload5, {
                  value: "advanced",
                  children: ($$payload6) => {
                    const each_array_6 = ensure_array_like(labels);
                    $$payload6.out += `<div class="space-y-6"><div class="space-y-4 border-b pb-6"><h3 class="text-lg font-medium">Labels</h3> <!--[-->`;
                    for (let index = 0, $$length = each_array_6.length; index < $$length; index++) {
                      let label = each_array_6[index];
                      $$payload6.out += `<div class="flex space-x-3 items-end"><div class="flex-1 grid grid-cols-2 gap-4"><div>`;
                      Label($$payload6, {
                        for: `label-key-${index}`,
                        class: "mb-2 block text-sm",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Key`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: `label-key-${index}`,
                        placeholder: "e.g., com.example.project",
                        disabled: isCreating,
                        get value() {
                          return label.key;
                        },
                        set value($$value) {
                          label.key = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----></div> <div>`;
                      Label($$payload6, {
                        for: `label-value-${index}`,
                        class: "mb-2 block text-sm",
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->Value`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----> `;
                      Input($$payload6, {
                        id: `label-value-${index}`,
                        placeholder: "e.g., my-app",
                        disabled: isCreating,
                        get value() {
                          return label.value;
                        },
                        set value($$value) {
                          label.value = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out += `<!----></div></div> `;
                      Button($$payload6, {
                        variant: "destructive",
                        size: "icon",
                        type: "button",
                        onclick: () => removeLabel(index),
                        disabled: labels.length <= 1 && !labels[0].key && !labels[0].value || isCreating,
                        class: "shrink-0",
                        children: ($$payload7) => {
                          Trash($$payload7, { class: "size-4" });
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!----></div>`;
                    }
                    $$payload6.out += `<!--]--> `;
                    Button($$payload6, {
                      variant: "outline",
                      type: "button",
                      onclick: addLabel,
                      class: "w-full",
                      disabled: isCreating,
                      children: ($$payload7) => {
                        Plus($$payload7, { class: "mr-2 size-4" });
                        $$payload7.out += `<!----> Add Label`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----></div> <div class="space-y-4 border-b pb-6"><h3 class="text-lg font-medium">Execution</h3> <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="space-y-2">`;
                    Label($$payload6, {
                      for: "command-override",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Command Override`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> `;
                    Input($$payload6, {
                      id: "command-override",
                      placeholder: "e.g., /app/run --config /etc/config.yml",
                      disabled: isCreating,
                      get value() {
                        return commandOverride;
                      },
                      set value($$value) {
                        commandOverride = $$value;
                        $$settled = false;
                      }
                    });
                    $$payload6.out += `<!----> <p class="text-xs text-muted-foreground">Overrides the image's default command. Separate arguments with spaces.</p></div> <div class="space-y-2">`;
                    Label($$payload6, {
                      for: "run-as-user",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Run as User`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> `;
                    Input($$payload6, {
                      id: "run-as-user",
                      placeholder: "e.g., 1000:1000 or node",
                      disabled: isCreating,
                      get value() {
                        return runAsUser;
                      },
                      set value($$value) {
                        runAsUser = $$value;
                        $$settled = false;
                      }
                    });
                    $$payload6.out += `<!----> <p class="text-xs text-muted-foreground">Specify user/group ID or name.</p></div></div></div> <div class="space-y-4"><h3 class="text-lg font-medium">Resource Limits</h3> <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="space-y-2">`;
                    Label($$payload6, {
                      for: "memory-limit",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Memory Limit`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> `;
                    Input($$payload6, {
                      id: "memory-limit",
                      placeholder: "e.g., 512m, 1g",
                      disabled: isCreating,
                      get value() {
                        return memoryLimitStr;
                      },
                      set value($$value) {
                        memoryLimitStr = $$value;
                        $$settled = false;
                      }
                    });
                    $$payload6.out += `<!----> <p class="text-xs text-muted-foreground">Format: number + unit (b, k, m, g). Minimum 4m.</p></div> <div class="space-y-2">`;
                    Label($$payload6, {
                      for: "cpu-limit",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->CPU Limit (cores)`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> `;
                    Input($$payload6, {
                      id: "cpu-limit",
                      placeholder: "e.g., 0.5, 1, 2",
                      disabled: isCreating,
                      type: "number",
                      step: "0.1",
                      min: "0.01",
                      get value() {
                        return cpuLimitStr;
                      },
                      set value($$value) {
                        cpuLimitStr = $$value;
                        $$settled = false;
                      }
                    });
                    $$payload6.out += `<!----> <p class="text-xs text-muted-foreground">Number of CPU cores (e.g., 1.5 = 1.5 cores).</p></div></div></div> <div class="flex items-center space-x-2 py-4 border-t">`;
                    Switch($$payload6, {
                      id: "auto-update",
                      name: "autoUpdate",
                      get checked() {
                        return autoUpdate;
                      },
                      set checked($$value) {
                        autoUpdate = $$value;
                        $$settled = false;
                      }
                    });
                    $$payload6.out += `<!----> `;
                    Label($$payload6, {
                      for: "auto-update",
                      class: "font-medium",
                      children: ($$payload7) => {
                        $$payload7.out += `<!---->Enable auto-update`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!----> <p class="text-xs text-muted-foreground">When enabled, Arcane will periodically check for newer versions of this container's image and automatically update it.</p></div></div>`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----></div></div>`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Dialog_footer($$payload4, {
              class: "pt-4",
              children: ($$payload5) => {
                Arcane_button($$payload5, {
                  action: "cancel",
                  onClick: handleClose,
                  disabled: isCreating,
                  class: "mr-2"
                });
                $$payload5.out += `<!----> `;
                Arcane_button($$payload5, {
                  action: "create",
                  loading: isCreating,
                  onClick: handleSubmit,
                  disabled: isCreating || !containerName.trim() || !selectedImage
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
  bind_props($$props, { open });
  pop();
}
function Stat_card($$payload, $$props) {
  push();
  let {
    title,
    value,
    icon: Icon2,
    iconColor = "text-primary",
    bgColor = "bg-primary/10",
    subtitle,
    class: className
  } = $$props;
  $$payload.out += `<!---->`;
  Card($$payload, {
    class: cn("", className),
    children: ($$payload2) => {
      $$payload2.out += `<!---->`;
      Card_content($$payload2, {
        class: "p-4 flex items-center justify-between",
        children: ($$payload3) => {
          $$payload3.out += `<div><p class="text-sm font-medium text-muted-foreground">${escape_html(title)}</p> <p class="text-2xl font-bold">${escape_html(value)}</p> `;
          if (subtitle) {
            $$payload3.out += "<!--[-->";
            $$payload3.out += `<p class="text-xs text-muted-foreground mt-1">${escape_html(subtitle)}</p>`;
          } else {
            $$payload3.out += "<!--[!-->";
          }
          $$payload3.out += `<!--]--></div> <div${attr_class(`p-2 rounded-full ${stringify(bgColor)}`)}><!---->`;
          Icon2($$payload3, { class: `${stringify(iconColor)} size-5` });
          $$payload3.out += `<!----></div>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!---->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!---->`;
  pop();
}
function _page($$payload, $$props) {
  push();
  const containerApi = new ContainerAPIService();
  let { data } = $$props;
  let containers = data.containers;
  let selectedIds = [];
  let isCreateDialogOpen = false;
  let isLoading = {
    start: false,
    stop: false,
    restart: false,
    remove: false
  };
  const isAnyLoading = Object.values(isLoading).some((loading) => loading);
  const runningContainers = containers?.filter((c) => c.State === "running").length || 0;
  const stoppedContainers = containers?.filter((c) => c.State === "exited").length || 0;
  const totalContainers = containers?.length || 0;
  function getContainerDisplayName(container) {
    if (container.Names && container.Names.length > 0) {
      return container.Names[0].startsWith("/") ? container.Names[0].substring(1) : container.Names[0];
    }
    return shortId(container.Id);
  }
  async function refreshData() {
    try {
      await invalidateAll();
    } finally {
      setTimeout(
        () => {
        },
        300
      );
    }
  }
  function openCreateDialog() {
    isCreateDialogOpen = true;
  }
  async function handleRemoveContainer(id) {
    openConfirmDialog({
      title: "Delete Container",
      message: "Are you sure you want to delete this container? This action cannot be undone.",
      confirm: {
        label: "Delete",
        destructive: true,
        action: async () => {
          handleApiResultWithCallbacks({
            result: await tryCatch(containerApi.remove(id)),
            message: "Failed to Remove Container",
            setLoadingState: (value) => isLoading.remove = value,
            onSuccess: async () => {
              toast.success("Container Removed Successfully.");
              await invalidateAll();
            }
          });
        }
      }
    });
  }
  async function performContainerAction(action, id) {
    isLoading[action] = true;
    if (action === "start") {
      handleApiResultWithCallbacks({
        result: await tryCatch(containerApi.start(id)),
        message: "Failed to Start Container",
        setLoadingState: (value) => isLoading.start = value,
        async onSuccess() {
          toast.success("Container Started Successfully.");
          await invalidateAll();
        }
      });
    } else if (action === "stop") {
      handleApiResultWithCallbacks({
        result: await tryCatch(containerApi.stop(id)),
        message: "Failed to Stop Container",
        setLoadingState: (value) => isLoading.stop = value,
        async onSuccess() {
          toast.success("Container Stopped Successfully.");
          await invalidateAll();
        }
      });
    } else if (action === "restart") {
      handleApiResultWithCallbacks({
        result: await tryCatch(containerApi.restart(id)),
        message: "Failed to Restart Container",
        setLoadingState: (value) => isLoading.restart = value,
        async onSuccess() {
          toast.success("Container Restarted Successfully.");
          await invalidateAll();
        }
      });
    } else {
      console.error("An Unknown Error Occurred");
      toast.error("An Unknown Error Occurred");
    }
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<div class="space-y-6"><div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><h1 class="text-3xl font-bold tracking-tight">Containers</h1> <p class="text-sm text-muted-foreground mt-1">View and Manage your Containers</p></div></div> <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">`;
    Stat_card($$payload2, {
      title: "Total",
      value: totalContainers,
      icon: Box,
      class: "hover:shadow-lg transition-shadow border-l-4 border-l-primary"
    });
    $$payload2.out += `<!----> `;
    Stat_card($$payload2, {
      title: "Running",
      value: runningContainers,
      icon: Box,
      iconColor: "text-green-500",
      bgColor: "bg-green-500/10",
      class: "border-l-4 border-l-green-500"
    });
    $$payload2.out += `<!----> `;
    Stat_card($$payload2, {
      title: "Stopped",
      value: stoppedContainers,
      icon: Box,
      iconColor: "text-amber-500",
      class: "border-l-4 border-l-amber-500"
    });
    $$payload2.out += `<!----></div> `;
    if (containers?.length === 0) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<div class="flex flex-col items-center justify-center py-12 px-6 text-center border rounded-lg bg-card">`;
      Box($$payload2, {
        class: "text-muted-foreground mb-4 opacity-40 size-12"
      });
      $$payload2.out += `<!----> <p class="text-lg font-medium">No containers found</p> <p class="text-sm text-muted-foreground mt-1 max-w-md">Create a new container using the "Create Container" button above or use the Docker CLI</p> <div class="flex gap-3 mt-4">`;
      Button($$payload2, {
        variant: "secondary",
        onclick: refreshData,
        children: ($$payload3) => {
          Refresh_cw($$payload3, { class: "size-4" });
          $$payload3.out += `<!----> Refresh`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      Arcane_button($$payload2, {
        action: "create",
        label: "Create Container",
        onClick: openCreateDialog
      });
      $$payload2.out += `<!----></div></div>`;
    } else {
      $$payload2.out += "<!--[!-->";
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
                  $$payload5.out += `<!---->Container List`;
                },
                $$slots: { default: true }
              });
              $$payload4.out += `<!----></div> <div class="flex items-center gap-2">`;
              Arcane_button($$payload4, {
                action: "create",
                label: "Create Container",
                onClick: openCreateDialog
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
                  const stateVariant = statusVariantMap[item.State.toLowerCase()];
                  $$payload5.out += `<!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<a class="font-medium hover:underline"${attr("href", `/containers/${stringify(item.Id)}/`)}>${escape_html(item.displayName)}</a>`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(shortId(item.Id))}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(item.Image)}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      Status_badge($$payload6, {
                        variant: stateVariant,
                        text: capitalizeFirstLetter(item.State)
                      });
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(item.Status)}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->`;
                      Root$3($$payload6, {
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
                              Group$1($$payload8, {
                                children: ($$payload9) => {
                                  $$payload9.out += `<!---->`;
                                  Dropdown_menu_item($$payload9, {
                                    onclick: () => goto(`/containers/${item.Id}`),
                                    disabled: isAnyLoading,
                                    children: ($$payload10) => {
                                      Scan_search($$payload10, { class: "size-4" });
                                      $$payload10.out += `<!----> Inspect`;
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$payload9.out += `<!----> `;
                                  if (item.State !== "running") {
                                    $$payload9.out += "<!--[-->";
                                    $$payload9.out += `<!---->`;
                                    Dropdown_menu_item($$payload9, {
                                      onclick: () => performContainerAction("start", item.Id),
                                      disabled: isLoading.start || isAnyLoading,
                                      children: ($$payload10) => {
                                        if (isLoading.start) {
                                          $$payload10.out += "<!--[-->";
                                          Loader_circle($$payload10, { class: "animate-spin size-4" });
                                        } else {
                                          $$payload10.out += "<!--[!-->";
                                          Play($$payload10, { class: "size-4" });
                                        }
                                        $$payload10.out += `<!--]--> Start`;
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$payload9.out += `<!---->`;
                                  } else {
                                    $$payload9.out += "<!--[!-->";
                                    $$payload9.out += `<!---->`;
                                    Dropdown_menu_item($$payload9, {
                                      onclick: () => performContainerAction("restart", item.Id),
                                      disabled: isLoading.restart || isAnyLoading,
                                      children: ($$payload10) => {
                                        if (isLoading.restart) {
                                          $$payload10.out += "<!--[-->";
                                          Loader_circle($$payload10, { class: "animate-spin size-4" });
                                        } else {
                                          $$payload10.out += "<!--[!-->";
                                          Rotate_ccw($$payload10, { class: "size-4" });
                                        }
                                        $$payload10.out += `<!--]--> Restart`;
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$payload9.out += `<!----> <!---->`;
                                    Dropdown_menu_item($$payload9, {
                                      onclick: () => performContainerAction("stop", item.Id),
                                      disabled: isLoading.stop || isAnyLoading,
                                      children: ($$payload10) => {
                                        if (isLoading.stop) {
                                          $$payload10.out += "<!--[-->";
                                          Loader_circle($$payload10, { class: "animate-spin size-4" });
                                        } else {
                                          $$payload10.out += "<!--[!-->";
                                          Circle_stop($$payload10, { class: "size-4" });
                                        }
                                        $$payload10.out += `<!--]--> Stop`;
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$payload9.out += `<!---->`;
                                  }
                                  $$payload9.out += `<!--]--> <!---->`;
                                  Dropdown_menu_separator($$payload9, {});
                                  $$payload9.out += `<!----> <!---->`;
                                  Dropdown_menu_item($$payload9, {
                                    class: "text-red-500 focus:text-red-700!",
                                    onclick: () => handleRemoveContainer(item.Id),
                                    disabled: isLoading.remove || isAnyLoading,
                                    children: ($$payload10) => {
                                      if (isLoading.remove) {
                                        $$payload10.out += "<!--[-->";
                                        Loader_circle($$payload10, { class: "animate-spin size-4" });
                                      } else {
                                        $$payload10.out += "<!--[!-->";
                                        Trash_2($$payload10, { class: "size-4" });
                                      }
                                      $$payload10.out += `<!--]--> Remove`;
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
                  data: containers.map((c) => ({
                    ...c,
                    displayName: getContainerDisplayName(c),
                    statusSortValue: parseStatusTime(c.Status)
                  })),
                  columns: [
                    { accessorKey: "displayName", header: "Name" },
                    { accessorKey: "Id", header: "ID" },
                    { accessorKey: "Image", header: "Image" },
                    { accessorKey: "State", header: "State" },
                    {
                      accessorKey: "statusSortValue",
                      header: "Status"
                    },
                    {
                      accessorKey: "actions",
                      header: " ",
                      enableSorting: false
                    }
                  ],
                  features: { selection: false },
                  pagination: {
                    pageSize: tablePersistence.getPageSize("containers")
                  },
                  onPageSizeChange: (newSize) => {
                    tablePersistence.setPageSize("containers", newSize);
                  },
                  sort: {
                    defaultSort: { id: "displayName", desc: false }
                  },
                  display: {
                    filterPlaceholder: "Search containers...",
                    noResultsMessage: "No containers found"
                  },
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
    }
    $$payload2.out += `<!--]--> `;
    Create_container_dialog($$payload2, {
      volumes: data.volumes || [],
      networks: data.networks || [],
      images: data.images || [],
      get open() {
        return isCreateDialogOpen;
      },
      set open($$value) {
        isCreateDialogOpen = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----></div>`;
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
