import { load } from 'js-yaml';

function validateUnknownFields(data, knownFields, context, mode = "default") {
  const warnings = [];
  if (mode === "loose") return warnings;
  for (const key of Object.keys(data || {})) {
    if (!knownFields.includes(key) && !key.startsWith("x-")) {
      const message = `Unknown field "${key}" in ${context}`;
      if (mode === "strict") {
        throw new Error(message);
      } else {
        warnings.push(message);
      }
    }
  }
  return warnings;
}
const KNOWN_TOP_LEVEL_FIELDS = ["version", "name", "services", "networks", "volumes", "configs", "secrets", "include"];
const KNOWN_SERVICE_FIELDS = [
  "image",
  "build",
  "command",
  "entrypoint",
  "environment",
  "env_file",
  "ports",
  "expose",
  "volumes",
  "networks",
  "depends_on",
  "restart",
  "healthcheck",
  "labels",
  "container_name",
  "hostname",
  "domainname",
  "user",
  "working_dir",
  "privileged",
  "init",
  "tty",
  "stdin_open",
  "profiles",
  "scale",
  "deploy",
  "develop",
  "configs",
  "secrets",
  "platform",
  "pull_policy",
  "runtime",
  "stop_signal",
  "stop_grace_period",
  "sysctls",
  "ulimits",
  "cap_add",
  "cap_drop",
  "security_opt",
  "devices",
  "dns",
  "dns_search",
  "dns_opt",
  "extra_hosts",
  "external_links",
  "isolation",
  "links",
  "logging",
  "network_mode",
  "pid",
  "ipc",
  "uts",
  "read_only",
  "shm_size",
  "tmpfs",
  "volumes_from",
  "mac_address",
  "storage_opt",
  "userns_mode",
  "credential_spec",
  "device_cgroup_rules",
  "group_add",
  "mem_limit",
  "mem_reservation",
  "mem_swappiness",
  "memswap_limit",
  "oom_kill_disable",
  "oom_score_adj",
  "pids_limit",
  "annotations",
  "attach",
  "blkio_config",
  "cpu_count",
  "cpu_percent",
  "cpu_shares",
  "cpu_period",
  "cpu_quota",
  "cpu_rt_runtime",
  "cpu_rt_period",
  "cpus",
  "cpuset",
  "cgroup",
  "cgroup_parent",
  "gpus",
  "post_start",
  "pre_stop",
  "provider",
  "label_file"
];
const KNOWN_NETWORK_FIELDS = ["driver", "driver_opts", "external", "name", "ipam", "enable_ipv6", "labels", "attachable", "scope", "internal"];
const KNOWN_VOLUME_FIELDS = ["driver", "driver_opts", "external", "name", "labels"];
function validateContainerName(serviceName, serviceConfig, stackId) {
  let containerName = serviceConfig.container_name;
  if (containerName) {
    const containerNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/;
    if (!containerNameRegex.test(containerName)) {
      throw new Error(`Invalid container_name "${containerName}" for service "${serviceName}". Must match pattern [a-zA-Z0-9][a-zA-Z0-9_.-]+`);
    }
    if (serviceConfig.scale && serviceConfig.scale > 1) {
      throw new Error(`Service "${serviceName}" cannot use both "container_name" and "scale > 1"`);
    }
    return containerName;
  }
  return `${stackId}_${serviceName}_1`;
}
function validateExternalResource(name, config, type) {
  if (config.external === true) {
    const allowedFields = ["name", "external"];
    const otherFields = Object.keys(config).filter((key) => !allowedFields.includes(key));
    if (otherFields.length > 0) {
      throw new Error(`External ${type} "${name}" cannot have additional attributes: ${otherFields.join(", ")}`);
    }
  }
}
function parseEnvContent(content) {
  const envVars = {};
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;
    const key = trimmed.substring(0, equalIndex);
    let value = trimmed.substring(equalIndex + 1);
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
  return envVars;
}
function validateServiceAttributes(serviceName, serviceConfig) {
  const warnings = [];
  if (serviceConfig.pull_policy) {
    const validPullPolicies = ["always", "never", "missing", "build"];
    if (!validPullPolicies.includes(serviceConfig.pull_policy)) {
      warnings.push(`Service "${serviceName}" has invalid pull_policy "${serviceConfig.pull_policy}". Valid values: ${validPullPolicies.join(", ")}`);
    }
  }
  if (serviceConfig.platform) {
    const platformRegex = /^[a-z0-9]+\/[a-z0-9]+$/;
    if (!platformRegex.test(serviceConfig.platform)) {
      warnings.push(`Service "${serviceName}" has invalid platform format "${serviceConfig.platform}". Expected format: os/arch (e.g., linux/amd64)`);
    }
  }
  if (serviceConfig.init !== void 0 && typeof serviceConfig.init !== "boolean") {
    warnings.push(`Service "${serviceName}" init attribute must be a boolean, got: ${typeof serviceConfig.init}`);
  }
  return warnings;
}
function validateComposeStructureEnhanced(composeData, mode = "default") {
  const errors = [];
  const warnings = [];
  if (!composeData || typeof composeData !== "object") {
    errors.push("Compose file must be a valid YAML object");
    return { valid: false, errors, warnings };
  }
  try {
    warnings.push(...validateUnknownFields(composeData, KNOWN_TOP_LEVEL_FIELDS, "top-level", mode));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { valid: false, errors, warnings };
  }
  if (composeData.services) {
    for (const [serviceName, serviceConfig] of Object.entries(composeData.services)) {
      try {
        warnings.push(...validateUnknownFields(serviceConfig, KNOWN_SERVICE_FIELDS, `service "${serviceName}"`, mode));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        continue;
      }
      warnings.push(...validateServiceAttributes(serviceName, serviceConfig));
    }
  }
  if (composeData.networks) {
    for (const [networkName, networkConfig] of Object.entries(composeData.networks)) {
      if (!networkConfig) continue;
      try {
        warnings.push(...validateUnknownFields(networkConfig, KNOWN_NETWORK_FIELDS, `network "${networkName}"`, mode));
        validateExternalResource(networkName, networkConfig, "network");
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }
  if (composeData.volumes) {
    for (const [volumeName, volumeConfig] of Object.entries(composeData.volumes)) {
      if (!volumeConfig) continue;
      try {
        warnings.push(...validateUnknownFields(volumeConfig, KNOWN_VOLUME_FIELDS, `volume "${volumeName}"`, mode));
        validateExternalResource(volumeName, volumeConfig, "volume");
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
function validateComposeContentEnhanced(content, mode = "default") {
  try {
    const parsed = load(content);
    return validateComposeStructureEnhanced(parsed, mode);
  } catch (parseError) {
    return {
      valid: false,
      errors: [`YAML parsing error: ${parseError instanceof Error ? parseError.message : String(parseError)}`],
      warnings: []
    };
  }
}
function enhanceContainerConfig(containerConfig, serviceConfig) {
  const enhanced = { ...containerConfig };
  if (serviceConfig.init) {
    enhanced.HostConfig.Init = serviceConfig.init;
  }
  if (serviceConfig.platform) {
    enhanced.Platform = serviceConfig.platform;
  }
  if (serviceConfig.annotations) {
    const annotations = Array.isArray(serviceConfig.annotations) ? serviceConfig.annotations.reduce((acc, annotation) => {
      const [key, value = ""] = annotation.split("=");
      acc[key] = value;
      return acc;
    }, {}) : serviceConfig.annotations;
    Object.assign(enhanced.Labels, annotations);
  }
  if (serviceConfig.pull_policy) {
    enhanced._pullPolicy = serviceConfig.pull_policy;
  }
  return enhanced;
}
async function validateComposeConfiguration(composeContent, envContent = "", mode = "default") {
  const errors = [];
  const warnings = [];
  try {
    const envVars = parseEnvContent(envContent);
    const getEnvVar = (key) => envVars[key] || process.env[key];
    const contentValidation = validateComposeContentEnhanced(composeContent, mode);
    if (!contentValidation.valid) {
      return contentValidation;
    }
    warnings.push(...contentValidation.warnings);
    const { parseYamlContent } = await import('./compose.utils-Dy0jCFPf.js');
    const composeData = parseYamlContent(composeContent, getEnvVar);
    if (!composeData) {
      errors.push("Failed to parse compose file with variable substitution");
      return { valid: false, errors, warnings };
    }
    if (composeData.services) {
      const { validateAllDependencies } = await import('./compose.utils-Dy0jCFPf.js');
      const dependencyValidation = validateAllDependencies(composeData.services);
      errors.push(...dependencyValidation.errors);
      warnings.push(...dependencyValidation.warnings);
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    return { valid: false, errors, warnings };
  }
}

export { validateExternalResource as a, validateContainerName as b, enhanceContainerConfig as e, validateComposeConfiguration as v };
//# sourceMappingURL=compose-validate.utils-NVGE7GWN.js.map
