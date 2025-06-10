import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { building, dev } from '$app/environment';
import SessionAPIService from '$lib/services/api/session-api-service';
import { loadSettingsFromServer } from '$lib/stores/settings-store';

// Get environment variable
const isTestEnvironment = process.env.APP_ENV === 'TEST';

// Settings initialization handler
const settingsHandler: Handle = async ({ event, resolve }) => {
	// Skip during build
	if (building) {
		return resolve(event);
	}

	const { url } = event;
	const path = url.pathname;

	// Only initialize settings for authenticated pages (not auth pages)
	const isAuthPath = path.startsWith('/auth/') || path.startsWith('/api/');

	if (!isAuthPath) {
		try {
			// Load settings from server to populate the store
			await loadSettingsFromServer();
		} catch (error) {
			console.error('Failed to initialize settings store:', error);
			// Don't block the request if settings fail to load
		}
	}

	return resolve(event);
};

// Authentication and authorization handler
const authHandler: Handle = async ({ event, resolve }) => {
	// Skip auth processing during build
	if (building) {
		return resolve(event);
	}

	const { url } = event;
	const path = url.pathname;

	// Define paths that don't require authentication
	const publicPaths = [
		'/auth/login',
		'/auth/logout',
		'/img',
		'/auth/oidc/login',
		'/auth/oidc/callback',
		'/api/agents/register',
		'/api/agents/heartbeat',
		'/api/health',
		'/api/version',
		'/favicon.ico',
		'/_app'
	];

	// Check for specific agent polling patterns that should be public
	const agentPollingPattern = /^\/api\/agents\/[^\/]+\/tasks$/;
	const agentResultPattern = /^\/api\/agents\/[^\/]+\/tasks\/[^\/]+\/result$/;
	const agentTaskStatusPattern = /^\/api\/agents\/[^\/]+\/tasks\/[^\/]+\/status$/;

	const isPublicPath = publicPaths.some((p) => path.startsWith(p));
	const isAgentPolling = agentPollingPattern.test(path) && event.request.method === 'GET';
	const isAgentResult = agentResultPattern.test(path) && event.request.method === 'POST';
	const isAgentTaskStatus = agentTaskStatusPattern.test(path) && event.request.method === 'PUT';

	// Allow access to public paths and specific agent endpoints
	if (isPublicPath || isAgentPolling || isAgentResult || isAgentTaskStatus) {
		return await resolve(event);
	}

	// For API routes, just pass through - the Go backend will handle authentication
	if (path.startsWith('/api/')) {
		return await resolve(event);
	}

	// For frontend routes, check session with backend using session-api-service
	if (dev && !isTestEnvironment) {
		try {
			const sessionApiService = new SessionAPIService();

			// Validate session using the session API service
			const isValidSession = await sessionApiService.validateSession();

			if (!isValidSession) {
				// No valid session - redirect to login
				throw redirect(302, `/auth/login?redirect=${encodeURIComponent(path)}`);
			}

			// Check onboarding status
			const isOnboardingPath = path.startsWith('/onboarding');

			if (!isOnboardingPath) {
				try {
					const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
					const settingsResponse = await fetch(`${backendUrl}/api/settings`, {
						credentials: 'include',
						headers: {
							Cookie: event.request.headers.get('Cookie') || ''
						}
					});

					if (settingsResponse.ok) {
						const settingsData = await settingsResponse.json();
						const settings = settingsData.settings || settingsData.data || settingsData;

						if (!settings?.onboarding?.completed) {
							throw redirect(302, '/onboarding/welcome');
						}
					}
				} catch (error) {
					console.error('Error checking onboarding status:', error);
					// Don't redirect on error - let the user continue
				}
			}
		} catch (error) {
			// Re-throw SvelteKit redirect errors
			if (error instanceof redirect) {
				throw error;
			}

			console.error('Session validation error:', error);
			throw redirect(302, `/auth/login?redirect=${encodeURIComponent(path)}`);
		}
	}

	return await resolve(event);
};

// Simple initialization handler
const initHandler: Handle = async ({ event, resolve }) => {
	// Skip initialization during build
	if (building) {
		return resolve(event);
	}

	// No frontend initialization needed - everything is handled by the backend
	return resolve(event);
};

export const handle = sequence(settingsHandler, initHandler, authHandler);
