// Helper function to parse image name and extract its registry hostname
export function parseImageNameForRegistry(imageName: string): { registry: string } {
	let namePart = imageName;

	// Strip tag (e.g., :latest) or digest (e.g., @sha256:...) if present
	const atIndex = namePart.lastIndexOf('@');
	if (atIndex !== -1) {
		namePart = namePart.substring(0, atIndex);
	} else {
		const colonIndex = namePart.lastIndexOf(':');
		// Ensure colon is for a tag, not part of a hostname with port
		if (colonIndex !== -1 && !namePart.substring(colonIndex + 1).includes('/')) {
			namePart = namePart.substring(0, colonIndex);
		}
	}

	const parts = namePart.split('/');
	// If the first part contains a '.', ':', or is 'localhost', it's likely a registry hostname
	if (parts.length > 1 && (parts[0].includes('.') || parts[0].includes(':') || parts[0].toLowerCase() === 'localhost')) {
		return { registry: parts[0] };
	}
	// Default to Docker Hub for images like "ubuntu" or "username/repository"
	return { registry: 'docker.io' };
}

// Helper function to compare registry hostnames, normalizing common variations
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
