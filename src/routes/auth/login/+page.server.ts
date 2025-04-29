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
		throw redirect(302, '/');
	}

	return {};
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
		const session = await createSession(user.id, user.username);

		// Set session cookie
		const settings = await getSettings();
		const sessionTimeout = settings.auth?.sessionTimeout || 60; // minutes

		cookies.set('session_id', session, {
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
