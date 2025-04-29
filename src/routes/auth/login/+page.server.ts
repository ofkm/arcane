import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserByUsername, verifyPassword } from '$lib/services/user-service';
import { createSession } from '$lib/services/session-service';
import { getSettings } from '$lib/services/settings-service';
import { createAuthorizationUrl, getOidcProviders } from '$lib/services/oidc-service';

export const load: PageServerLoad = async ({ url, cookies }) => {
	// Check if already logged in
	const sessionId = cookies.get('session_id');
	if (sessionId) {
		throw redirect(302, '/');
	}

	// Get OIDC providers for the login page
	const providers = await getOidcProviders();

	// Generate authorization URLs for each provider
	const providerUrls: Record<string, string> = {};
	// Store states for callback verification
	const states: Record<string, string> = {};

	for (const provider of providers) {
		// The new createAuthorizationUrl returns both the URL and state
		const result = await createAuthorizationUrl(provider.id);
		if (result) {
			providerUrls[provider.id] = result.url;
			states[provider.id] = result.state;
		}
	}

	// Store states in a cookie for verification during callback
	if (Object.keys(states).length > 0) {
		cookies.set('oidc_states', JSON.stringify(states), {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 10 * 60, // 10 minutes
			sameSite: 'lax'
		});
	}

	return {
		providers,
		providerUrls
	};
};

export const actions: Actions = {
	login: async ({ request, cookies, getClientAddress, url }) => {
		const data = await request.formData();
		const username = data.get('username') as string;
		const password = data.get('password') as string;

		if (!username || !password) {
			return fail(400, { error: 'Username and password are required' });
		}

		// Get user
		const user = await getUserByUsername(username);

		if (!user) {
			return fail(400, {
				error: 'Invalid username or password',
				username
			});
		}

		// Verify password
		const validPassword = await verifyPassword(user, password);

		if (!validPassword) {
			return fail(400, {
				error: 'Invalid username or password',
				username
			});
		}

		// Create session
		const ip = getClientAddress();
		const userAgent = request.headers.get('user-agent') || undefined;
		const session = await createSession(user, ip, userAgent);

		// Set session cookie
		const settings = await getSettings();
		const sessionTimeout = settings.auth?.sessionTimeout || 60; // minutes

		cookies.set('session_id', session.id, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: sessionTimeout * 60, // Convert to seconds
			sameSite: 'lax'
		});

		// Get redirect URL from query params or go to home
		const redirectTo = url.searchParams.get('redirect') || '/';
		throw redirect(302, redirectTo);
	}
};
