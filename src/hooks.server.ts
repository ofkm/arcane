import { redirect, type Handle } from '@sveltejs/kit';
import { initComposeService } from '$lib/services/docker/stack-service';
import { initAutoUpdateScheduler } from '$lib/services/docker/scheduler-service';
import { getSession } from '$lib/services/session-service';
import { getUserByUsername } from '$lib/services/user-service';
import { getSettings } from '$lib/services/settings-service';
import { checkFirstRun } from '$lib/utils/onboarding.utils';

// Get environment variable
const isTestEnvironment = process.env.APP_ENV === 'TEST';

// Initialize needed services
try {
	await Promise.all([checkFirstRun(), initComposeService(), initAutoUpdateScheduler()]);
} catch (err) {
	console.error('Critical service init failed, exiting:', err);
	process.exit(1);
}

// Protected paths that require specific permissions
const protectedPathPermissions: Record<string, string[]> = {
	'/containers': ['containers:view'],
	'/containers/create': ['containers:manage'],
	'/settings': ['settings:view']
	// Add other path patterns as needed
};

export const handle: Handle = async ({ event, resolve }) => {
	const { cookies, url } = event;
	const path = url.pathname;

	// Define paths that don't require authentication
	const publicPaths = ['/auth/login', '/img'];
	const isPublicPath = publicPaths.some((p) => path.startsWith(p));

	// Always allow access to public paths
	if (isPublicPath) {
		return await resolve(event);
	}

	// For all other paths, we need authentication
	const sessionId = cookies.get('session_id');
	if (!sessionId) {
		throw redirect(302, `/auth/login?redirect=${encodeURIComponent(path)}`);
	}

	// Cache the session in event.locals
	if (!event.locals.session) {
		event.locals.session = await getSession(sessionId);
	}

	const session = event.locals.session;

	if (!session) {
		// Invalid or expired session
		cookies.delete('session_id', { path: '/' });
		throw redirect(302, `/auth/login?redirect=${encodeURIComponent(path)}`);
	}

	// Cache the user in event.locals
	if (!event.locals.user) {
		event.locals.user = await getUserByUsername(session.username);
	}

	const user = event.locals.user;

	if (!user) {
		cookies.delete('session_id', { path: '/' });
		throw redirect(302, `/auth/login?error=invalid-session`);
	}

	// Get settings
	const settings = await getSettings();

	// Helper functions to determine path types
	const isOnboardingPath = path.startsWith('/onboarding');
	const isApiRoute = path.startsWith('/api/');

	// Skip onboarding checks in test environment
	if (!isTestEnvironment) {
		// Critical check: For ANY non-onboarding path, redirect to onboarding if not completed
		if (!isOnboardingPath && !isApiRoute && !settings?.onboarding?.completed) {
			throw redirect(302, '/onboarding/welcome');
		}

		// During onboarding, only allow API calls needed for onboarding
		if (isApiRoute && !settings?.onboarding?.completed) {
			// Only allow these specific API endpoints during onboarding
			const allowedApiDuringOnboarding = ['/api/settings', '/api/users/password'];
			const isAllowedApi = allowedApiDuringOnboarding.some((api) => path.startsWith(api));

			if (!isAllowedApi) {
				throw redirect(302, '/onboarding/welcome');
			}
		}
	}

	// Continue with permission checks as before
	if (settings?.auth?.rbacEnabled) {
		// Check each protected path pattern
		for (const [pathPattern, requiredPermissions] of Object.entries(protectedPathPermissions)) {
			if (path.startsWith(pathPattern)) {
				const hasPermission = requiredPermissions.some((perm) => user.roles.includes(perm));
				if (!hasPermission) {
					throw redirect(302, '/auth/unauthorized');
				}
			}
		}
	}

	// Proceed to resolve the route with the authenticated user
	return await resolve(event);
};
