import type { User } from '$lib/types/user.type';

// Get base path from build config
const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

const PROTECTED_PREFIXES = [
	'dashboard',
	'compose',
	'containers',
	'customize',
	'events',
	'environments',
	'images',
	'volumes',
	'networks',
	'settings'
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PROTECTED_RE = new RegExp(`^/(?:${PROTECTED_PREFIXES.map(escapeRe).join('|')})(?:/.*)?$`);

const isProtectedPath = (path: string) => {
	const result = PROTECTED_RE.test(path);
	return result;
};

// Strip base path from a path for comparison
const stripBasePath = (path: string) => {
	if (basePath && path.startsWith(basePath)) {
		return path.slice(basePath.length) || '/';
	}
	return path;
};

// Add base path to a path
const addBasePath = (path: string) => `${basePath}${path}`;

export function getAuthRedirectPath(path: string, user: User | null) {
	const isSignedIn = !!user;

	// Strip base path for comparison
	const cleanPath = stripBasePath(path);

	const isUnauthenticatedOnlyPath =
		cleanPath === '/auth/login' ||
		cleanPath.startsWith('/auth/login/') ||
		cleanPath === '/auth/oidc/login' ||
		cleanPath.startsWith('/auth/oidc/login') ||
		cleanPath === '/auth/oidc/callback' ||
		cleanPath.startsWith('/auth/oidc/callback') ||
		cleanPath === '/img' ||
		cleanPath.startsWith('/img') ||
		cleanPath === '/favicon.ico';

	if (!isSignedIn && isProtectedPath(cleanPath)) {
		return addBasePath('/auth/login');
	}

	if (isUnauthenticatedOnlyPath && isSignedIn) {
		return addBasePath('/dashboard');
	}

	if (cleanPath === '/') {
		return isSignedIn ? addBasePath('/dashboard') : addBasePath('/auth/login');
	}

	return null;
}
