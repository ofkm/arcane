export function parseComposeServices(compose: string): string[] {
	try {
		if (!compose) return [];

		// Find the services: block
		const lines = compose.split('\n');
		const servicesIndex = lines.findIndex((line) => line.trim() === 'services:');
		if (servicesIndex === -1) return [];

		const serviceNames: string[] = [];
		let servicesIndent: number | null = null;

		// Parse service names - they are the first indented level after "services:"
		for (let i = servicesIndex + 1; i < lines.length; i++) {
			const line = lines[i];
			if (!line.trim()) continue; // Skip empty lines

			// Calculate indentation
			const indent = line.length - line.trimStart().length;

			// If this is a root-level key (like volumes:, networks:), stop
			if (indent === 0) break;

			// First indented line sets the service indent level
			if (servicesIndent === null) {
				servicesIndent = indent;
			}

			// Service names are at the service indent level and end with ':'
			if (indent === servicesIndent && line.trim().endsWith(':')) {
				const serviceName = line.trim().replace(':', '');
				// Only alphanumeric, underscore, dash (valid service names)
				if (/^[a-zA-Z0-9_-]+$/.test(serviceName)) {
					serviceNames.push(serviceName);
				}
			}
		}

		return serviceNames;
	} catch (error) {
		console.error('Error parsing services:', error);
		return [];
	}
}

export function parseEnvVariables(env: string): Array<{ key: string; value: string }> {
	if (!env) return [];

	return env
		.split('\n')
		.filter((line) => line.trim() && !line.trim().startsWith('#'))
		.map((line) => {
			const [key, ...valueParts] = line.split('=');
			return {
				key: key?.trim() || '',
				value: valueParts.join('=').trim() || ''
			};
		})
		.filter((v) => v.key);
}

export function getServicesPreview(services: string[], maxDisplay: number = 2): string {
	if (services.length === 0) return '';
	if (services.length <= maxDisplay) return services.join(', ');
	return `${services.slice(0, maxDisplay).join(', ')}, +${services.length - maxDisplay}`;
}
