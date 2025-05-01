import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserByUsername, verifyPassword } from '$lib/services/user-service';
import { createSession } from '$lib/services/session-service';
import { getSettings } from '$lib/services/settings-service';

// Define a proper ActionData type
interface LoginActionData {
	error?: string;
	username?: string;
	[key: string]: unknown;
}

export const load: PageServerLoad = async ({ url, cookies }) => {
	// Check if already logged in
	const sessionId = cookies.get('session_id');
	if (sessionId) {
		// Check if onboarding is needed for logged-in users
		const settings = await getSettings();

		if (!settings.onboarding?.completed) {
			throw redirect(302, '/onboarding/welcome');
		} else {
			throw redirect(302, '/');
		}
	}

	// Pass the redirect URL from the query string to the form
	const redirectTo = url.searchParams.get('redirect') || '/';
	return { redirectTo };
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
			} as LoginActionData);
		}

		// Verify password
		const validPassword = await verifyPassword(user, password);

		if (!validPassword) {
			return fail(400, {
				error: 'Invalid username or password',
				username
			} as LoginActionData);
		}

		// Create session
		const ip = getClientAddress();
		const userAgent = request.headers.get('user-agent') || undefined;
		const sessionId = await createSession(user.id, user.username);

		// Set session cookie with enhanced security
		const settings = await getSettings();
		const sessionTimeout = settings.auth?.sessionTimeout || 60; // minutes

		cookies.set('session_id', sessionId, {
			path: '/',
			httpOnly: true,
			secure: true, // Always use secure cookies
			maxAge: sessionTimeout * 60, // Convert to seconds
			sameSite: 'strict', // Enhanced from 'lax'
			partitioned: true // Use partitioned cookies for added security in supported browsers
		});

		// Check if onboarding is needed
		if (!settings.onboarding?.completed) {
			throw redirect(302, '/onboarding/welcome');
		}

		// Get redirect URL from query params or go to home
		const redirectTo = url.searchParams.get('redirect') || '/';
		throw redirect(302, redirectTo);
	}
};
