import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { load as yamlLoad } from 'js-yaml'; // Add this import at the top

/**
 * Validation modes for Docker Compose specification compliance
 */
export type ValidationMode = 'default' | 'strict' | 'loose';

/**
 * Validate unknown fields according to Compose spec
 */
export function validateUnknownFields(data: any, knownFields: string[], context: string, mode: ValidationMode = 'default'): string[] {
	const warnings: string[] = [];

	if (mode === 'loose') return warnings;

	for (const key of Object.keys(data || {})) {
		if (!knownFields.includes(key) && !key.startsWith('x-')) {
			const message = `Unknown field "${key}" in ${context}`;
			if (mode === 'strict') {
				throw new Error(message);
			} else {
				warnings.push(message);
			}
		}
	}

	return warnings;
}

/**
 * Known top-level fields per Compose spec
 */
export const KNOWN_TOP_LEVEL_FIELDS = ['version', 'name', 'services', 'networks', 'volumes', 'configs', 'secrets', 'include'];

/**
 * Known service-level fields per Compose spec
 */
export const KNOWN_SERVICE_FIELDS = [
	'image',
	'build',
	'command',
	'entrypoint',
	'environment',
	'env_file',
	'ports',
	'expose',
	'volumes',
	'networks',
	'depends_on',
	'restart',
	'healthcheck',
	'labels',
	'container_name',
	'hostname',
	'domainname',
	'user',
	'working_dir',
	'privileged',
	'init',
	'tty',
	'stdin_open',
	'profiles',
	'scale',
	'deploy',
	'develop',
	'configs',
	'secrets',
	'platform',
	'pull_policy',
	'runtime',
	'stop_signal',
	'stop_grace_period',
	'sysctls',
	'ulimits',
	'cap_add',
	'cap_drop',
	'security_opt',
	'devices',
	'dns',
	'dns_search',
	'dns_opt',
	'extra_hosts',
	'external_links',
	'isolation',
	'links',
	'logging',
	'network_mode',
	'pid',
	'ipc',
	'uts',
	'read_only',
	'shm_size',
	'tmpfs',
	'volumes_from',
	'mac_address',
	'storage_opt',
	'userns_mode',
	'credential_spec',
	'device_cgroup_rules',
	'group_add',
	'mem_limit',
	'mem_reservation',
	'mem_swappiness',
	'memswap_limit',
	'oom_kill_disable',
	'oom_score_adj',
	'pids_limit',
	'annotations',
	'attach',
	'blkio_config',
	'cpu_count',
	'cpu_percent',
	'cpu_shares',
	'cpu_period',
	'cpu_quota',
	'cpu_rt_runtime',
	'cpu_rt_period',
	'cpus',
	'cpuset',
	'cgroup',
	'cgroup_parent',
	'gpus',
	'post_start',
	'pre_stop',
	'provider',
	'label_file'
];

/**
 * Known network-level fields per Compose spec
 */
export const KNOWN_NETWORK_FIELDS = ['driver', 'driver_opts', 'external', 'name', 'ipam', 'enable_ipv6', 'labels', 'attachable', 'scope', 'internal'];

/**
 * Known volume-level fields per Compose spec
 */
export const KNOWN_VOLUME_FIELDS = ['driver', 'driver_opts', 'external', 'name', 'labels'];

/**
 * Validate container name format and conflicts per Compose spec
 */
export function validateContainerName(serviceName: string, serviceConfig: any, stackId: string): string {
	let containerName = serviceConfig.container_name;

	if (containerName) {
		// Validate container_name format per spec
		const containerNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/;
		if (!containerNameRegex.test(containerName)) {
			throw new Error(`Invalid container_name "${containerName}" for service "${serviceName}". ` + `Must match pattern [a-zA-Z0-9][a-zA-Z0-9_.-]+`);
		}

		// Check for scaling conflicts - service with container_name cannot be scaled
		if (serviceConfig.scale && serviceConfig.scale > 1) {
			throw new Error(`Service "${serviceName}" cannot use both "container_name" and "scale > 1"`);
		}

		return containerName;
	}

	// Use Docker Compose naming convention
	return `${stackId}_${serviceName}_1`;
}

/**
 * Validate external resource configuration per Compose spec
 */
export function validateExternalResource(name: string, config: any, type: 'network' | 'volume'): void {
	if (config.external === true) {
		// External resources should not have other configuration attributes
		const allowedFields = ['name', 'external'];
		const otherFields = Object.keys(config).filter((key) => !allowedFields.includes(key));

		if (otherFields.length > 0) {
			throw new Error(`External ${type} "${name}" cannot have additional attributes: ${otherFields.join(', ')}`);
		}
	}
}

/**
 * Enhanced environment file loading with new format support
 */
export async function loadEnvFiles(envFiles: string | string[] | Array<{ path: string; required?: boolean; format?: string }>, stackDir: string): Promise<Record<string, string>> {
	const envVars: Record<string, string> = {};
	const files = Array.isArray(envFiles) ? envFiles : [envFiles];

	for (const envFile of files) {
		if (typeof envFile === 'string') {
			// Legacy format
			const content = await loadSingleEnvFile(envFile, stackDir);
			Object.assign(envVars, parseEnvContent(content));
		} else {
			// New format with options
			const { path: filePath, required = true, format = 'default' } = envFile;

			try {
				const content = await loadSingleEnvFile(filePath, stackDir);

				if (format === 'raw') {
					// Raw format - no interpolation
					Object.assign(envVars, parseEnvContentRaw(content));
				} else {
					// Default format with interpolation
					Object.assign(envVars, parseEnvContent(content));
				}
			} catch (error) {
				if (required) {
					throw new Error(`Required env file not found: ${filePath}`);
				}
				// Silently ignore missing non-required files
			}
		}
	}

	return envVars;
}

/**
 * Load a single environment file
 */
async function loadSingleEnvFile(filePath: string, stackDir: string): Promise<string> {
	const fullPath = path.isAbsolute(filePath) ? filePath : path.join(stackDir, filePath);
	return await fs.readFile(fullPath, 'utf8');
}

/**
 * Parse environment content without variable interpolation (raw format)
 */
export function parseEnvContentRaw(content: string): Record<string, string> {
	const envVars: Record<string, string> = {};
	const lines = content.split('\n');

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		const equalIndex = trimmed.indexOf('=');
		if (equalIndex === -1) continue;

		const key = trimmed.substring(0, equalIndex);
		const value = trimmed.substring(equalIndex + 1);

		// Raw format - use value as-is without any processing
		envVars[key] = value;
	}

	return envVars;
}

/**
 * Basic environment content parser (for compatibility)
 */
function parseEnvContent(content: string): Record<string, string> {
	const envVars: Record<string, string> = {};
	const lines = content.split('\n');

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		const equalIndex = trimmed.indexOf('=');
		if (equalIndex === -1) continue;

		const key = trimmed.substring(0, equalIndex);
		let value = trimmed.substring(equalIndex + 1);

		// Remove quotes if present
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}

		envVars[key] = value;
	}

	return envVars;
}

/**
 * Validate service attributes for newer Compose spec features
 */
export function validateServiceAttributes(serviceName: string, serviceConfig: any): string[] {
	const warnings: string[] = [];

	// Validate pull_policy
	if (serviceConfig.pull_policy) {
		const validPullPolicies = ['always', 'never', 'missing', 'build'];
		if (!validPullPolicies.includes(serviceConfig.pull_policy)) {
			warnings.push(`Service "${serviceName}" has invalid pull_policy "${serviceConfig.pull_policy}". ` + `Valid values: ${validPullPolicies.join(', ')}`);
		}
	}

	// Validate platform format
	if (serviceConfig.platform) {
		const platformRegex = /^[a-z0-9]+\/[a-z0-9]+$/;
		if (!platformRegex.test(serviceConfig.platform)) {
			warnings.push(`Service "${serviceName}" has invalid platform format "${serviceConfig.platform}". ` + `Expected format: os/arch (e.g., linux/amd64)`);
		}
	}

	// Validate init attribute
	if (serviceConfig.init !== undefined && typeof serviceConfig.init !== 'boolean') {
		warnings.push(`Service "${serviceName}" init attribute must be a boolean, got: ${typeof serviceConfig.init}`);
	}

	return warnings;
}

/**
 * Enhanced validation for compose structure with unknown field checking
 */
export function validateComposeStructureEnhanced(composeData: any, mode: ValidationMode = 'default'): { valid: boolean; errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!composeData || typeof composeData !== 'object') {
		errors.push('Compose file must be a valid YAML object');
		return { valid: false, errors, warnings };
	}

	// Validate unknown fields at top level
	try {
		warnings.push(...validateUnknownFields(composeData, KNOWN_TOP_LEVEL_FIELDS, 'top-level', mode));
	} catch (error) {
		errors.push(error instanceof Error ? error.message : String(error));
		return { valid: false, errors, warnings };
	}

	// Validate services section
	if (composeData.services) {
		for (const [serviceName, serviceConfig] of Object.entries(composeData.services)) {
			// Validate unknown fields in service
			try {
				warnings.push(...validateUnknownFields(serviceConfig, KNOWN_SERVICE_FIELDS, `service "${serviceName}"`, mode));
			} catch (error) {
				errors.push(error instanceof Error ? error.message : String(error));
				continue;
			}

			// Additional service attribute validation
			warnings.push(...validateServiceAttributes(serviceName, serviceConfig));
		}
	}

	// Validate networks section
	if (composeData.networks) {
		for (const [networkName, networkConfig] of Object.entries(composeData.networks)) {
			if (!networkConfig) continue;

			try {
				warnings.push(...validateUnknownFields(networkConfig, KNOWN_NETWORK_FIELDS, `network "${networkName}"`, mode));

				// Validate external networks
				validateExternalResource(networkName, networkConfig, 'network');
			} catch (error) {
				errors.push(error instanceof Error ? error.message : String(error));
			}
		}
	}

	// Validate volumes section
	if (composeData.volumes) {
		for (const [volumeName, volumeConfig] of Object.entries(composeData.volumes)) {
			if (!volumeConfig) continue;

			try {
				warnings.push(...validateUnknownFields(volumeConfig, KNOWN_VOLUME_FIELDS, `volume "${volumeName}"`, mode));

				// Validate external volumes
				validateExternalResource(volumeName, volumeConfig, 'volume');
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

/**
 * Validate compose content with enhanced field checking
 */
function validateComposeContentEnhanced(content: string, mode: ValidationMode = 'default'): { valid: boolean; errors: string[]; warnings: string[] } {
	try {
		// Remove the require and use the imported yamlLoad directly
		const parsed = yamlLoad(content);
		return validateComposeStructureEnhanced(parsed, mode);
	} catch (parseError) {
		return {
			valid: false,
			errors: [`YAML parsing error: ${parseError instanceof Error ? parseError.message : String(parseError)}`],
			warnings: []
		};
	}
}

/**
 * Enhanced container configuration for newer Compose spec features
 */
export function enhanceContainerConfig(containerConfig: any, serviceConfig: any): any {
	const enhanced = { ...containerConfig };

	// Add init support
	if (serviceConfig.init) {
		enhanced.HostConfig.Init = serviceConfig.init;
	}

	// Add platform support
	if (serviceConfig.platform) {
		enhanced.Platform = serviceConfig.platform;
	}

	// Add annotations to labels
	if (serviceConfig.annotations) {
		const annotations = Array.isArray(serviceConfig.annotations)
			? serviceConfig.annotations.reduce((acc: any, annotation: string) => {
					const [key, value = ''] = annotation.split('=');
					acc[key] = value;
					return acc;
				}, {})
			: serviceConfig.annotations;

		Object.assign(enhanced.Labels, annotations);
	}

	// Store pull policy for use during image pulling
	if (serviceConfig.pull_policy) {
		enhanced._pullPolicy = serviceConfig.pull_policy;
	}

	return enhanced;
}

/**
 * Validate all compose configuration with comprehensive checks
 */
export async function validateComposeConfiguration(composeContent: string, envContent: string = '', mode: ValidationMode = 'default'): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
	const errors: string[] = [];
	const warnings: string[] = [];

	try {
		// Parse environment variables
		const envVars = parseEnvContent(envContent);
		const getEnvVar = (key: string): string | undefined => envVars[key] || process.env[key];

		// Validate compose content format with enhanced checking
		const contentValidation = validateComposeContentEnhanced(composeContent, mode);
		if (!contentValidation.valid) {
			return contentValidation;
		}

		warnings.push(...contentValidation.warnings);

		// Parse with variable substitution (import the function)
		const { parseYamlContent } = await import('./compose.utils');
		const composeData = parseYamlContent(composeContent, getEnvVar);

		if (!composeData) {
			errors.push('Failed to parse compose file with variable substitution');
			return { valid: false, errors, warnings };
		}

		// Validate dependencies if services exist
		if (composeData.services) {
			const { validateAllDependencies } = await import('./compose.utils');
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
