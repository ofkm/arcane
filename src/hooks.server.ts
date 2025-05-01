import { redirect, type Handle } from '@sveltejs/kit';
import { initComposeService } from '$lib/services/docker/stack-service';
import { initAutoUpdateScheduler } from '$lib/services/docker/scheduler-service';
import { getSession } from '$lib/services/session-service';
import { getUserByUsername } from '$lib/services/user-service';
import { getSettings } from '$lib/services/settings-service';
import { checkFirstRun } from '$lib/utils/onboarding.utils';

// Initialize needed services
try {
	await Promise.all([checkFirstRun(), initComposeService(), initAutoUpdateScheduler()]);
} catch (err) {
	console.error('Critical service init failed, exiting:', err);
	process.exit(1);
}

// Whitelisted paths that don't require auth
const publicPaths = ['/auth/login', '/auth/callback', '/api/health', '/assets'];

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

	// Define public paths
	const publicPaths = ['/auth/login', '/auth/callback', '/api/health', '/assets'];

	// Check if the path is public
	const isPublicPath = publicPaths.some((p) => path.startsWith(p));

	if (isPublicPath) {
		return await resolve(event);
	}

	// Get session from cookie
	const sessionId = cookies.get('session_id');

	if (!sessionId) {
		// No session found, redirect to login
		if (!isPublicPath) {
			throw redirect(302, `/auth/login?redirect=${encodeURIComponent(path)}`);
		}
		return await resolve(event);
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
	const isApiRoute = (path: string) => path.startsWith('/api/');

	// Check if onboarding is needed - only after successful authentication
	if (!path.startsWith('/onboarding') && !isApiRoute && !settings.onboarding?.completed) {
		// User is authenticated and onboarding is not complete
		throw redirect(302, '/onboarding/welcome');
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
