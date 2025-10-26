/**
 * Path utilities for handling base path in routing
 */

// Get base path from build config
const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

/**
 * Add base path to a route
 * @param path - The route path (e.g., "/dashboard")
 * @returns The full path with base (e.g., "/arcane/dashboard" or "/dashboard")
 */
export function withBase(path: string): string {
	if (!path.startsWith('/')) {
		console.warn(`Path should start with /: ${path}`);
	}
	return `${basePath}${path}`;
}

/**
 * Get the configured base path
 * @returns The base path (e.g., "/arcane" or "")
 */
export function getBasePath(): string {
	return basePath;
}
