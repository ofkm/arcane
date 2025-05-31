import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getUserByUsername } from '$lib/services/user-service';
import { getSettings } from '$lib/services/settings-service';
import { checkFirstRun } from '$lib/utils/onboarding.utils';
import { sessionHandler } from '$lib/services/session-handler';
import { initComposeService } from '$lib/services/docker/stack-service';
import { initAutoUpdateScheduler } from '$lib/services/docker/scheduler-service';
import { initMaturityPollingScheduler } from '$lib/services/docker/image-service';

// Get environment variable
const isTestEnvironment = process.env.APP_ENV === 'TEST';

// Initialize needed services
try {
	await Promise.all([checkFirstRun(), initComposeService(), initAutoUpdateScheduler(), initMaturityPollingScheduler()]);
} catch (err) {
	console.error('Critical service init failed, exiting:', err);
	process.exit(1);
}

// Authentication and authorization handler
const authHandler: Handle = async ({ event, resolve }) => {
	const { url } = event;
	const path = url.pathname;

	// Define paths that don't require authentication
	const publicPaths = [
		'/auth/login',
		'/img',
		'/auth/oidc/login',
		'/auth/oidc/callback',
		'/api/agents/register', // Agent registration
		'/api/agents/heartbeat' // Agent heartbeat
	];

	// Check for specific agent polling patterns that should be public
	const agentPollingPattern = /^\/api\/agents\/[^\/]+\/tasks$/; // GET /api/agents/{agentId}/tasks
	const agentResultPattern = /^\/api\/agents\/[^\/]+\/tasks\/[^\/]+\/result$/; // POST /api/agents/{agentId}/tasks/{taskId}/result

	const isPublicPath = publicPaths.some((p) => path.startsWith(p));
	const isAgentPolling = agentPollingPattern.test(path) && event.request.method === 'GET';
	const isAgentResult = agentResultPattern.test(path) && event.request.method === 'POST';

	// Allow access to public paths and specific agent endpoints
	if (isPublicPath || isAgentPolling || isAgentResult) {
		return await resolve(event);
	}

	// Get session data using the updated API
	const session = event.locals.session.data;

	if (!session || !session.userId) {
		// No valid session
		await event.locals.session.destroy();
		throw redirect(302, `/auth/login?redirect=${encodeURIComponent(path)}`);
	}

	// Cache the user in event.locals
	if (!event.locals.user) {
		try {
			event.locals.user = await getUserByUsername(session.username);
		} catch {
			// Invalid user in session
			await event.locals.session.destroy();
			throw redirect(302, `/auth/login?error=invalid-session`);
		}
	}

	const user = event.locals.user;

	if (!user) {
		await event.locals.session.destroy();
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

	return await resolve(event);
};

export const handle = sequence(sessionHandler, authHandler);
