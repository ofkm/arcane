import { load as yamlLoad, dump as yamlDump } from 'js-yaml';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

// Compose specification constants
export const SUPPORTED_COMPOSE_VERSIONS = ['3.0', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9'];
export const DEFAULT_COMPOSE_VERSION = '3.8';

/**
 * Parse environment file content with proper .env spec support
 */
export function parseEnvContent(envContent: string | null): Record<string, string> {
	const envVars: Record<string, string> = {};
	if (envContent) {
		const lines = envContent.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			// Skip empty lines and comments
			if (!line || line.startsWith('#')) continue;

			// Handle quoted values and escaping
			const equalIndex = line.indexOf('=');
			if (equalIndex === -1) continue;

			const key = line.substring(0, equalIndex).trim();
			let value = line.substring(equalIndex + 1);

			// Handle quoted values
			if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
				// Handle escaped quotes within double quotes
				if (value.includes('\\"')) {
					value = value.replace(/\\"/g, '"');
				}
				if (value.includes("\\'")) {
					value = value.replace(/\\'/g, "'");
				}
			}

			// Handle special characters and newlines
			value = value.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

			if (key) {
				envVars[key] = value;
			}
		}
	}
	return envVars;
}

/**
 * Validate compose file version and structure according to spec
 */
export function validateComposeStructure(composeData: any): { valid: boolean; errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!composeData || typeof composeData !== 'object') {
		errors.push('Compose file must be a valid YAML object');
		return { valid: false, errors, warnings };
	}

	// Check version
	if (composeData.version) {
		if (!SUPPORTED_COMPOSE_VERSIONS.includes(composeData.version)) {
			warnings.push(`Compose version ${composeData.version} may not be fully supported. Supported versions: ${SUPPORTED_COMPOSE_VERSIONS.join(', ')}`);
		}
	} else {
		warnings.push('No version specified in compose file. Consider adding a version field.');
	}

	// Services are required
	if (!composeData.services || typeof composeData.services !== 'object') {
		errors.push('Compose file must have a services section');
		return { valid: false, errors, warnings };
	}

	// Validate each service
	for (const [serviceName, serviceConfig] of Object.entries(composeData.services)) {
		const service = serviceConfig as any;

		// Each service must have image or build
		if (!service.image && !service.build) {
			errors.push(`Service '${serviceName}' must have either 'image' or 'build' field`);
		}

		// Validate service name format
		if (!/^[a-zA-Z0-9._-]+$/.test(serviceName)) {
			errors.push(`Service name '${serviceName}' contains invalid characters. Use only letters, numbers, dots, hyphens, and underscores.`);
		}

		// Validate depends_on
		if (service.depends_on) {
			if (Array.isArray(service.depends_on)) {
				for (const dep of service.depends_on) {
					if (!composeData.services[dep]) {
						errors.push(`Service '${serviceName}' depends on '${dep}' which doesn't exist`);
					}
				}
			} else if (typeof service.depends_on === 'object') {
				for (const dep of Object.keys(service.depends_on)) {
					if (!composeData.services[dep]) {
						errors.push(`Service '${serviceName}' depends on '${dep}' which doesn't exist`);
					}
				}
			}
		}

		// Validate networks
		if (service.networks) {
			if (Array.isArray(service.networks)) {
				for (const network of service.networks) {
					if (typeof network === 'string' && composeData.networks && !composeData.networks[network]) {
						warnings.push(`Service '${serviceName}' references network '${network}' which is not defined`);
					}
				}
			} else if (typeof service.networks === 'object') {
				for (const network of Object.keys(service.networks)) {
					if (composeData.networks && !composeData.networks[network]) {
						warnings.push(`Service '${serviceName}' references network '${network}' which is not defined`);
					}
				}
			}
		}

		// Validate volumes
		if (service.volumes) {
			for (const volume of service.volumes) {
				if (typeof volume === 'object' && volume.source && volume.type === 'volume') {
					if (composeData.volumes && !composeData.volumes[volume.source]) {
						warnings.push(`Service '${serviceName}' references volume '${volume.source}' which is not defined`);
					}
				}
			}
		}

		// Validate ports format
		if (service.ports) {
			for (const port of service.ports) {
				if (typeof port === 'string') {
					const portRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:)?(\d+:)?\d+(\/[a-z]+)?$/;
					if (!portRegex.test(port)) {
						errors.push(`Service '${serviceName}' has invalid port format: '${port}'`);
					}
				}
			}
		}
	}

	// Validate networks section
	if (composeData.networks) {
		for (const [networkName, networkConfig] of Object.entries(composeData.networks)) {
			const network = networkConfig as any;

			if (network.external && typeof network.external === 'object' && !network.external.name) {
				warnings.push(`External network '${networkName}' should have a name specified`);
			}

			if (network.driver && !['bridge', 'host', 'overlay', 'macvlan', 'none'].includes(network.driver)) {
				warnings.push(`Network '${networkName}' uses uncommon driver '${network.driver}'`);
			}
		}
	}

	// Validate volumes section
	if (composeData.volumes) {
		for (const [volumeName, volumeConfig] of Object.entries(composeData.volumes)) {
			const volume = volumeConfig as any;

			if (volume.external && typeof volume.external === 'object' && !volume.external.name) {
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

/**
 * Normalize healthcheck according to Compose spec
 */
export function normalizeHealthcheckTest(composeContent: string, envGetter?: (key: string) => string | undefined): string {
	let doc: any;
	try {
		doc = yamlLoad(composeContent);
		if (!doc || typeof doc !== 'object') {
			return composeContent;
		}
	} catch (e) {
		console.warn('Could not parse compose YAML for normalization:', e);
		return composeContent;
	}

	let modified = false;

	if (doc.services && typeof doc.services === 'object') {
		for (const serviceName in doc.services) {
			const service = doc.services[serviceName];
			if (service?.healthcheck) {
				// Normalize healthcheck test format
				if (service.healthcheck.test) {
					if (typeof service.healthcheck.test === 'string') {
						if (service.healthcheck.test.startsWith('CMD-SHELL ')) {
							service.healthcheck.test = ['CMD-SHELL', service.healthcheck.test.substring(11)];
						} else if (service.healthcheck.test.startsWith('CMD ')) {
							service.healthcheck.test = service.healthcheck.test.substring(4).split(' ');
							service.healthcheck.test.unshift('CMD');
						} else if (!service.healthcheck.test.startsWith('NONE')) {
							service.healthcheck.test = ['CMD-SHELL', service.healthcheck.test];
						}
						modified = true;
					} else if (Array.isArray(service.healthcheck.test)) {
						if (service.healthcheck.test.length > 0 && !['CMD', 'CMD-SHELL', 'NONE'].includes(service.healthcheck.test[0])) {
							service.healthcheck.test.unshift('CMD');
							modified = true;
						}
					}
				}

				// Normalize interval, timeout, start_period, retries
				if (service.healthcheck.interval && typeof service.healthcheck.interval === 'number') {
					service.healthcheck.interval = `${service.healthcheck.interval}s`;
					modified = true;
				}
				if (service.healthcheck.timeout && typeof service.healthcheck.timeout === 'number') {
					service.healthcheck.timeout = `${service.healthcheck.timeout}s`;
					modified = true;
				}
				if (service.healthcheck.start_period && typeof service.healthcheck.start_period === 'number') {
					service.healthcheck.start_period = `${service.healthcheck.start_period}s`;
					modified = true;
				}
			}
		}
	}

	// Perform variable substitution if envGetter is provided
	if (envGetter) {
		const originalDocSnapshot = JSON.stringify(doc);
		doc = substituteVariablesInObject(doc, envGetter);
		if (JSON.stringify(doc) !== originalDocSnapshot) {
			modified = true;
		}
	}

	if (modified) {
		return yamlDump(doc, { lineWidth: -1, quotingType: '"', forceQuotes: false });
	}
	return composeContent;
}

/**
 * Parse YAML content with proper Compose spec validation
 */
export function parseYamlContent(content: string, envGetter?: (key: string) => string | undefined): Record<string, any> | null {
	try {
		const parsedYaml = yamlLoad(content);

		if (!parsedYaml || typeof parsedYaml !== 'object') {
			console.warn('Parsed YAML content is not an object or is null.');
			return null;
		}

		// Validate structure
		const validation = validateComposeStructure(parsedYaml);
		if (!validation.valid) {
			console.error('Compose validation errors:', validation.errors);
		}
		if (validation.warnings.length > 0) {
			console.warn('Compose validation warnings:', validation.warnings);
		}

		let result = parsedYaml as Record<string, any>;

		// Apply environment variable substitution
		if (envGetter) {
			result = substituteVariablesInObject(result, envGetter);
		}

		// Ensure we have a default network if none specified
		if (!result.networks) {
			result.networks = {
				default: {
					driver: 'bridge'
				}
			};
		}

		return result;
	} catch (error) {
		console.error('Error parsing YAML content:', error);
		return null;
	}
}

/**
 * Enhanced variable substitution with Compose spec compliance
 */
export function substituteVariablesInObject(obj: any, envGetter: (key: string) => string | undefined): any {
	if (Array.isArray(obj)) {
		return obj.map((item) => substituteVariablesInObject(item, envGetter));
	} else if (typeof obj === 'object' && obj !== null) {
		const newObj: Record<string, any> = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				newObj[key] = substituteVariablesInObject(obj[key], envGetter);
			}
		}
		return newObj;
	} else if (typeof obj === 'string') {
		let result = obj;

		// Handle ${VAR} format
		result = result.replace(/\$\{([^}]+)\}/g, (match, varExpression) => {
			// Handle default values: ${VAR:-default} or ${VAR-default}
			const colonDefaultMatch = varExpression.match(/^([^:]+):-(.*)$/);
			const defaultMatch = varExpression.match(/^([^-]+)-(.*)$/);

			if (colonDefaultMatch) {
				const [, varName, defaultValue] = colonDefaultMatch;
				const value = envGetter(varName);
				return value !== undefined && value !== '' ? value : defaultValue;
			} else if (defaultMatch) {
				const [, varName, defaultValue] = defaultMatch;
				const value = envGetter(varName);
				return value !== undefined ? value : defaultValue;
			} else {
				// Simple variable substitution
				const value = envGetter(varExpression);
				return value !== undefined ? value : match; // Keep original if not found
			}
		});

		// Handle $VAR format (without braces)
		result = result.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => {
			const value = envGetter(varName);
			return value !== undefined ? value : match;
		});

		return result;
	}
	return obj;
}

/**
 * Enhanced volume preparation with full Docker Compose specification support
 * Handles short syntax, long syntax, bind mounts, named volumes, tmpfs, and all volume options
 */
export function prepareVolumes(volumes: any[], composeData: any, stackId: string): string[] {
	if (!Array.isArray(volumes)) {
		return [];
	}

	const binds: string[] = [];
	const tmpfsMounts: string[] = [];

	for (const volume of volumes) {
		if (typeof volume === 'string') {
			// Short syntax: "source:target" or "source:target:mode"
			const bind = processShortVolumeString(volume, composeData, stackId);
			if (bind) binds.push(bind);
		} else if (typeof volume === 'object' && volume !== null) {
			// Long syntax object
			const result = processLongVolumeObject(volume, composeData, stackId);
			if (result.bind) binds.push(result.bind);
			if (result.tmpfs) tmpfsMounts.push(result.tmpfs);
		}
	}

	// Note: tmpfs mounts need to be handled separately in container creation
	// For now, we'll store them in a way that can be retrieved later
	return binds.filter(Boolean);
}

/**
 * Process short volume syntax strings
 * Examples: "/host/path:/container/path", "volume-name:/data", "/path:/data:ro"
 */
function processShortVolumeString(volumeString: string, composeData: any, stackId: string): string | null {
	const parts = volumeString.split(':');

	if (parts.length < 2) {
		console.warn(`Invalid volume syntax: ${volumeString}. Expected at least "source:target"`);
		return null;
	}

	const source = parts[0];
	const target = parts[1];
	const options = parts.slice(2);

	// Determine if source is a named volume or bind mount
	if (source.startsWith('/') || source.startsWith('./') || source.startsWith('../')) {
		// Bind mount
		return formatBindMount(source, target, options);
	} else {
		// Named volume - check if it's defined in the compose file
		const isNamedVolume = composeData.volumes && composeData.volumes[source];

		if (isNamedVolume || !source.includes('/')) {
			// Named volume - prefix with stack name
			const volumeName = `${stackId}_${source}`;
			return formatVolumeMount(volumeName, target, options);
		} else {
			// Treat as bind mount if it contains path separators
			return formatBindMount(source, target, options);
		}
	}
}

/**
 * Process long volume syntax objects
 * Supports all Docker Compose volume options
 */
function processLongVolumeObject(volume: any, composeData: any, stackId: string): { bind?: string; tmpfs?: string } {
	const { type, source, target, read_only, consistency, bind, volume: volumeOpts, tmpfs } = volume;

	if (!target) {
		console.warn(`Volume missing required 'target' field:`, volume);
		return {};
	}

	switch (type) {
		case 'bind':
			return { bind: processBindMount(source, target, { read_only, consistency, bind }) };

		case 'volume':
			return { bind: processVolumeMount(source, target, stackId, composeData, { read_only, volume: volumeOpts }) };

		case 'tmpfs':
			return { tmpfs: processTmpfsMount(target, { tmpfs }) };

		default:
			console.warn(`Unsupported volume type: ${type}`);
			return {};
	}
}

/**
 * Process bind mount with all options
 */
function processBindMount(source: string, target: string, options: any = {}): string {
	if (!source) {
		throw new Error('Bind mount requires a source path');
	}

	const parts = [source, target];
	const mountOptions: string[] = [];

	// Read-only option
	if (options.read_only) {
		mountOptions.push('ro');
	}

	// Bind-specific options
	if (options.bind) {
		if (options.bind.propagation) {
			// Docker bind propagation: shared, slave, private, rshared, rslave, rprivate
			mountOptions.push(`bind-propagation=${options.bind.propagation}`);
		}

		if (options.bind.create_host_path !== false) {
			// Default behavior - Docker creates host path if it doesn't exist
			mountOptions.push('bind-nonrecursive=false');
		}
	}

	// Consistency option (mainly for Docker Desktop)
	if (options.consistency) {
		// cached, delegated, consistent
		mountOptions.push(`consistency=${options.consistency}`);
	}

	if (mountOptions.length > 0) {
		parts.push(mountOptions.join(','));
	}

	return parts.join(':');
}

/**
 * Process named volume mount with all options
 */
function processVolumeMount(source: string, target: string, stackId: string, composeData: any, options: any = {}): string {
	let volumeName = '';

	if (source) {
		// Check if it's a defined volume in the compose file
		if (composeData.volumes && composeData.volumes[source]) {
			volumeName = `${stackId}_${source}`;
		} else {
			// External volume or absolute volume name
			volumeName = source;
		}
	} else {
		// Anonymous volume - Docker will generate a name
		volumeName = '';
	}

	const parts = [volumeName, target];
	const mountOptions: string[] = [];

	// Read-only option
	if (options.read_only) {
		mountOptions.push('ro');
	}

	// Volume-specific options
	if (options.volume) {
		if (options.volume.nocopy) {
			mountOptions.push('nocopy');
		}
	}

	if (mountOptions.length > 0) {
		parts.push(mountOptions.join(','));
	}

	return parts.join(':');
}

/**
 * Process tmpfs mount with all options
 * Note: tmpfs mounts need special handling in container creation
 */
function processTmpfsMount(target: string, options: any = {}): string {
	const mountOptions: string[] = [];

	if (options.tmpfs) {
		if (options.tmpfs.size) {
			// Size in bytes or with suffix (100m, 1g)
			mountOptions.push(`size=${options.tmpfs.size}`);
		}

		if (options.tmpfs.mode) {
			// File mode in octal
			mountOptions.push(`mode=${options.tmpfs.mode}`);
		}

		if (options.tmpfs.uid !== undefined) {
			mountOptions.push(`uid=${options.tmpfs.uid}`);
		}

		if (options.tmpfs.gid !== undefined) {
			mountOptions.push(`gid=${options.tmpfs.gid}`);
		}

		if (options.tmpfs.noexec) {
			mountOptions.push('noexec');
		}

		if (options.tmpfs.nosuid) {
			mountOptions.push('nosuid');
		}

		if (options.tmpfs.nodev) {
			mountOptions.push('nodev');
		}
	}

	// Return in format that can be processed later for tmpfs creation
	return `${target}:${mountOptions.join(',')}`;
}

/**
 * Format bind mount string
 */
function formatBindMount(source: string, target: string, options: string[] = []): string {
	const parts = [source, target];

	if (options.length > 0) {
		parts.push(options.join(','));
	}

	return parts.join(':');
}

/**
 * Format volume mount string
 */
function formatVolumeMount(volumeName: string, target: string, options: string[] = []): string {
	const parts = [volumeName, target];

	if (options.length > 0) {
		parts.push(options.join(','));
	}

	return parts.join(':');
}

/**
 * Extract tmpfs mounts from volume definitions
 * This should be called during container creation to handle tmpfs mounts separately
 */
export function extractTmpfsMounts(volumes: any[]): Array<{ target: string; options: any }> {
	if (!Array.isArray(volumes)) {
		return [];
	}

	const tmpfsMounts: Array<{ target: string; options: any }> = [];

	for (const volume of volumes) {
		if (typeof volume === 'object' && volume !== null && volume.type === 'tmpfs') {
			tmpfsMounts.push({
				target: volume.target,
				options: volume.tmpfs || {}
			});
		}
	}

	return tmpfsMounts;
}

/**
 * Create Docker volume definitions for named volumes
 * This should be called before creating containers to ensure named volumes exist
 */
export function createVolumeDefinitions(composeData: any, stackId: string): Array<{ name: string; config: any }> {
	if (!composeData.volumes) {
		return [];
	}

	const volumeDefinitions: Array<{ name: string; config: any }> = [];

	for (const [volumeName, volumeConfig] of Object.entries(composeData.volumes)) {
		// Skip external volumes
		if (volumeConfig && typeof volumeConfig === 'object' && (volumeConfig as any).external) {
			continue;
		}

		const config = volumeConfig || {};
		const fullVolumeName = `${stackId}_${volumeName}`;

		volumeDefinitions.push({
			name: fullVolumeName,
			config: {
				Driver: (config as any).driver || 'local',
				DriverOpts: (config as any).driver_opts || {},
				Labels: {
					'com.docker.compose.project': stackId,
					'com.docker.compose.volume': volumeName,
					...((config as any).labels || {})
				}
			}
		});
	}

	return volumeDefinitions;
}

/**
 * Validate volume configuration
 */
export function validateVolumeConfiguration(volumes: any[]): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!Array.isArray(volumes)) {
		return { valid: true, errors: [] }; // No volumes is valid
	}

	for (let i = 0; i < volumes.length; i++) {
		const volume = volumes[i];

		if (typeof volume === 'string') {
			// Validate short syntax
			if (!volume.includes(':')) {
				errors.push(`Volume ${i}: Invalid short syntax "${volume}". Expected "source:target" format.`);
			}
		} else if (typeof volume === 'object' && volume !== null) {
			// Validate long syntax
			if (!volume.target) {
				errors.push(`Volume ${i}: Missing required 'target' field in long syntax.`);
			}

			if (volume.type && !['bind', 'volume', 'tmpfs', 'npipe'].includes(volume.type)) {
				errors.push(`Volume ${i}: Invalid type "${volume.type}". Must be one of: bind, volume, tmpfs, npipe.`);
			}

			if (volume.type === 'bind' && !volume.source) {
				errors.push(`Volume ${i}: Bind mount requires 'source' field.`);
			}
		} else {
			errors.push(`Volume ${i}: Invalid volume definition. Must be string or object.`);
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Enhanced port preparation with full Compose spec support
 */
export function preparePorts(ports: any[]): any {
	if (!Array.isArray(ports)) {
		return {};
	}

	const portBindings: any = {};

	for (const port of ports) {
		if (typeof port === 'string') {
			// Handle various string formats
			if (port.includes(':')) {
				const parts = port.split(':');
				let hostIP = '';
				let hostPort = '';
				let containerPort = '';

				if (parts.length === 2) {
					// "hostPort:containerPort"
					hostPort = parts[0];
					containerPort = parts[1];
				} else if (parts.length === 3) {
					// "hostIP:hostPort:containerPort"
					hostIP = parts[0];
					hostPort = parts[1];
					containerPort = parts[2];
				}

				// Handle protocol specification
				let protocol = 'tcp';
				if (containerPort.includes('/')) {
					[containerPort, protocol] = containerPort.split('/');
				}

				const containerPortKey = `${containerPort}/${protocol}`;
				portBindings[containerPortKey] = [
					{
						HostIp: hostIP,
						HostPort: hostPort
					}
				];
			} else {
				// Just container port
				let containerPort = port;
				let protocol = 'tcp';

				if (port.includes('/')) {
					[containerPort, protocol] = port.split('/');
				}

				const containerPortKey = `${containerPort}/${protocol}`;
				portBindings[containerPortKey] = [{}]; // Let Docker assign
			}
		} else if (typeof port === 'object') {
			// Long syntax
			const containerPort = port.target.toString();
			const protocol = port.protocol || 'tcp';
			const containerPortKey = `${containerPort}/${protocol}`;

			const binding: any = {};
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

/**
 * Enhanced environment variable preparation
 */
export async function prepareEnvironmentVariables(environment: any, stackDir: string): Promise<string[]> {
	const envArray: string[] = [];
	const envMap = new Map<string, string>();

	// Load .env file first (lowest priority)
	try {
		const envFilePath = path.join(stackDir, '.env');
		const envFileContent = await fs.readFile(envFilePath, 'utf8');
		const envVars = parseEnvContent(envFileContent);

		for (const [key, value] of Object.entries(envVars)) {
			envMap.set(key, value);
		}
	} catch (envError) {
		// .env file doesn't exist, that's okay
	}

	// Add process environment (medium priority)
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) {
			envMap.set(key, value);
		}
	}

	// Add compose environment (highest priority)
	if (Array.isArray(environment)) {
		// Array format: ['KEY=value', 'KEY2=value2']
		for (const env of environment) {
			if (typeof env === 'string' && env.includes('=')) {
				const [key, ...valueParts] = env.split('=');
				envMap.set(key, valueParts.join('='));
			}
		}
	} else if (typeof environment === 'object' && environment !== null) {
		// Object format: { KEY: 'value', KEY2: 'value2' }
		for (const [key, value] of Object.entries(environment)) {
			if (value !== null && value !== undefined) {
				envMap.set(key, value.toString());
			}
		}
	}

	// Convert map to array
	for (const [key, value] of envMap) {
		envArray.push(`${key}=${value}`);
	}

	return envArray;
}

/**
 * Enhanced restart policy with full spec support
 */
export function prepareRestartPolicy(restart: string | undefined): any {
	if (!restart || restart === 'no') {
		return { Name: 'no' };
	}

	switch (restart) {
		case 'always':
			return { Name: 'always' };
		case 'unless-stopped':
			return { Name: 'unless-stopped' };
		case 'on-failure':
			return { Name: 'on-failure', MaximumRetryCount: 0 };
		default:
			// Handle on-failure:5 format
			if (restart.startsWith('on-failure:')) {
				const retryCount = parseInt(restart.split(':')[1]) || 0;
				return { Name: 'on-failure', MaximumRetryCount: retryCount };
			}
			return { Name: 'no' };
	}
}

/**
 * Resolve dependency order for services
 */
export function resolveDependencyOrder(services: Record<string, any>): string[] {
	const resolved: string[] = [];
	const resolving: Set<string> = new Set();

	function resolve(serviceName: string) {
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

/**
 * Generate config hash for service changes
 */
export function generateConfigHash(service: any): string {
	const configString = JSON.stringify(service);
	let hash = 0;
	for (let i = 0; i < configString.length; i++) {
		const char = configString.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash).toString(16);
}

/**
 * Prepare extra hosts
 */
export function prepareExtraHosts(extraHosts: any[]): string[] {
	if (!Array.isArray(extraHosts)) return [];

	return extraHosts
		.map((host) => {
			if (typeof host === 'string') {
				return host;
			} else if (typeof host === 'object') {
				return `${host.hostname}:${host.ip}`;
			}
			return '';
		})
		.filter((h) => h);
}

/**
 * Prepare ulimits
 */
export function prepareUlimits(ulimits: any): any[] {
	// Handle null, undefined, or non-object values
	if (!ulimits || typeof ulimits !== 'object') {
		return [];
	}

	// Handle array format (already in Docker format)
	if (Array.isArray(ulimits)) {
		return ulimits;
	}

	// Handle object format (Docker Compose format)
	return Object.entries(ulimits).map(([name, value]) => {
		if (typeof value === 'number') {
			return {
				Name: name,
				Soft: value,
				Hard: value
			};
		} else if (typeof value === 'object' && value !== null) {
			const limit = value as any;
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

/**
 * Prepare log config
 */
export function prepareLogConfig(logging: any): any {
	if (!logging || !logging.driver) {
		return { Type: 'json-file' };
	}

	return {
		Type: logging.driver,
		Config: logging.options || {}
	};
}

/**
 * Prepare healthcheck
 */
export function prepareHealthcheck(healthcheck: any): any {
	if (!healthcheck) return undefined;

	const config: any = {};

	if (healthcheck.test) {
		if (Array.isArray(healthcheck.test)) {
			config.Test = healthcheck.test;
		} else if (typeof healthcheck.test === 'string') {
			if (healthcheck.test === 'NONE') {
				config.Test = ['NONE'];
			} else {
				config.Test = ['CMD-SHELL', healthcheck.test];
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

/**
 * Parse memory string to bytes
 */
export function parseMemory(memStr: string | number): number {
	if (typeof memStr === 'number') return memStr;

	const str = memStr.toString().toLowerCase();
	const num = parseFloat(str);

	if (str.includes('k')) return Math.round(num * 1024);
	if (str.includes('m')) return Math.round(num * 1024 * 1024);
	if (str.includes('g')) return Math.round(num * 1024 * 1024 * 1024);

	return Math.round(num);
}

/**
 * Parse time string to nanoseconds
 */
export function parseTimeToNanoseconds(timeStr: string | number): number {
	if (typeof timeStr === 'number') return timeStr * 1000000000; // assume seconds

	const str = timeStr.toString().toLowerCase();
	const num = parseFloat(str);

	if (str.includes('ns')) return Math.round(num);
	if (str.includes('us') || str.includes('μs')) return Math.round(num * 1000);
	if (str.includes('ms')) return Math.round(num * 1000000);
	if (str.includes('s')) return Math.round(num * 1000000000);
	if (str.includes('m')) return Math.round(num * 60 * 1000000000);
	if (str.includes('h')) return Math.round(num * 60 * 60 * 1000000000);

	return Math.round(num * 1000000000); // assume seconds
}

/**
 * Validate compose content
 */
export function validateComposeContent(content: string): { valid: boolean; errors: string[]; warnings: string[] } {
	try {
		const parsed = yamlLoad(content);
		return validateComposeStructure(parsed);
	} catch (parseError) {
		return {
			valid: false,
			errors: [`YAML parsing error: ${parseError instanceof Error ? parseError.message : String(parseError)}`],
			warnings: []
		};
	}
}
