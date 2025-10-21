import type { User } from '$lib/types/user.type';

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

export function getAuthRedirectPath(path: string, user: User | null) {
	const isSignedIn = !!user;

	const isUnauthenticatedOnlyPath =
		path === '/auth/login' ||
		path.startsWith('/auth/login/') ||
		path === '/auth/oidc/login' ||
		path.startsWith('/auth/oidc/login') ||
		path === '/auth/oidc/callback' ||
		path.startsWith('/auth/oidc/callback') ||
		path === '/img' ||
		path.startsWith('/img') ||
		path === '/favicon.ico';

	if (!isSignedIn && isProtectedPath(path)) {
		return '/auth/login';
	}

	if (isUnauthenticatedOnlyPath && isSignedIn) {
		return '/dashboard';
	}

	if (path === '/') {
		return isSignedIn ? '/dashboard' : '/auth/login';
	}

	return null;
}
