import { load as yamlLoad } from 'js-yaml';
import type { ComposeSpecification } from '$lib/types/compose.spec.type';

/**
 * Type-safe compose file parser with comprehensive validation
 */
export function parseComposeFile(content: string): {
	data: ComposeSpecification | null;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	try {
		const parsed = yamlLoad(content) as ComposeSpecification;

		// Validate against the spec
		if (!parsed || typeof parsed !== 'object') {
			errors.push('Invalid YAML: must be an object');
			return { data: null, errors, warnings };
		}

		// Check required fields per spec
		if (!parsed.services) {
			errors.push('Missing required "services" section');
			return { data: null, errors, warnings };
		}

		// Validate service configurations
		for (const [serviceName, service] of Object.entries(parsed.services)) {
			if (!service.image && !service.build) {
				errors.push(`Service "${serviceName}" must have either "image" or "build"`);
			}

			// Type-safe validation of service properties
			if (service.depends_on) {
				if (Array.isArray(service.depends_on)) {
					for (const dep of service.depends_on) {
						if (!parsed.services[dep]) {
							errors.push(`Service "${serviceName}" depends on non-existent service "${dep}"`);
						}
					}
				} else if (typeof service.depends_on === 'object') {
					for (const [dep, config] of Object.entries(service.depends_on)) {
						if (!parsed.services[dep]) {
							errors.push(`Service "${serviceName}" depends on non-existent service "${dep}"`);
						}
						// Validate condition values per spec
						if (
							config.condition &&
							!['service_started', 'service_healthy', 'service_completed_successfully'].includes(
								config.condition
							)
						) {
							errors.push(
								`Service "${serviceName}" has invalid dependency condition "${config.condition}"`
							);
						}
					}
				}
			}
		}

		// Validate networks
		if (parsed.networks) {
			for (const [networkName, network] of Object.entries(parsed.networks)) {
				if (
					network &&
					network.driver &&
					!['bridge', 'host', 'overlay', 'macvlan', 'none', 'null'].includes(network.driver)
				) {
					warnings.push(`Network "${networkName}" uses uncommon driver "${network.driver}"`);
				}
			}
		}

		return {
			data: parsed as ComposeSpecification,
			errors,
			warnings
		};
	} catch (parseError) {
		errors.push(
			`YAML parsing error: ${parseError instanceof Error ? parseError.message : String(parseError)}`
		);
		return { data: null, errors, warnings };
	}
}
