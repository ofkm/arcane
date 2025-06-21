import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { building, dev } from '$app/environment';
import { settingsAPI } from '$lib/services/api';
import settingsStore from '$lib/stores/config-store';
import { authService } from '$lib/services/api/auth-api-service';

const isTestEnvironment = process.env.APP_ENV === 'TEST';

const settingsHandler: Handle = async ({ event, resolve }) => {
	if (building) {
		return resolve(event);
	}

	const { url } = event;
	const path = url.pathname;

	const isAuthPath = path.startsWith('/auth/') || path.startsWith('/api/');

	if (!isAuthPath) {
		try {
			const settings = await settingsAPI.getSettings();
			settingsStore.set(settings);
		} catch (error) {
			console.error('Failed to initialize settings store:', error);
		}
	}

	return resolve(event);
};

const authHandler: Handle = async ({ event, resolve }) => {
	if (building) {
		return resolve(event);
	}

	const { url } = event;
	const path = url.pathname;

	const publicPaths = ['/auth/login', '/auth/logout', '/img', '/auth/oidc/login', '/auth/oidc/callback', '/api/health', '/api/version', '/favicon.ico', '/_app'];

	const isPublicPath = publicPaths.some((p) => path.startsWith(p));

	if (path.startsWith('/api/')) {
		return await resolve(event);
	}

	if (dev && !isTestEnvironment) {
		try {
			const isValidSession = await authService.validateSession();

			if (!isValidSession) {
				throw redirect(302, `/auth/login?redirect=${encodeURIComponent(path)}`);
			}

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
