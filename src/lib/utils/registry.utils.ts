import { parseAll } from '@swimlane/docker-reference';

export function parseImageNameForRegistry(imageName: string): { registry: string } {
	try {
		const parsed = parseAll(imageName);
		return { registry: parsed.domain ?? 'docker.io' };
	} catch (error) {
		// Fallback to Docker Hub if parsing fails
		console.error(`Failed to parse image name: ${imageName}`, error);
		return { registry: 'docker.io' };
	}
}

export function areRegistriesEquivalent(url1: string, url2: string): boolean {
	const normalize = (url: string) => {
		let normalized = url.toLowerCase();
		if (normalized.startsWith('http://')) normalized = normalized.substring(7);
		if (normalized.startsWith('https://')) normalized = normalized.substring(8);
		if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
		// Common Docker Hub aliases
		if (normalized === 'index.docker.io' || normalized === 'registry-1.docker.io' || normalized === 'auth.docker.io') {
			return 'docker.io';
		}
		return normalized;
	};
	return normalize(url1) === normalize(url2);
}
