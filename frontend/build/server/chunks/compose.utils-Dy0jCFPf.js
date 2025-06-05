import { load, dump } from 'js-yaml';
import { promises, existsSync } from 'node:fs';
import * as path from 'node:path';

const SUPPORTED_COMPOSE_VERSIONS = ["3.0", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9"];
const DEFAULT_COMPOSE_VERSION = "3.8";
function parseEnvContent(envContent) {
  const envVars = {};
  if (envContent) {
    const lines = envContent.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("#")) continue;
      const equalIndex = line.indexOf("=");
      if (equalIndex === -1) continue;
      const key = line.substring(0, equalIndex).trim();
      let value = line.substring(equalIndex + 1);
      if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
        if (value.includes('\\"')) {
          value = value.replace(/\\"/g, '"');
        }
        if (value.includes("\\'")) {
          value = value.replace(/\\'/g, "'");
        }
      }
      value = value.replace(/\\n/g, "\n").replace(/\\t/g, "	");
      if (key) {
        envVars[key] = value;
      }
    }
  }
  return envVars;
}
function validateComposeStructure(composeData) {
  const errors = [];
  const warnings = [];
  if (!composeData || typeof composeData !== "object") {
    errors.push("Compose file must be a valid YAML object");
    return { valid: false, errors, warnings };
  }
  if (composeData.version) {
    if (!SUPPORTED_COMPOSE_VERSIONS.includes(composeData.version)) {
      warnings.push(`Compose version ${composeData.version} may not be fully supported. Supported versions: ${SUPPORTED_COMPOSE_VERSIONS.join(", ")}`);
    }
  } else {
    warnings.push("No version specified in compose file. Consider adding a version field.");
  }
  if (!composeData.services || typeof composeData.services !== "object") {
    errors.push("Compose file must have a services section");
    return { valid: false, errors, warnings };
  }
  for (const [serviceName, serviceConfig] of Object.entries(composeData.services)) {
    if (!serviceConfig.image && !serviceConfig.build) {
      errors.push(`Service '${serviceName}' must have either 'image' or 'build' field`);
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(serviceName)) {
      errors.push(`Service name '${serviceName}' contains invalid characters. Use only letters, numbers, dots, hyphens, and underscores.`);
    }
    if (serviceConfig.depends_on) {
      if (Array.isArray(serviceConfig.depends_on)) {
        for (const dep of serviceConfig.depends_on) {
          if (!composeData.services[dep]) {
            errors.push(`Service '${serviceName}' depends on '${dep}' which doesn't exist`);
          }
        }
      } else if (typeof serviceConfig.depends_on === "object") {
        for (const dep of Object.keys(serviceConfig.depends_on)) {
          if (!composeData.services[dep]) {
            errors.push(`Service '${serviceName}' depends on '${dep}' which doesn't exist`);
          }
        }
      }
    }
    if (serviceConfig.networks) {
      if (Array.isArray(serviceConfig.networks)) {
        for (const network of serviceConfig.networks) {
          if (typeof network === "string" && composeData.networks && !composeData.networks[network]) {
            warnings.push(`Service '${serviceName}' references network '${network}' which is not defined`);
          }
        }
      } else if (typeof serviceConfig.networks === "object") {
        for (const network of Object.keys(serviceConfig.networks)) {
          if (composeData.networks && !composeData.networks[network]) {
            warnings.push(`Service '${serviceName}' references network '${network}' which is not defined`);
          }
        }
      }
    }
    if (serviceConfig.volumes) {
      for (const volume of serviceConfig.volumes) {
        if (typeof volume === "object" && volume.source && volume.type === "volume") {
          if (composeData.volumes && !composeData.volumes[volume.source]) {
            warnings.push(`Service '${serviceName}' references volume '${volume.source}' which is not defined`);
          }
        }
      }
    }
    if (serviceConfig.ports) {
      for (const port of serviceConfig.ports) {
        if (typeof port === "string") {
          const portRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:)?(\d+:)?\d+(\/[a-z]+)?$/;
          if (!portRegex.test(port)) {
            errors.push(`Service '${serviceName}' has invalid port format: '${port}'`);
          }
        }
      }
    }
  }
  if (composeData.networks) {
    for (const [networkName, networkConfig] of Object.entries(composeData.networks)) {
      if (!networkConfig) {
        continue;
      }
      if (networkConfig.external && typeof networkConfig.external === "object" && !networkConfig.external.name) {
        warnings.push(`External network '${networkName}' should have a name specified`);
      }
      if (networkConfig.driver && !["bridge", "host", "overlay", "macvlan", "none"].includes(networkConfig.driver)) {
        warnings.push(`Network '${networkName}' uses uncommon driver '${networkConfig.driver}'`);
      }
    }
  }
  if (composeData.volumes) {
    for (const [volumeName, volumeConfig] of Object.entries(composeData.volumes)) {
      if (!volumeConfig) {
        continue;
      }
      if (volumeConfig.external && typeof volumeConfig.external === "object" && !volumeConfig.external.name) {
        warnings.push(`External volume '${volumeName}' should have a name specified`);
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
function normalizeHealthcheckTest(composeContent, envGetter) {
  let doc;
  try {
    doc = load(composeContent);
    if (!doc || typeof doc !== "object") {
      return composeContent;
    }
  } catch (e) {
    console.warn("Could not parse compose YAML for normalization:", e);
    return composeContent;
  }
  let modified = false;
  if (doc.services && typeof doc.services === "object") {
    for (const serviceName in doc.services) {
      const service = doc.services[serviceName];
      if (service?.healthcheck) {
        if (service.healthcheck.test) {
          if (typeof service.healthcheck.test === "string") {
            if (service.healthcheck.test.startsWith("CMD-SHELL ")) {
              service.healthcheck.test = ["CMD-SHELL", service.healthcheck.test.substring(11)];
            } else if (service.healthcheck.test.startsWith("CMD ")) {
              service.healthcheck.test = service.healthcheck.test.substring(4).split(" ");
              service.healthcheck.test.unshift("CMD");
            } else if (!service.healthcheck.test.startsWith("NONE")) {
              service.healthcheck.test = ["CMD-SHELL", service.healthcheck.test];
            }
            modified = true;
          } else if (Array.isArray(service.healthcheck.test)) {
            if (service.healthcheck.test.length > 0 && !["CMD", "CMD-SHELL", "NONE"].includes(service.healthcheck.test[0])) {
              service.healthcheck.test.unshift("CMD");
              modified = true;
            }
          }
        }
        if (service.healthcheck.interval && typeof service.healthcheck.interval === "number") {
          service.healthcheck.interval = `${service.healthcheck.interval}s`;
          modified = true;
        }
        if (service.healthcheck.timeout && typeof service.healthcheck.timeout === "number") {
          service.healthcheck.timeout = `${service.healthcheck.timeout}s`;
          modified = true;
        }
        if (service.healthcheck.start_period && typeof service.healthcheck.start_period === "number") {
          service.healthcheck.start_period = `${service.healthcheck.start_period}s`;
          modified = true;
        }
      }
    }
  }
  if (envGetter) {
    const originalDocSnapshot = JSON.stringify(doc);
    doc = substituteVariablesInObject(doc, envGetter);
    if (JSON.stringify(doc) !== originalDocSnapshot) {
      modified = true;
    }
  }
  if (modified) {
    return dump(doc, { lineWidth: -1, quotingType: '"', forceQuotes: false });
  }
  return composeContent;
}
function parseYamlContent(content, envGetter) {
  try {
    const parsedYaml = load(content);
    if (!parsedYaml || typeof parsedYaml !== "object") {
      console.warn("Parsed YAML content is not an object or is null.");
      return null;
    }
    const validation = validateComposeStructure(parsedYaml);
    if (!validation.valid) {
      console.error("Compose validation errors:", validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.warn("Compose validation warnings:", validation.warnings);
    }
    let result = parsedYaml;
    if (envGetter) {
      result = substituteVariablesInObject(result, envGetter);
    }
    if (!result.networks) {
      result.networks = {
        default: {
          driver: "bridge"
        }
      };
    }
    return result;
  } catch (error) {
    console.error("Error parsing YAML content:", error);
    return null;
  }
}
function substituteVariablesInObject(obj, envGetter) {
  if (Array.isArray(obj)) {
    return obj.map((item) => substituteVariablesInObject(item, envGetter));
  } else if (typeof obj === "object" && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = substituteVariablesInObject(obj[key], envGetter);
      }
    }
    return newObj;
  } else if (typeof obj === "string") {
    let result = obj;
    result = result.replace(/\$\{([^}]+)\}/g, (match, varExpression) => {
      const colonDefaultMatch = varExpression.match(/^([^:]+):-(.*)$/);
      const defaultMatch = varExpression.match(/^([^-]+)-(.*)$/);
      if (colonDefaultMatch) {
        const [, varName, defaultValue] = colonDefaultMatch;
        const value = envGetter(varName);
        return value !== void 0 && value !== "" ? value : defaultValue;
      } else if (defaultMatch) {
        const [, varName, defaultValue] = defaultMatch;
        const value = envGetter(varName);
        return value !== void 0 ? value : defaultValue;
      } else {
        const value = envGetter(varExpression);
        return value !== void 0 ? value : match;
      }
    });
    result = result.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => {
      const value = envGetter(varName);
      return value !== void 0 ? value : match;
    });
    return result;
  }
  return obj;
}
function prepareVolumes(volumes, composeData, stackId) {
  if (!Array.isArray(volumes)) {
    return [];
  }
  const binds = [];
  const tmpfsMounts = [];
  for (const volume of volumes) {
    if (typeof volume === "string") {
      const bind = processShortVolumeString(volume, composeData, stackId);
      if (bind) binds.push(bind);
    } else if (typeof volume === "object" && volume !== null) {
      const result = processLongVolumeObject(volume, composeData, stackId);
      if (result.bind) binds.push(result.bind);
      if (result.tmpfs) tmpfsMounts.push(result.tmpfs);
    }
  }
  return binds.filter(Boolean);
}
function processShortVolumeString(volumeString, composeData, stackId) {
  const parts = volumeString.split(":");
  if (parts.length < 2) {
    console.warn(`Invalid volume syntax: ${volumeString}. Expected at least "source:target"`);
    return null;
  }
  let source = parts[0];
  const target = parts[1];
  const options = parts.slice(2);
  if (source.startsWith("./") || source.startsWith("../")) {
    source = path.resolve(process.cwd(), source);
  }
  if (source.startsWith("/") || source.includes("/")) {
    if (!existsSync(source)) {
      console.warn(`Bind mount source does not exist: ${source}`);
      console.warn(`Skipping volume mount: ${volumeString}`);
      console.warn(`Make sure to create the file/directory before deploying the stack`);
      return null;
    }
    return formatBindMount(source, target, options);
  } else {
    const isNamedVolume = composeData.volumes && composeData.volumes[source];
    if (isNamedVolume || !source.includes("/")) {
      const volumeName = `${stackId}_${source}`;
      return formatVolumeMount(volumeName, target, options);
    } else {
      return formatBindMount(source, target, options);
    }
  }
}
function processLongVolumeObject(volume, composeData, stackId) {
  const { type, source, target, read_only, consistency, bind, volume: volumeOpts, tmpfs } = volume;
  if (!target) {
    console.warn(`Volume missing required 'target' field:`, volume);
    return {};
  }
  switch (type) {
    case "bind":
      return { bind: processBindMount(source, target, { read_only, consistency, bind }) };
    case "volume":
      return { bind: processVolumeMount(source, target, stackId, composeData, { read_only, volume: volumeOpts }) };
    case "tmpfs":
      return { tmpfs: processTmpfsMount(target, { tmpfs }) };
    default:
      console.warn(`Unsupported volume type: ${type}`);
      return {};
  }
}
function processBindMount(source, target, options = {}) {
  if (!source) {
    throw new Error("Bind mount requires a source path");
  }
  const parts = [source, target];
  const mountOptions = [];
  if (options.read_only) {
    mountOptions.push("ro");
  }
  if (options.bind) {
    if (options.bind.propagation) {
      mountOptions.push(`bind-propagation=${options.bind.propagation}`);
    }
    if (options.bind.create_host_path !== false) {
      mountOptions.push("bind-nonrecursive=false");
    }
  }
  if (options.consistency) {
    mountOptions.push(`consistency=${options.consistency}`);
  }
  if (mountOptions.length > 0) {
    parts.push(mountOptions.join(","));
  }
  return parts.join(":");
}
function processVolumeMount(source, target, stackId, composeData, options = {}) {
  let volumeName = "";
  if (source) {
    if (composeData.volumes && composeData.volumes[source]) {
      volumeName = `${stackId}_${source}`;
    } else {
      volumeName = source;
    }
  } else {
    volumeName = "";
  }
  const parts = [volumeName, target];
  const mountOptions = [];
  if (options.read_only) {
    mountOptions.push("ro");
  }
  if (options.volume) {
    if (options.volume.nocopy) {
      mountOptions.push("nocopy");
    }
  }
  if (mountOptions.length > 0) {
    parts.push(mountOptions.join(","));
  }
  return parts.join(":");
}
function processTmpfsMount(target, options = {}) {
  const mountOptions = [];
  if (options.tmpfs) {
    if (options.tmpfs.size) {
      mountOptions.push(`size=${options.tmpfs.size}`);
    }
    if (options.tmpfs.mode) {
      mountOptions.push(`mode=${options.tmpfs.mode}`);
    }
    if (options.tmpfs.uid !== void 0) {
      mountOptions.push(`uid=${options.tmpfs.uid}`);
    }
    if (options.tmpfs.gid !== void 0) {
      mountOptions.push(`gid=${options.tmpfs.gid}`);
    }
    if (options.tmpfs.noexec) {
      mountOptions.push("noexec");
    }
    if (options.tmpfs.nosuid) {
      mountOptions.push("nosuid");
    }
    if (options.tmpfs.nodev) {
      mountOptions.push("nodev");
    }
  }
  return `${target}:${mountOptions.join(",")}`;
}
function formatBindMount(source, target, options = []) {
  const parts = [source, target];
  if (options.length > 0) {
    parts.push(options.join(","));
  }
  return parts.join(":");
}
function formatVolumeMount(volumeName, target, options = []) {
  const parts = [volumeName, target];
  if (options.length > 0) {
    parts.push(options.join(","));
  }
  return parts.join(":");
}
function createVolumeDefinitions(composeData, stackId) {
  if (!composeData.volumes) {
    return [];
  }
  const volumeDefinitions = [];
  for (const [volumeName, volumeConfig] of Object.entries(composeData.volumes)) {
    if (volumeConfig && typeof volumeConfig === "object" && volumeConfig.external) {
      continue;
    }
    const config = volumeConfig || {};
    const fullVolumeName = `${stackId}_${volumeName}`;
    volumeDefinitions.push({
      name: fullVolumeName,
      config: {
        Driver: config.driver || "local",
        DriverOpts: config.driver_opts || {},
        Labels: {
          "com.docker.compose.project": stackId,
          "com.docker.compose.volume": volumeName,
          ...config.labels || {}
        }
      }
    });
  }
  return volumeDefinitions;
}
function preparePorts(ports) {
  if (!Array.isArray(ports)) {
    return {};
  }
  const portBindings = {};
  for (const port of ports) {
    if (typeof port === "string") {
      if (port.includes(":")) {
        const parts = port.split(":");
        let hostIP = "";
        let hostPort = "";
        let containerPort = "";
        if (parts.length === 2) {
          hostPort = parts[0];
          containerPort = parts[1];
        } else if (parts.length === 3) {
          hostIP = parts[0];
          hostPort = parts[1];
          containerPort = parts[2];
        }
        let protocol = "tcp";
        if (containerPort.includes("/")) {
          [containerPort, protocol] = containerPort.split("/");
        }
        const containerPortKey = `${containerPort}/${protocol}`;
        portBindings[containerPortKey] = [
          {
            HostIp: hostIP,
            HostPort: hostPort
          }
        ];
      } else {
        let containerPort = port;
        let protocol = "tcp";
        if (port.includes("/")) {
          [containerPort, protocol] = port.split("/");
        }
        const containerPortKey = `${containerPort}/${protocol}`;
        portBindings[containerPortKey] = [{}];
      }
    } else if (typeof port === "object") {
      const containerPort = port.target.toString();
      const protocol = port.protocol || "tcp";
      const containerPortKey = `${containerPort}/${protocol}`;
      const binding = {};
      if (port.published) {
        binding.HostPort = port.published.toString();
      }
      if (port.host_ip) {
        binding.HostIp = port.host_ip;
      }
      portBindings[containerPortKey] = [binding];
    }
  }
  return portBindings;
}
async function prepareEnvironmentVariables(environment, stackDir) {
  const envArray = [];
  const envMap = /* @__PURE__ */ new Map();
  try {
    const envFilePath = path.join(stackDir, ".env");
    const envFileContent = await promises.readFile(envFilePath, "utf8");
    const envVars = parseEnvContent(envFileContent);
    for (const [key, value] of Object.entries(envVars)) {
      envMap.set(key, value);
    }
  } catch (envError) {
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== void 0) {
      envMap.set(key, value);
    }
  }
  if (Array.isArray(environment)) {
    for (const env of environment) {
      if (typeof env === "string" && env.includes("=")) {
        const [key, ...valueParts] = env.split("=");
        envMap.set(key, valueParts.join("="));
      }
    }
  } else if (typeof environment === "object" && environment !== null) {
    for (const [key, value] of Object.entries(environment)) {
      if (value !== null && value !== void 0) {
        envMap.set(key, value.toString());
      }
    }
  }
  for (const [key, value] of envMap) {
    envArray.push(`${key}=${value}`);
  }
  return envArray;
}
function prepareRestartPolicy(restart) {
  if (!restart || restart === "no") {
    return { Name: "no" };
  }
  switch (restart) {
    case "always":
      return { Name: "always" };
    case "unless-stopped":
      return { Name: "unless-stopped" };
    case "on-failure":
      return { Name: "on-failure", MaximumRetryCount: 0 };
    default:
      if (restart.startsWith("on-failure:")) {
        const retryCount = parseInt(restart.split(":")[1]) || 0;
        return { Name: "on-failure", MaximumRetryCount: retryCount };
      }
      return { Name: "no" };
  }
}
function resolveDependencyOrder(services) {
  const resolved = [];
  const resolving = /* @__PURE__ */ new Set();
  function resolve(serviceName) {
    if (resolved.includes(serviceName)) return;
    if (resolving.has(serviceName)) {
      throw new Error(`Circular dependency detected involving ${serviceName}`);
    }
    resolving.add(serviceName);
    const service = services[serviceName];
    if (service.depends_on) {
      const dependencies = Array.isArray(service.depends_on) ? service.depends_on : Object.keys(service.depends_on);
      for (const dep of dependencies) {
        if (services[dep]) {
          resolve(dep);
        }
      }
    }
    resolving.delete(serviceName);
    resolved.push(serviceName);
  }
  for (const serviceName of Object.keys(services)) {
    resolve(serviceName);
  }
  return resolved;
}
function generateConfigHash(service) {
  const configString = JSON.stringify(service);
  let hash = 0;
  for (let i = 0; i < configString.length; i++) {
    const char = configString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
function prepareExtraHosts(extraHosts) {
  if (!Array.isArray(extraHosts)) return [];
  return extraHosts.map((host) => {
    if (typeof host === "string") {
      return host;
    } else if (typeof host === "object") {
      return `${host.hostname}:${host.ip}`;
    }
    return "";
  }).filter((h) => h);
}
function prepareUlimits(ulimits) {
  if (!ulimits || typeof ulimits !== "object") {
    return [];
  }
  if (Array.isArray(ulimits)) {
    return ulimits;
  }
  return Object.entries(ulimits).map(([name, value]) => {
    if (typeof value === "number") {
      return {
        Name: name,
        Soft: value,
        Hard: value
      };
    } else if (typeof value === "object" && value !== null) {
      const limit = value;
      return {
        Name: name,
        Soft: limit.soft || limit.Soft || 0,
        Hard: limit.hard || limit.Hard || 0
      };
    } else {
      return {
        Name: name,
        Soft: 0,
        Hard: 0
      };
    }
  });
}
function prepareLogConfig(logging) {
  if (!logging || !logging.driver) {
    return { Type: "json-file" };
  }
  return {
    Type: logging.driver,
    Config: logging.options || {}
  };
}
function prepareHealthcheck(healthcheck) {
  if (!healthcheck) return void 0;
  const config = {};
  if (healthcheck.test) {
    if (Array.isArray(healthcheck.test)) {
      config.Test = healthcheck.test;
    } else if (typeof healthcheck.test === "string") {
      if (healthcheck.test === "NONE") {
        config.Test = ["NONE"];
      } else {
        config.Test = ["CMD-SHELL", healthcheck.test];
      }
    }
  }
  if (healthcheck.interval) {
    config.Interval = parseTimeToNanoseconds(healthcheck.interval);
  }
  if (healthcheck.timeout) {
    config.Timeout = parseTimeToNanoseconds(healthcheck.timeout);
  }
  if (healthcheck.start_period) {
    config.StartPeriod = parseTimeToNanoseconds(healthcheck.start_period);
  }
  if (healthcheck.retries) {
    config.Retries = parseInt(healthcheck.retries);
  }
  return config;
}
function parseMemory(memStr) {
  if (typeof memStr === "number") return memStr;
  const str = memStr.toString().toLowerCase();
  const num = parseFloat(str);
  if (str.includes("k")) return Math.round(num * 1024);
  if (str.includes("m")) return Math.round(num * 1024 * 1024);
  if (str.includes("g")) return Math.round(num * 1024 * 1024 * 1024);
  return Math.round(num);
}
function parseTimeToNanoseconds(timeStr) {
  if (typeof timeStr === "number") return timeStr * 1e9;
  const str = timeStr.toString().toLowerCase();
  const num = parseFloat(str);
  if (str.includes("ns")) return Math.round(num);
  if (str.includes("us") || str.includes("μs")) return Math.round(num * 1e3);
  if (str.includes("ms")) return Math.round(num * 1e6);
  if (str.includes("s")) return Math.round(num * 1e9);
  if (str.includes("m")) return Math.round(num * 60 * 1e9);
  if (str.includes("h")) return Math.round(num * 60 * 60 * 1e9);
  return Math.round(num * 1e9);
}
function validateComposeContent(content) {
  try {
    const parsed = load(content);
    return validateComposeStructure(parsed);
  } catch (parseError) {
    return {
      valid: false,
      errors: [`YAML parsing error: ${parseError instanceof Error ? parseError.message : String(parseError)}`],
      warnings: []
    };
  }
}
function parseDependsOn(dependsOn) {
  if (!dependsOn) {
    return [];
  }
  const dependencies = [];
  if (Array.isArray(dependsOn)) {
    for (const serviceName of dependsOn) {
      if (typeof serviceName === "string") {
        dependencies.push({
          service: serviceName,
          condition: "service_started",
          restart: false
        });
      }
    }
  } else if (typeof dependsOn === "object" && dependsOn !== null) {
    for (const [serviceName, config] of Object.entries(dependsOn)) {
      const depConfig = config;
      dependencies.push({
        service: serviceName,
        condition: depConfig?.condition || "service_started",
        restart: depConfig?.restart || false
      });
    }
  }
  return dependencies;
}
function validateDependencyConditions(dependencies) {
  const errors = [];
  const validConditions = ["service_started", "service_healthy", "service_completed_successfully"];
  for (const dep of dependencies) {
    if (!dep.service || typeof dep.service !== "string") {
      errors.push(`Invalid service name in dependency: ${dep.service}`);
    }
    if (!validConditions.includes(dep.condition)) {
      errors.push(`Invalid dependency condition '${dep.condition}' for service '${dep.service}'. Valid conditions: ${validConditions.join(", ")}`);
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
function hasHealthcheck(serviceConfig) {
  return !!(serviceConfig?.healthcheck && serviceConfig.healthcheck !== false && serviceConfig.healthcheck.disable !== true);
}
function detectCircularDependencies(services) {
  const visited = /* @__PURE__ */ new Set();
  const recursionStack = /* @__PURE__ */ new Set();
  const cycles = [];
  function dfs(serviceName, path2) {
    if (recursionStack.has(serviceName)) {
      const cycleStart = path2.indexOf(serviceName);
      if (cycleStart !== -1) {
        cycles.push([...path2.slice(cycleStart), serviceName]);
      }
      return true;
    }
    if (visited.has(serviceName)) {
      return false;
    }
    visited.add(serviceName);
    recursionStack.add(serviceName);
    path2.push(serviceName);
    const serviceConfig = services[serviceName];
    if (serviceConfig?.depends_on) {
      const dependencies = parseDependsOn(serviceConfig.depends_on);
      for (const dep of dependencies) {
        if (services[dep.service] && dfs(dep.service, [...path2])) ;
      }
    }
    recursionStack.delete(serviceName);
    path2.pop();
    return false;
  }
  for (const serviceName of Object.keys(services)) {
    if (!visited.has(serviceName)) {
      dfs(serviceName, []);
    }
  }
  return {
    hasCircular: cycles.length > 0,
    cycles
  };
}
function resolveDependencyOrderWithConditions(services) {
  const warnings = [];
  const circularCheck = detectCircularDependencies(services);
  if (circularCheck.hasCircular) {
    warnings.push(`Circular dependencies detected: ${circularCheck.cycles.map((cycle) => cycle.join(" -> ")).join(", ")}`);
  }
  const graph = {};
  const inDegree = {};
  const healthyServices = /* @__PURE__ */ new Set();
  const completionServices = /* @__PURE__ */ new Set();
  for (const serviceName of Object.keys(services)) {
    graph[serviceName] = /* @__PURE__ */ new Set();
    inDegree[serviceName] = 0;
    const serviceConfig = services[serviceName];
    if (hasHealthcheck(serviceConfig)) {
      healthyServices.add(serviceName);
    }
  }
  for (const [serviceName, serviceConfig] of Object.entries(services)) {
    if (serviceConfig?.depends_on) {
      const dependencies = parseDependsOn(serviceConfig.depends_on);
      for (const dep of dependencies) {
        if (services[dep.service]) {
          graph[dep.service].add(serviceName);
          inDegree[serviceName]++;
          if (dep.condition === "service_completed_successfully") {
            completionServices.add(dep.service);
          }
        } else {
          warnings.push(`Service '${serviceName}' depends on undefined service '${dep.service}'`);
        }
      }
    }
  }
  const result = [];
  const batches = [];
  const queue = [];
  const tempInDegree = { ...inDegree };
  for (const [serviceName, degree] of Object.entries(tempInDegree)) {
    if (degree === 0) {
      queue.push(serviceName);
    }
  }
  while (queue.length > 0) {
    const batch = [...queue];
    batches.push(batch);
    queue.length = 0;
    for (const serviceName of batch) {
      result.push(serviceName);
      for (const neighbor of graph[serviceName]) {
        tempInDegree[neighbor]--;
        if (tempInDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      }
    }
  }
  if (result.length !== Object.keys(services).length) {
    const remaining = Object.keys(services).filter((name) => !result.includes(name));
    warnings.push(`Could not resolve dependencies for services: ${remaining.join(", ")} (possible circular dependencies)`);
    result.push(...remaining);
  }
  return {
    order: result,
    batches,
    warnings
  };
}
function createDependencyWaitConfig(serviceName, serviceConfig) {
  const warnings = [];
  const dependencies = [];
  if (!serviceConfig?.depends_on) {
    return { dependencies, warnings };
  }
  const parsedDeps = parseDependsOn(serviceConfig.depends_on);
  const validation = validateDependencyConditions(parsedDeps);
  if (!validation.valid) {
    warnings.push(...validation.errors);
  }
  for (const dep of parsedDeps) {
    let timeout = 3e4;
    switch (dep.condition) {
      case "service_healthy":
        timeout = 6e4;
        break;
      case "service_completed_successfully":
        timeout = 12e4;
        break;
      case "service_started":
      default:
        timeout = 3e4;
        break;
    }
    dependencies.push({
      service: dep.service,
      condition: dep.condition,
      timeout,
      restart: dep.restart
    });
  }
  return { dependencies, warnings };
}
function canSatisfyDependencyCondition(condition, serviceConfig) {
  switch (condition) {
    case "service_started":
      return { canSatisfy: true };
    case "service_healthy":
      if (!hasHealthcheck(serviceConfig)) {
        return {
          canSatisfy: false,
          reason: "Service has no healthcheck defined but dependency requires service_healthy condition"
        };
      }
      return { canSatisfy: true };
    case "service_completed_successfully":
      return { canSatisfy: true };
    default:
      return {
        canSatisfy: false,
        reason: `Unknown dependency condition: ${condition}`
      };
  }
}
function validateAllDependencies(services) {
  const errors = [];
  const warnings = [];
  const circularCheck = detectCircularDependencies(services);
  if (circularCheck.hasCircular) {
    errors.push(`Circular dependencies detected: ${circularCheck.cycles.map((cycle) => cycle.join(" -> ")).join(", ")}`);
  }
  for (const [serviceName, serviceConfig] of Object.entries(services)) {
    if (serviceConfig?.depends_on) {
      const { dependencies, warnings: depWarnings } = createDependencyWaitConfig(serviceName, serviceConfig);
      warnings.push(...depWarnings);
      for (const dep of dependencies) {
        if (!services[dep.service]) {
          errors.push(`Service '${serviceName}' depends on undefined service '${dep.service}'`);
          continue;
        }
        const dependencyServiceConfig = services[dep.service];
        const satisfyCheck = canSatisfyDependencyCondition(dep.condition, dependencyServiceConfig);
        if (!satisfyCheck.canSatisfy) {
          warnings.push(`Service '${serviceName}' dependency on '${dep.service}' with condition '${dep.condition}': ${satisfyCheck.reason}`);
        }
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
function parseActiveProfiles(args, env) {
  const profiles = /* @__PURE__ */ new Set();
  if (args) {
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--profile" && i + 1 < args.length) {
        profiles.add(args[i + 1]);
        i++;
      }
    }
  }
  if (env) {
    const composeProfiles = env["COMPOSE_PROFILES"];
    if (composeProfiles) {
      composeProfiles.split(",").forEach((profile) => {
        const trimmed = profile.trim();
        if (trimmed) profiles.add(trimmed);
      });
    }
  }
  const profilesArray = Array.from(profiles);
  return profilesArray.length > 0 ? profilesArray : ["default"];
}
function validateProfiles(composeData) {
  const errors = [];
  const warnings = [];
  if (!composeData || typeof composeData !== "object") {
    return { valid: true, errors, warnings };
  }
  const topLevelProfiles = composeData.profiles;
  if (topLevelProfiles && !Array.isArray(topLevelProfiles) && typeof topLevelProfiles !== "object") {
    errors.push("Top-level profiles must be an array or object");
  }
  if (composeData.services) {
    for (const [serviceName, serviceConfig] of Object.entries(composeData.services)) {
      if (serviceConfig && typeof serviceConfig === "object") {
        if (serviceConfig.profiles) {
          if (typeof serviceConfig.profiles === "string") {
            continue;
          } else if (Array.isArray(serviceConfig.profiles)) {
            for (const profile of serviceConfig.profiles) {
              if (typeof profile !== "string") {
                errors.push(`Service '${serviceName}' has invalid profile type. Profiles must be strings.`);
              }
              if (!profile.trim()) {
                errors.push(`Service '${serviceName}' has empty profile name.`);
              }
            }
          } else {
            errors.push(`Service '${serviceName}' profiles must be a string or array of strings.`);
          }
        }
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
function getAllDefinedProfiles(composeData) {
  const allProfiles = /* @__PURE__ */ new Set();
  if (!composeData || typeof composeData !== "object") {
    return [];
  }
  if (composeData.profiles) {
    if (Array.isArray(composeData.profiles)) {
      composeData.profiles.forEach((profile) => {
        if (typeof profile === "string") {
          allProfiles.add(profile);
        }
      });
    } else if (typeof composeData.profiles === "object") {
      Object.keys(composeData.profiles).forEach((profile) => {
        allProfiles.add(profile);
      });
    }
  }
  if (composeData.services) {
    for (const serviceConfig of Object.values(composeData.services)) {
      if (serviceConfig && typeof serviceConfig === "object") {
        if (serviceConfig.profiles) {
          if (typeof serviceConfig.profiles === "string") {
            allProfiles.add(serviceConfig.profiles);
          } else if (Array.isArray(serviceConfig.profiles)) {
            serviceConfig.profiles.forEach((profile) => {
              if (typeof profile === "string") {
                allProfiles.add(profile);
              }
            });
          }
        }
      }
    }
  }
  return Array.from(allProfiles).sort();
}
function shouldDeployService(serviceConfig, activeProfiles, defaultBehavior = "include") {
  if (!serviceConfig.profiles) {
    return {
      shouldDeploy: defaultBehavior === "include",
      reason: defaultBehavior === "include" ? "No profiles specified, included by default" : "No profiles specified, excluded by default"
    };
  }
  const serviceProfiles = Array.isArray(serviceConfig.profiles) ? serviceConfig.profiles : [serviceConfig.profiles];
  const matchingProfiles = serviceProfiles.filter((profile) => activeProfiles.includes(profile));
  if (matchingProfiles.length > 0) {
    return {
      shouldDeploy: true,
      reason: `Service profiles [${serviceProfiles.join(", ")}] match active profiles [${matchingProfiles.join(", ")}]`
    };
  }
  return {
    shouldDeploy: false,
    reason: `Service profiles [${serviceProfiles.join(", ")}] do not match active profiles [${activeProfiles.join(", ")}]`
  };
}
function filterServicesByProfiles(services, activeProfiles) {
  const deployableServices = {};
  const skippedServices = [];
  for (const [serviceName, serviceConfig] of Object.entries(services)) {
    const deploymentCheck = shouldDeployService(serviceConfig, activeProfiles);
    if (deploymentCheck.shouldDeploy) {
      deployableServices[serviceName] = serviceConfig;
    } else {
      skippedServices.push({
        name: serviceName,
        reason: deploymentCheck.reason
      });
    }
  }
  return {
    deployableServices,
    skippedServices,
    profileSummary: {
      totalServices: Object.keys(services).length,
      deployableServices: Object.keys(deployableServices).length,
      skippedServices: skippedServices.length,
      activeProfiles
    }
  };
}
function resolveProfileDependencies(composeData, requestedProfiles) {
  const warnings = [];
  const errors = [];
  const resolvedProfiles = new Set(requestedProfiles);
  if (requestedProfiles.length === 0) {
    resolvedProfiles.add("default");
  }
  if (composeData.profiles && typeof composeData.profiles === "object" && !Array.isArray(composeData.profiles)) {
    for (const [profileName, profileConfig] of Object.entries(composeData.profiles)) {
      if (resolvedProfiles.has(profileName) && profileConfig && typeof profileConfig === "object") {
        if (profileConfig.depends_on && Array.isArray(profileConfig.depends_on)) {
          for (const dependency of profileConfig.depends_on) {
            if (typeof dependency === "string") {
              resolvedProfiles.add(dependency);
              warnings.push(`Profile '${profileName}' requires profile '${dependency}' - added automatically`);
            }
          }
        }
        if (profileConfig.conflicts && Array.isArray(profileConfig.conflicts)) {
          for (const conflict of profileConfig.conflicts) {
            if (typeof conflict === "string" && resolvedProfiles.has(conflict)) {
              errors.push(`Profile '${profileName}' conflicts with profile '${conflict}'`);
            }
          }
        }
      }
    }
  }
  const definedProfiles = getAllDefinedProfiles(composeData);
  for (const profile of resolvedProfiles) {
    if (profile !== "default" && !definedProfiles.includes(profile)) {
      warnings.push(`Profile '${profile}' is not defined in the compose file`);
    }
  }
  return {
    resolvedProfiles: Array.from(resolvedProfiles).sort(),
    warnings,
    errors
  };
}
function createProfileDeploymentPlan(composeData, activeProfiles) {
  const warnings = [];
  const errors = [];
  const profileValidation = validateProfiles(composeData);
  warnings.push(...profileValidation.warnings);
  errors.push(...profileValidation.errors);
  const resolution = resolveProfileDependencies(composeData, activeProfiles);
  warnings.push(...resolution.warnings);
  errors.push(...resolution.errors);
  const finalActiveProfiles = resolution.resolvedProfiles;
  const serviceFiltering = filterServicesByProfiles(composeData.services || {}, finalActiveProfiles);
  const volumesToCreate = /* @__PURE__ */ new Set();
  const networksToCreate = /* @__PURE__ */ new Set();
  for (const serviceName of Object.keys(serviceFiltering.deployableServices)) {
    const serviceConfig = serviceFiltering.deployableServices[serviceName];
    if (serviceConfig.volumes) {
      const volumes = Array.isArray(serviceConfig.volumes) ? serviceConfig.volumes : [];
      for (const volume of volumes) {
        if (typeof volume === "string") {
          const parts = volume.split(":");
          const source = parts[0];
          if (!source.startsWith("/") && !source.startsWith("./") && !source.startsWith("../")) {
            volumesToCreate.add(source);
          }
        } else if (typeof volume === "object" && volume.source && volume.type === "volume") {
          volumesToCreate.add(volume.source);
        }
      }
    }
    if (serviceConfig.networks) {
      if (Array.isArray(serviceConfig.networks)) {
        serviceConfig.networks.forEach((network) => networksToCreate.add(network));
      } else if (typeof serviceConfig.networks === "object") {
        Object.keys(serviceConfig.networks).forEach((network) => networksToCreate.add(network));
      }
    }
  }
  const definedVolumes = composeData.volumes ? Object.keys(composeData.volumes) : [];
  const filteredVolumes = Array.from(volumesToCreate).filter((vol) => definedVolumes.includes(vol));
  const definedNetworks = composeData.networks ? Object.keys(composeData.networks) : [];
  const filteredNetworks = Array.from(networksToCreate).filter((net) => definedNetworks.includes(net));
  return {
    plan: {
      servicesToDeploy: Object.keys(serviceFiltering.deployableServices),
      servicesToSkip: serviceFiltering.skippedServices,
      volumesToCreate: filteredVolumes,
      networksToCreate: filteredNetworks
    },
    summary: {
      totalServices: serviceFiltering.profileSummary.totalServices,
      deployableServices: serviceFiltering.profileSummary.deployableServices,
      skippedServices: serviceFiltering.profileSummary.skippedServices,
      activeProfiles: finalActiveProfiles,
      allDefinedProfiles: getAllDefinedProfiles(composeData)
    },
    warnings,
    errors
  };
}
function applyProfileFiltering(composeData, activeProfiles) {
  const deploymentPlan = createProfileDeploymentPlan(composeData, activeProfiles);
  const filteredComposeData = {
    ...composeData,
    services: {},
    volumes: {},
    networks: {}
  };
  for (const serviceName of deploymentPlan.plan.servicesToDeploy) {
    if (composeData.services && composeData.services[serviceName]) {
      filteredComposeData.services[serviceName] = composeData.services[serviceName];
    }
  }
  for (const volumeName of deploymentPlan.plan.volumesToCreate) {
    if (composeData.volumes && composeData.volumes[volumeName]) {
      filteredComposeData.volumes[volumeName] = composeData.volumes[volumeName];
    }
  }
  for (const networkName of deploymentPlan.plan.networksToCreate) {
    if (composeData.networks && composeData.networks[networkName]) {
      filteredComposeData.networks[networkName] = composeData.networks[networkName];
    }
  }
  if (Object.keys(filteredComposeData.networks).length === 0 && Object.keys(filteredComposeData.services).length > 0) {
    filteredComposeData.networks.default = {
      driver: "bridge"
    };
  }
  return {
    filteredComposeData,
    deploymentPlan
  };
}
function getProfileUsageStats(composeData) {
  const allProfiles = getAllDefinedProfiles(composeData);
  const profileServiceMap = /* @__PURE__ */ new Map();
  const servicesWithoutProfiles = [];
  const servicesWithProfiles = [];
  allProfiles.forEach((profile) => {
    profileServiceMap.set(profile, []);
  });
  if (composeData.services) {
    for (const [serviceName, serviceConfig] of Object.entries(composeData.services)) {
      if (serviceConfig && typeof serviceConfig === "object") {
        if (serviceConfig.profiles) {
          const serviceProfiles = Array.isArray(serviceConfig.profiles) ? serviceConfig.profiles : [serviceConfig.profiles];
          servicesWithProfiles.push({
            service: serviceName,
            profiles: serviceProfiles
          });
          serviceProfiles.forEach((profile) => {
            if (!profileServiceMap.has(profile)) {
              profileServiceMap.set(profile, []);
            }
            profileServiceMap.get(profile).push(serviceName);
          });
        } else {
          servicesWithoutProfiles.push(serviceName);
        }
      }
    }
  }
  const profilesWithServices = Array.from(profileServiceMap.entries()).map(([profile, services]) => ({
    profile,
    serviceCount: services.length,
    services: services.sort()
  }));
  return {
    totalProfiles: allProfiles.length,
    profilesWithServices,
    servicesWithoutProfiles: servicesWithoutProfiles.sort(),
    servicesWithProfiles
  };
}
function generateProfileHelp(composeData) {
  const stats = getProfileUsageStats(composeData);
  const allProfiles = getAllDefinedProfiles(composeData);
  let help = "Docker Compose Profiles Available:\n\n";
  if (allProfiles.length === 0) {
    help += "No profiles are defined in this compose file.\n";
    help += "All services will be deployed by default.\n";
    return help;
  }
  help += `Total profiles defined: ${stats.totalProfiles}

`;
  for (const profileInfo of stats.profilesWithServices) {
    help += `Profile: ${profileInfo.profile}
`;
    help += `  Services (${profileInfo.serviceCount}): ${profileInfo.services.join(", ")}

`;
  }
  if (stats.servicesWithoutProfiles.length > 0) {
    help += `Services without profiles (always deployed): ${stats.servicesWithoutProfiles.join(", ")}

`;
  }
  help += "Usage:\n";
  help += "  Deploy specific profile: --profile <profile-name>\n";
  help += "  Deploy multiple profiles: --profile prof1 --profile prof2\n";
  help += "  Environment variable: COMPOSE_PROFILES=prof1,prof2\n";
  return help;
}

export { DEFAULT_COMPOSE_VERSION, SUPPORTED_COMPOSE_VERSIONS, applyProfileFiltering, canSatisfyDependencyCondition, createDependencyWaitConfig, createProfileDeploymentPlan, createVolumeDefinitions, detectCircularDependencies, filterServicesByProfiles, generateConfigHash, generateProfileHelp, getAllDefinedProfiles, getProfileUsageStats, hasHealthcheck, normalizeHealthcheckTest, parseActiveProfiles, parseDependsOn, parseEnvContent, parseMemory, parseTimeToNanoseconds, parseYamlContent, prepareEnvironmentVariables, prepareExtraHosts, prepareHealthcheck, prepareLogConfig, preparePorts, prepareRestartPolicy, prepareUlimits, prepareVolumes, resolveDependencyOrder, resolveDependencyOrderWithConditions, resolveProfileDependencies, shouldDeployService, substituteVariablesInObject, validateAllDependencies, validateComposeContent, validateComposeStructure, validateDependencyConditions, validateProfiles };
//# sourceMappingURL=compose.utils-Dy0jCFPf.js.map
