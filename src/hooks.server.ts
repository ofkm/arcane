import { redirect, type Handle } from '@sveltejs/kit';
import { initComposeService } from '$lib/services/docker/stack-service';
import { initAutoUpdateScheduler } from '$lib/services/docker/scheduler-service';
import { getSession } from '$lib/services/session-service';
import { getUserByUsername, listUsers, saveUser, hashPassword } from '$lib/services/user-service';
import { getSettings } from '$lib/services/settings-service';

// First-run check to create admin user if needed
async function checkFirstRun() {
	try {
		// getBasePath from settings-service should already handle dev vs prod
		const users = await listUsers();

		if (users.length === 0) {
			console.log('No users found. Creating default admin user...');

			// Create a default admin user
			const passwordHash = await hashPassword('arcane-admin'); // Default password

			await saveUser({
				id: crypto.randomUUID(),
				username: 'arcane',
				passwordHash,
				displayName: 'Arcane Admin',
				email: 'arcane@local',
				roles: ['admin'],
				createdAt: new Date().toISOString()
			});

			console.log('Default admin user created successfully');
			console.log('Username: arcane');
			console.log('Password: arcane-admin');
			console.log('IMPORTANT: Please change this password immediately after first login!');
		}
	} catch (error) {
		console.error('Error during first-run check:', error);
	}
}

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

	// Check if the path is public/doesn't require auth
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

	// Validate the session - store in event.locals to cache for this request
	// This prevents multiple calls to getSession during the same request
	if (!event.locals.session) {
		event.locals.session = await getSession(sessionId);
	}

	const session = event.locals.session;

	if (!session) {
		// Invalid or expired session
		cookies.delete('session_id', { path: '/' });
		throw redirect(302, `/auth/login?redirect=${encodeURIComponent(path)}`);
	}

	// Get the user - also cache in locals
	if (!event.locals.user) {
		event.locals.user = await getUserByUsername(session.username);
	}

	const user = event.locals.user;

	if (!user) {
		cookies.delete('session_id', { path: '/' });
		throw redirect(302, `/auth/login?error=invalid-session`);
	}

	// Check permissions for protected paths
	const settings = await getSettings();
	if (settings?.auth?.rbacEnabled) {
		// Check each protected path pattern
		for (const [pathPattern, requiredPermissions] of Object.entries(protectedPathPermissions)) {
			if (path.startsWith(pathPattern)) {
				// Check if user has any of the required permissions
				const hasPermission = requiredPermissions.some((perm) => user.roles.includes(perm));

				if (!hasPermission) {
					// User doesn't have permission
					throw redirect(302, '/auth/unauthorized');
				}
			}
		}
	}

	// Proceed to resolve the route with the authenticated user
	return await resolve(event);
};
