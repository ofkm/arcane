import type { User } from '$lib/types/user.type';
import type { Settings } from '$lib/types/settings.type';

// Returns the path to redirect to based on the current path and user authentication status
// If no redirect is needed, it returns null
export function getAuthRedirectPath(path: string, user: User | null, settings: Settings | null) {
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

	const isPublicPath = ['/authorize', '/device', '/health', '/healthz'].includes(path);
	const isOnboardingPath = path === '/onboarding' || path.startsWith('/onboarding');

	if (!isSignedIn && !isUnauthenticatedOnlyPath && !isPublicPath) {
		return '/auth/login';
	}

	if (isSignedIn && settings && !settings.onboardingCompleted) {
		if (!isOnboardingPath) {
			return '/onboarding/welcome';
		}
	}

	if (isUnauthenticatedOnlyPath && isSignedIn && settings?.onboardingCompleted) {
		return '/dashboard';
	}

	return null;
}
