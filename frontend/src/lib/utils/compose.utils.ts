import { load as yamlLoad, dump as yamlDump } from 'js-yaml';
import { promises as fs, existsSync } from 'node:fs';
import * as path from 'node:path';
// Add the import for the ComposeSpecification type
import type { ComposeSpecification, Service as ServiceConfig } from '../types/compose.spec.type.js';

// Compose specification constants
export const SUPPORTED_COMPOSE_VERSIONS = [
	'3.0',
	'3.1',
	'3.2',
	'3.3',
	'3.4',
	'3.5',
	'3.6',
	'3.7',
	'3.8',
	'3.9'
];
export const DEFAULT_COMPOSE_VERSION = '3.8';

/**
 * Docker Compose profile-related types
 */
export interface ProfileConfig {
	description?: string;
	depends_on?: string[];
	conflicts?: string[];
}

export interface ServiceProfile {
	service: string;
	profiles: string[];
}

export interface ProfileDeploymentCheck {
	shouldDeploy: boolean;
	reason: string;
}

export interface ProfileServiceFiltering {
	deployableServices: Record<string, any>;
	skippedServices: Array<{ name: string; reason: string }>;
	profileSummary: {
		totalServices: number;
		deployableServices: number;
		skippedServices: number;
		activeProfiles: string[];
	};
}

export interface ProfileResolution {
	resolvedProfiles: string[];
	warnings: string[];
	errors: string[];
}

export interface ProfileDeploymentPlan {
	plan: {
		servicesToDeploy: string[];
		servicesToSkip: Array<{ name: string; reason: string }>;
		volumesToCreate: string[];
		networksToCreate: string[];
	};
	summary: {
		totalServices: number;
		deployableServices: number;
		skippedServices: number;
		activeProfiles: string[];
		allDefinedProfiles: string[];
	};
	warnings: string[];
	errors: string[];
}

export interface ProfileUsageStats {
	totalProfiles: number;
	profilesWithServices: Array<{ profile: string; serviceCount: number; services: string[] }>;
	servicesWithoutProfiles: string[];
	servicesWithProfiles: ServiceProfile[];
}

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
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
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
export function validateComposeStructure(composeData: ComposeSpecification): {
	valid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!composeData || typeof composeData !== 'object') {
		errors.push('Compose file must be a valid YAML object');
		return { valid: false, errors, warnings };
	}

	// Check version
	if (composeData.version) {
		if (!SUPPORTED_COMPOSE_VERSIONS.includes(composeData.version)) {
			warnings.push(
				`Compose version ${composeData.version} may not be fully supported. Supported versions: ${SUPPORTED_COMPOSE_VERSIONS.join(', ')}`
			);
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
		// Each service must have image or build
		if (!serviceConfig.image && !serviceConfig.build) {
			errors.push(`Service '${serviceName}' must have either 'image' or 'build' field`);
		}

		// Validate service name format
		if (!/^[a-zA-Z0-9._-]+$/.test(serviceName)) {
			errors.push(
				`Service name '${serviceName}' contains invalid characters. Use only letters, numbers, dots, hyphens, and underscores.`
			);
		}

		// Validate depends_on
		if (serviceConfig.depends_on) {
			if (Array.isArray(serviceConfig.depends_on)) {
				for (const dep of serviceConfig.depends_on) {
					if (!composeData.services[dep]) {
						errors.push(`Service '${serviceName}' depends on '${dep}' which doesn't exist`);
					}
				}
			} else if (typeof serviceConfig.depends_on === 'object') {
				for (const dep of Object.keys(serviceConfig.depends_on)) {
					if (!composeData.services[dep]) {
						errors.push(`Service '${serviceName}' depends on '${dep}' which doesn't exist`);
					}
				}
			}
		}

		// Validate networks
		if (serviceConfig.networks) {
			if (Array.isArray(serviceConfig.networks)) {
				for (const network of serviceConfig.networks) {
					if (
						typeof network === 'string' &&
						composeData.networks &&
						!composeData.networks[network]
					) {
						warnings.push(
							`Service '${serviceName}' references network '${network}' which is not defined`
						);
					}
				}
			} else if (typeof serviceConfig.networks === 'object') {
				for (const network of Object.keys(serviceConfig.networks)) {
					if (composeData.networks && !composeData.networks[network]) {
						warnings.push(
							`Service '${serviceName}' references network '${network}' which is not defined`
						);
					}
				}
			}
		}

		// Validate volumes
		if (serviceConfig.volumes) {
			for (const volume of serviceConfig.volumes) {
				if (typeof volume === 'object' && volume.source && volume.type === 'volume') {
					if (composeData.volumes && !composeData.volumes[volume.source]) {
						warnings.push(
							`Service '${serviceName}' references volume '${volume.source}' which is not defined`
						);
					}
				}
			}
		}

		// Validate ports format
		if (serviceConfig.ports) {
			for (const port of serviceConfig.ports) {
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
			// NULL CHECK - networks can be null in the spec
			if (!networkConfig) {
				continue; // Skip null/undefined network configs
			}

			if (
				networkConfig.external &&
				typeof networkConfig.external === 'object' &&
				!networkConfig.external.name
			) {
				warnings.push(`External network '${networkName}' should have a name specified`);
			}

			if (
				networkConfig.driver &&
				!['bridge', 'host', 'overlay', 'macvlan', 'none'].includes(networkConfig.driver)
			) {
				warnings.push(`Network '${networkName}' uses uncommon driver '${networkConfig.driver}'`);
			}
		}
	}

	// Validate volumes section
	if (composeData.volumes) {
		for (const [volumeName, volumeConfig] of Object.entries(composeData.volumes)) {
			// NULL CHECK - volumes can be null in the spec
			if (!volumeConfig) {
				continue; // Skip null/undefined volume configs
			}

			if (
				volumeConfig.external &&
				typeof volumeConfig.external === 'object' &&
				!volumeConfig.external.name
			) {
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
export function normalizeHealthcheckTest(
	composeContent: string,
	envGetter?: (key: string) => string | undefined
): string {
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
						if (
							service.healthcheck.test.length > 0 &&
							!['CMD', 'CMD-SHELL', 'NONE'].includes(service.healthcheck.test[0])
						) {
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
				if (
					service.healthcheck.start_period &&
					typeof service.healthcheck.start_period === 'number'
				) {
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
export function parseYamlContent(
	content: string,
	envGetter?: (key: string) => string | undefined
): ComposeSpecification | null {
	try {
		const parsedYaml = yamlLoad(content);

		if (!parsedYaml || typeof parsedYaml !== 'object') {
			console.warn('Parsed YAML content is not an object or is null.');
			return null;
		}

		// Validate structure
		const validation = validateComposeStructure(parsedYaml as ComposeSpecification);
		if (!validation.valid) {
			console.error('Compose validation errors:', validation.errors);
		}
		if (validation.warnings.length > 0) {
			console.warn('Compose validation warnings:', validation.warnings);
		}

		let result = parsedYaml as ComposeSpecification;

		// Apply environment variable substitution
		if (envGetter) {
			result = substituteVariablesInObject(result, envGetter) as ComposeSpecification;
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
export function substituteVariablesInObject(
	obj: any,
	envGetter: (key: string) => string | undefined
): any {
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
function processShortVolumeString(
	volumeString: string,
	composeData: any,
	stackId: string
): string | null {
	const parts = volumeString.split(':');

	if (parts.length < 2) {
		console.warn(`Invalid volume syntax: ${volumeString}. Expected at least "source:target"`);
		return null;
	}

	let source = parts[0];
	const target = parts[1];
	const options = parts.slice(2);

	// Convert relative paths to absolute paths
	if (source.startsWith('./') || source.startsWith('../')) {
		source = path.resolve(process.cwd(), source);
	}

	// Check if this is a bind mount and validate source exists
	if (source.startsWith('/') || source.includes('/')) {
		// This is a bind mount - check if source exists
		if (!existsSync(source)) {
			console.warn(`Bind mount source does not exist: ${source}`);
			console.warn(`Skipping volume mount: ${volumeString}`);
			console.warn(`Make sure to create the file/directory before deploying the stack`);
			return null;
		}

		// Bind mount
		return formatBindMount(source, target, options);
	} else {
		// Named volume logic...
		const isNamedVolume = composeData.volumes && composeData.volumes[source];

		if (isNamedVolume || !source.includes('/')) {
			const volumeName = `${stackId}_${source}`;
			return formatVolumeMount(volumeName, target, options);
		} else {
			return formatBindMount(source, target, options);
		}
	}
}

/**
 * Process long volume syntax objects
 * Supports all Docker Compose volume options
 */
function processLongVolumeObject(
	volume: any,
	composeData: any,
	stackId: string
): { bind?: string; tmpfs?: string } {
	const { type, source, target, read_only, consistency, bind, volume: volumeOpts, tmpfs } = volume;

	if (!target) {
		console.warn(`Volume missing required 'target' field:`, volume);
		return {};
	}

	switch (type) {
		case 'bind':
			return { bind: processBindMount(source, target, { read_only, consistency, bind }) };

		case 'volume':
			return {
				bind: processVolumeMount(source, target, stackId, composeData, {
					read_only,
					volume: volumeOpts
				})
			};

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
function processVolumeMount(
	source: string,
	target: string,
	stackId: string,
	composeData: any,
	options: any = {}
): string {
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
export function createVolumeDefinitions(
	composeData: any,
	stackId: string
): Array<{ name: string; config: any }> {
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
				errors.push(
					`Volume ${i}: Invalid short syntax "${volume}". Expected "source:target" format.`
				);
			}
		} else if (typeof volume === 'object' && volume !== null) {
			// Validate long syntax
			if (!volume.target) {
				errors.push(`Volume ${i}: Missing required 'target' field in long syntax.`);
			}

			if (volume.type && !['bind', 'volume', 'tmpfs', 'npipe'].includes(volume.type)) {
				errors.push(
					`Volume ${i}: Invalid type "${volume.type}". Must be one of: bind, volume, tmpfs, npipe.`
				);
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
export async function prepareEnvironmentVariables(
	environment: any,
	stackDir: string
): Promise<string[]> {
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
			const dependencies = Array.isArray(service.depends_on)
				? service.depends_on
				: Object.keys(service.depends_on);

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
export function validateComposeContent(content: string): {
	valid: boolean;
	errors: string[];
	warnings: string[];
} {
	try {
		const parsed = yamlLoad(content);
		return validateComposeStructure(parsed as ComposeSpecification);
	} catch (parseError) {
		return {
			valid: false,
			errors: [
				`YAML parsing error: ${parseError instanceof Error ? parseError.message : String(parseError)}`
			],
			warnings: []
		};
	}
}

/**
 * Parse and validate depends_on configuration
 * Supports both short and long syntax as per Docker Compose spec
 */
export function parseDependsOn(
	dependsOn: any
): Array<{ service: string; condition: string; restart?: boolean }> {
	if (!dependsOn) {
		return [];
	}

	const dependencies: Array<{ service: string; condition: string; restart?: boolean }> = [];

	if (Array.isArray(dependsOn)) {
		// Short syntax: depends_on: [service1, service2]
		for (const serviceName of dependsOn) {
			if (typeof serviceName === 'string') {
				dependencies.push({
					service: serviceName,
					condition: 'service_started',
					restart: false
				});
			}
		}
	} else if (typeof dependsOn === 'object' && dependsOn !== null) {
		// Long syntax: depends_on: { service1: { condition: "service_healthy" } }
		for (const [serviceName, config] of Object.entries(dependsOn)) {
			const depConfig = config as any;

			dependencies.push({
				service: serviceName,
				condition: depConfig?.condition || 'service_started',
				restart: depConfig?.restart || false
			});
		}
	}

	return dependencies;
}

/**
 * Validate dependency conditions according to Docker Compose spec
 */
export function validateDependencyConditions(
	dependencies: Array<{ service: string; condition: string }>
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	const validConditions = ['service_started', 'service_healthy', 'service_completed_successfully'];

	for (const dep of dependencies) {
		if (!dep.service || typeof dep.service !== 'string') {
			errors.push(`Invalid service name in dependency: ${dep.service}`);
		}

		if (!validConditions.includes(dep.condition)) {
			errors.push(
				`Invalid dependency condition '${dep.condition}' for service '${dep.service}'. Valid conditions: ${validConditions.join(', ')}`
			);
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Check if a service has a healthcheck defined
 */
export function hasHealthcheck(serviceConfig: any): boolean {
	return !!(
		serviceConfig?.healthcheck &&
		serviceConfig.healthcheck !== false &&
		serviceConfig.healthcheck.disable !== true
	);
}

/**
 * Get service dependency chain for debugging
 */
export function getDependencyChain(
	services: Record<string, any>,
	startService: string,
	visited = new Set<string>()
): string[] {
	if (visited.has(startService)) {
		return []; // Circular dependency detected
	}

	visited.add(startService);
	const chain = [startService];

	const serviceConfig = services[startService];
	if (serviceConfig?.depends_on) {
		const dependencies = parseDependsOn(serviceConfig.depends_on);

		for (const dep of dependencies) {
			if (services[dep.service]) {
				const subChain = getDependencyChain(services, dep.service, new Set(visited));
				chain.unshift(...subChain);
			}
		}
	}

	return [...new Set(chain)]; // Remove duplicates while preserving order
}

/**
 * Detect circular dependencies in compose services
 */
export function detectCircularDependencies(services: Record<string, any>): {
	hasCircular: boolean;
	cycles: string[][];
} {
	const visited = new Set<string>();
	const recursionStack = new Set<string>();
	const cycles: string[][] = [];

	function dfs(serviceName: string, path: string[]): boolean {
		if (recursionStack.has(serviceName)) {
			// Found a cycle
			const cycleStart = path.indexOf(serviceName);
			if (cycleStart !== -1) {
				cycles.push([...path.slice(cycleStart), serviceName]);
			}
			return true;
		}

		if (visited.has(serviceName)) {
			return false;
		}

		visited.add(serviceName);
		recursionStack.add(serviceName);
		path.push(serviceName);

		const serviceConfig = services[serviceName];
		if (serviceConfig?.depends_on) {
			const dependencies = parseDependsOn(serviceConfig.depends_on);

			for (const dep of dependencies) {
				if (services[dep.service] && dfs(dep.service, [...path])) {
					// Continue checking other dependencies to find all cycles
				}
			}
		}

		recursionStack.delete(serviceName);
		path.pop();
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

/**
 * Enhanced dependency order resolution with condition awareness
 */
export function resolveDependencyOrderWithConditions(services: Record<string, any>): {
	order: string[];
	batches: string[][];
	warnings: string[];
} {
	const warnings: string[] = [];

	// First check for circular dependencies
	const circularCheck = detectCircularDependencies(services);
	if (circularCheck.hasCircular) {
		warnings.push(
			`Circular dependencies detected: ${circularCheck.cycles.map((cycle) => cycle.join(' -> ')).join(', ')}`
		);
	}

	// Build dependency graph
	const graph: Record<string, Set<string>> = {};
	const inDegree: Record<string, number> = {};
	const healthyServices = new Set<string>();
	const completionServices = new Set<string>();

	// Initialize graph
	for (const serviceName of Object.keys(services)) {
		graph[serviceName] = new Set();
		inDegree[serviceName] = 0;

		// Track services that need health checks or completion
		const serviceConfig = services[serviceName];
		if (hasHealthcheck(serviceConfig)) {
			healthyServices.add(serviceName);
		}
	}

	// Build edges and track dependency types
	for (const [serviceName, serviceConfig] of Object.entries(services)) {
		if (serviceConfig?.depends_on) {
			const dependencies = parseDependsOn(serviceConfig.depends_on);

			for (const dep of dependencies) {
				if (services[dep.service]) {
					graph[dep.service].add(serviceName);
					inDegree[serviceName]++;

					// Track completion dependencies
					if (dep.condition === 'service_completed_successfully') {
						completionServices.add(dep.service);
					}
				} else {
					warnings.push(`Service '${serviceName}' depends on undefined service '${dep.service}'`);
				}
			}
		}
	}

	// Topological sort with batching
	const result: string[] = [];
	const batches: string[][] = [];
	const queue: string[] = [];
	const tempInDegree = { ...inDegree };

	// Find initial services with no dependencies
	for (const [serviceName, degree] of Object.entries(tempInDegree)) {
		if (degree === 0) {
			queue.push(serviceName);
		}
	}

	while (queue.length > 0) {
		const batch: string[] = [...queue];
		batches.push(batch);
		queue.length = 0;

		for (const serviceName of batch) {
			result.push(serviceName);

			// Process neighbors
			for (const neighbor of graph[serviceName]) {
				tempInDegree[neighbor]--;
				if (tempInDegree[neighbor] === 0) {
					queue.push(neighbor);
				}
			}
		}
	}

	// Check if all services were processed (detect remaining cycles)
	if (result.length !== Object.keys(services).length) {
		const remaining = Object.keys(services).filter((name) => !result.includes(name));
		warnings.push(
			`Could not resolve dependencies for services: ${remaining.join(', ')} (possible circular dependencies)`
		);
		// Add remaining services to the end
		result.push(...remaining);
	}

	return {
		order: result,
		batches,
		warnings
	};
}

/**
 * Create dependency wait configuration for a service
 */
export function createDependencyWaitConfig(
	serviceName: string,
	serviceConfig: any
): {
	dependencies: Array<{ service: string; condition: string; timeout: number; restart?: boolean }>;
	warnings: string[];
} {
	const warnings: string[] = [];
	const dependencies: Array<{
		service: string;
		condition: string;
		timeout: number;
		restart?: boolean;
	}> = [];

	if (!serviceConfig?.depends_on) {
		return { dependencies, warnings };
	}

	const parsedDeps = parseDependsOn(serviceConfig.depends_on);
	const validation = validateDependencyConditions(parsedDeps);

	if (!validation.valid) {
		warnings.push(...validation.errors);
	}

	for (const dep of parsedDeps) {
		let timeout = 30000; // Default 30 seconds

		// Adjust timeout based on condition type
		switch (dep.condition) {
			case 'service_healthy':
				timeout = 60000; // Health checks may take longer
				break;
			case 'service_completed_successfully':
				timeout = 120000; // Completion may take much longer
				break;
			case 'service_started':
			default:
				timeout = 30000; // Standard startup timeout
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

/**
 * Check if a dependency condition can be satisfied
 */
export function canSatisfyDependencyCondition(
	condition: string,
	serviceConfig: any
): { canSatisfy: boolean; reason?: string } {
	switch (condition) {
		case 'service_started':
			return { canSatisfy: true };

		case 'service_healthy':
			if (!hasHealthcheck(serviceConfig)) {
				return {
					canSatisfy: false,
					reason:
						'Service has no healthcheck defined but dependency requires service_healthy condition'
				};
			}
			return { canSatisfy: true };

		case 'service_completed_successfully':
			// Any service can potentially complete successfully
			return { canSatisfy: true };

		default:
			return {
				canSatisfy: false,
				reason: `Unknown dependency condition: ${condition}`
			};
	}
}

/**
 * Validate all dependency configurations in a compose file
 */
export function validateAllDependencies(services: Record<string, any>): {
	valid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Check for circular dependencies
	const circularCheck = detectCircularDependencies(services);
	if (circularCheck.hasCircular) {
		errors.push(
			`Circular dependencies detected: ${circularCheck.cycles.map((cycle) => cycle.join(' -> ')).join(', ')}`
		);
	}

	// Validate each service's dependencies
	for (const [serviceName, serviceConfig] of Object.entries(services)) {
		if (serviceConfig?.depends_on) {
			const { dependencies, warnings: depWarnings } = createDependencyWaitConfig(
				serviceName,
				serviceConfig
			);
			warnings.push(...depWarnings);

			// Check if dependency services exist and can satisfy conditions
			for (const dep of dependencies) {
				if (!services[dep.service]) {
					errors.push(`Service '${serviceName}' depends on undefined service '${dep.service}'`);
					continue;
				}

				const dependencyServiceConfig = services[dep.service];
				const satisfyCheck = canSatisfyDependencyCondition(dep.condition, dependencyServiceConfig);

				if (!satisfyCheck.canSatisfy) {
					warnings.push(
						`Service '${serviceName}' dependency on '${dep.service}' with condition '${dep.condition}': ${satisfyCheck.reason}`
					);
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

/**
 * Parse profiles from command line arguments or environment
 * Handles Docker Compose profile specification: --profile prof1 --profile prof2
 */
export function parseActiveProfiles(args?: string[], env?: Record<string, string>): string[] {
	const profiles = new Set<string>();

	// Parse from command line arguments
	if (args) {
		for (let i = 0; i < args.length; i++) {
			if (args[i] === '--profile' && i + 1 < args.length) {
				profiles.add(args[i + 1]);
				i++; // Skip the profile value
			}
		}
	}

	// Parse from environment variables
	if (env) {
		// COMPOSE_PROFILES environment variable (comma-separated)
		const composeProfiles = env['COMPOSE_PROFILES'];
		if (composeProfiles) {
			composeProfiles.split(',').forEach((profile) => {
				const trimmed = profile.trim();
				if (trimmed) profiles.add(trimmed);
			});
		}
	}

	// Default profile if none specified
	const profilesArray = Array.from(profiles);
	return profilesArray.length > 0 ? profilesArray : ['default'];
}

/**
 * Validate profile configuration in compose data
 */
export function validateProfiles(composeData: ComposeSpecification): {
	valid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!composeData || typeof composeData !== 'object') {
		return { valid: true, errors, warnings };
	}

	// Check if profiles are defined at top level
	const topLevelProfiles = composeData.profiles;
	if (
		topLevelProfiles &&
		!Array.isArray(topLevelProfiles) &&
		typeof topLevelProfiles !== 'object'
	) {
		errors.push('Top-level profiles must be an array or object');
	}

	// Validate service profiles
	if (composeData.services) {
		for (const [serviceName, serviceConfig] of Object.entries(composeData.services)) {
			if (serviceConfig && typeof serviceConfig === 'object') {
				if (serviceConfig.profiles) {
					// Profiles can be string, array of strings, or not present
					if (typeof serviceConfig.profiles === 'string') {
						// Single profile as string is valid
						continue;
					} else if (Array.isArray(serviceConfig.profiles)) {
						// Array of profiles
						for (const profile of serviceConfig.profiles) {
							if (typeof profile !== 'string') {
								errors.push(
									`Service '${serviceName}' has invalid profile type. Profiles must be strings.`
								);
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

/**
 * Get all profiles defined in the compose file
 */
export function getAllDefinedProfiles(composeData: ComposeSpecification): string[] {
	const allProfiles = new Set<string>();

	if (!composeData || typeof composeData !== 'object') {
		return [];
	}

	// Add top-level defined profiles
	if (composeData.profiles) {
		if (Array.isArray(composeData.profiles)) {
			composeData.profiles.forEach((profile) => {
				if (typeof profile === 'string') {
					allProfiles.add(profile);
				}
			});
		} else if (typeof composeData.profiles === 'object') {
			Object.keys(composeData.profiles).forEach((profile) => {
				allProfiles.add(profile);
			});
		}
	}

	// Extract profiles from services
	if (composeData.services) {
		for (const serviceConfig of Object.values(composeData.services)) {
			if (serviceConfig && typeof serviceConfig === 'object') {
				if (serviceConfig.profiles) {
					if (typeof serviceConfig.profiles === 'string') {
						allProfiles.add(serviceConfig.profiles);
					} else if (Array.isArray(serviceConfig.profiles)) {
						serviceConfig.profiles.forEach((profile: string) => {
							if (typeof profile === 'string') {
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

/**
 * Check if a service should be deployed based on active profiles
 */
export function shouldDeployService(
	serviceConfig: ServiceConfig,
	activeProfiles: string[],
	defaultBehavior: 'include' | 'exclude' = 'include'
): ProfileDeploymentCheck {
	// If no profiles are specified on the service, use default behavior
	if (!serviceConfig.profiles) {
		return {
			shouldDeploy: defaultBehavior === 'include',
			reason:
				defaultBehavior === 'include'
					? 'No profiles specified, included by default'
					: 'No profiles specified, excluded by default'
		};
	}

	// Normalize service profiles to array
	const serviceProfiles = Array.isArray(serviceConfig.profiles)
		? serviceConfig.profiles
		: [serviceConfig.profiles];

	// Check if any of the service's profiles are in the active profiles
	const matchingProfiles = serviceProfiles.filter((profile) => activeProfiles.includes(profile));

	if (matchingProfiles.length > 0) {
		return {
			shouldDeploy: true,
			reason: `Service profiles [${serviceProfiles.join(', ')}] match active profiles [${matchingProfiles.join(', ')}]`
		};
	}

	return {
		shouldDeploy: false,
		reason: `Service profiles [${serviceProfiles.join(', ')}] do not match active profiles [${activeProfiles.join(', ')}]`
	};
}

/**
 * Filter services based on profiles
 */
export function filterServicesByProfiles(
	services: Record<string, ServiceConfig>,
	activeProfiles: string[]
): ProfileServiceFiltering {
	const deployableServices: Record<string, ServiceConfig> = {};
	const skippedServices: Array<{ name: string; reason: string }> = [];

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

/**
 * Resolve profile dependencies and conflicts
 */
export function resolveProfileDependencies(
	composeData: ComposeSpecification,
	requestedProfiles: string[]
): ProfileResolution {
	const warnings: string[] = [];
	const errors: string[] = [];
	const resolvedProfiles = new Set(requestedProfiles);

	// If no profiles requested, use default
	if (requestedProfiles.length === 0) {
		resolvedProfiles.add('default');
	}

	// Check for profile definitions and dependencies
	if (
		composeData.profiles &&
		typeof composeData.profiles === 'object' &&
		!Array.isArray(composeData.profiles)
	) {
		for (const [profileName, profileConfig] of Object.entries(composeData.profiles)) {
			if (resolvedProfiles.has(profileName) && profileConfig && typeof profileConfig === 'object') {
				// Handle profile dependencies
				if (profileConfig.depends_on && Array.isArray(profileConfig.depends_on)) {
					for (const dependency of profileConfig.depends_on) {
						if (typeof dependency === 'string') {
							resolvedProfiles.add(dependency);
							warnings.push(
								`Profile '${profileName}' requires profile '${dependency}' - added automatically`
							);
						}
					}
				}

				// Handle profile conflicts
				if (profileConfig.conflicts && Array.isArray(profileConfig.conflicts)) {
					for (const conflict of profileConfig.conflicts) {
						if (typeof conflict === 'string' && resolvedProfiles.has(conflict)) {
							errors.push(`Profile '${profileName}' conflicts with profile '${conflict}'`);
						}
					}
				}
			}
		}
	}

	// Validate that all resolved profiles exist
	const definedProfiles = getAllDefinedProfiles(composeData);
	for (const profile of resolvedProfiles) {
		if (profile !== 'default' && !definedProfiles.includes(profile)) {
			warnings.push(`Profile '${profile}' is not defined in the compose file`);
		}
	}

	return {
		resolvedProfiles: Array.from(resolvedProfiles).sort(),
		warnings,
		errors
	};
}

/**
 * Create deployment plan based on profiles
 */
export function createProfileDeploymentPlan(
	composeData: ComposeSpecification,
	activeProfiles: string[]
): ProfileDeploymentPlan {
	const warnings: string[] = [];
	const errors: string[] = [];

	// Validate profiles
	const profileValidation = validateProfiles(composeData);
	warnings.push(...profileValidation.warnings);
	errors.push(...profileValidation.errors);

	// Resolve profile dependencies
	const resolution = resolveProfileDependencies(composeData, activeProfiles);
	warnings.push(...resolution.warnings);
	errors.push(...resolution.errors);

	const finalActiveProfiles = resolution.resolvedProfiles;

	// Filter services by profiles
	const serviceFiltering = filterServicesByProfiles(
		composeData.services || {},
		finalActiveProfiles
	);

	// Determine volumes and networks needed for deployable services
	const volumesToCreate = new Set<string>();
	const networksToCreate = new Set<string>();

	// Add volumes used by deployable services
	for (const serviceName of Object.keys(serviceFiltering.deployableServices)) {
		const serviceConfig = serviceFiltering.deployableServices[serviceName];

		// Collect volume references
		if (serviceConfig.volumes) {
			const volumes = Array.isArray(serviceConfig.volumes) ? serviceConfig.volumes : [];
			for (const volume of volumes) {
				if (typeof volume === 'string') {
					// Short syntax: extract volume name
					const parts = volume.split(':');
					const source = parts[0];
					if (!source.startsWith('/') && !source.startsWith('./') && !source.startsWith('../')) {
						// It's a named volume
						volumesToCreate.add(source);
					}
				} else if (typeof volume === 'object' && volume.source && volume.type === 'volume') {
					// Long syntax: volume mount
					volumesToCreate.add(volume.source);
				}
			}
		}

		// Collect network references
		if (serviceConfig.networks) {
			if (Array.isArray(serviceConfig.networks)) {
				serviceConfig.networks.forEach((network: string) => networksToCreate.add(network));
			} else if (typeof serviceConfig.networks === 'object') {
				Object.keys(serviceConfig.networks).forEach((network) => networksToCreate.add(network));
			}
		}
	}

	// Only include volumes that are actually defined in the compose file
	const definedVolumes = composeData.volumes ? Object.keys(composeData.volumes) : [];
	const filteredVolumes = Array.from(volumesToCreate).filter((vol) => definedVolumes.includes(vol));

	// Only include networks that are actually defined in the compose file
	const definedNetworks = composeData.networks ? Object.keys(composeData.networks) : [];
	const filteredNetworks = Array.from(networksToCreate).filter((net) =>
		definedNetworks.includes(net)
	);

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

/**
 * Apply profile filtering to compose data
 * Returns a new compose data object with only the services that should be deployed
 */
export function applyProfileFiltering(
	composeData: ComposeSpecification,
	activeProfiles: string[]
): {
	filteredComposeData: ComposeSpecification;
	deploymentPlan: ProfileDeploymentPlan;
} {
	const deploymentPlan = createProfileDeploymentPlan(composeData, activeProfiles);

	// Create filtered compose data
	const filteredComposeData: ComposeSpecification = {
		...composeData,
		services: {},
		volumes: {},
		networks: {}
	};

	// Add deployable services
	for (const serviceName of deploymentPlan.plan.servicesToDeploy) {
		if (composeData.services && composeData.services[serviceName]) {
			filteredComposeData.services![serviceName] = composeData.services[serviceName];
		}
	}

	// Add required volumes
	for (const volumeName of deploymentPlan.plan.volumesToCreate) {
		if (composeData.volumes && composeData.volumes[volumeName]) {
			filteredComposeData.volumes![volumeName] = composeData.volumes[volumeName];
		}
	}

	// Add required networks
	for (const networkName of deploymentPlan.plan.networksToCreate) {
		if (composeData.networks && composeData.networks[networkName]) {
			filteredComposeData.networks![networkName] = composeData.networks[networkName];
		}
	}

	// Always ensure default network exists if no networks specified
	if (
		Object.keys(filteredComposeData.networks!).length === 0 &&
		Object.keys(filteredComposeData.services!).length > 0
	) {
		filteredComposeData.networks!.default = {
			driver: 'bridge'
		};
	}

	return {
		filteredComposeData,
		deploymentPlan
	};
}

/**
 * Get profile usage statistics from a compose file
 */
export function getProfileUsageStats(composeData: ComposeSpecification): ProfileUsageStats {
	const allProfiles = getAllDefinedProfiles(composeData);
	const profileServiceMap = new Map<string, string[]>();
	const servicesWithoutProfiles: string[] = [];
	const servicesWithProfiles: ServiceProfile[] = [];

	// Initialize profile map
	allProfiles.forEach((profile) => {
		profileServiceMap.set(profile, []);
	});

	// Process services
	if (composeData.services) {
		for (const [serviceName, serviceConfig] of Object.entries(composeData.services)) {
			if (serviceConfig && typeof serviceConfig === 'object') {
				if (serviceConfig.profiles) {
					const serviceProfiles = Array.isArray(serviceConfig.profiles)
						? serviceConfig.profiles
						: [serviceConfig.profiles];

					servicesWithProfiles.push({
						service: serviceName,
						profiles: serviceProfiles
					});

					// Add service to each of its profiles
					serviceProfiles.forEach((profile) => {
						if (!profileServiceMap.has(profile)) {
							profileServiceMap.set(profile, []);
						}
						profileServiceMap.get(profile)!.push(serviceName);
					});
				} else {
					servicesWithoutProfiles.push(serviceName);
				}
			}
		}
	}

	const profilesWithServices = Array.from(profileServiceMap.entries()).map(
		([profile, services]) => ({
			profile,
			serviceCount: services.length,
			services: services.sort()
		})
	);

	return {
		totalProfiles: allProfiles.length,
		profilesWithServices,
		servicesWithoutProfiles: servicesWithoutProfiles.sort(),
		servicesWithProfiles
	};
}

/**
 * Generate profile documentation/help text
 */
export function generateProfileHelp(composeData: ComposeSpecification): string {
	const stats = getProfileUsageStats(composeData);
	const allProfiles = getAllDefinedProfiles(composeData);

	let help = 'Docker Compose Profiles Available:\n\n';

	if (allProfiles.length === 0) {
		help += 'No profiles are defined in this compose file.\n';
		help += 'All services will be deployed by default.\n';
		return help;
	}

	help += `Total profiles defined: ${stats.totalProfiles}\n\n`;

	// List profiles with their services
	for (const profileInfo of stats.profilesWithServices) {
		help += `Profile: ${profileInfo.profile}\n`;
		help += `  Services (${profileInfo.serviceCount}): ${profileInfo.services.join(', ')}\n\n`;
	}

	// Show services without profiles
	if (stats.servicesWithoutProfiles.length > 0) {
		help += `Services without profiles (always deployed): ${stats.servicesWithoutProfiles.join(', ')}\n\n`;
	}

	help += 'Usage:\n';
	help += '  Deploy specific profile: --profile <profile-name>\n';
	help += '  Deploy multiple profiles: --profile prof1 --profile prof2\n';
	help += '  Environment variable: COMPOSE_PROFILES=prof1,prof2\n';

	return help;
}
