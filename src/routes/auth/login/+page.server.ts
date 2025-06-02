import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserByUsernameFromDb } from '$lib/services/database/user-db-service';
import { verifyPassword } from '$lib/services/user-service';
import { getSettings } from '$lib/services/settings-service';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Check if already logged in
	const session = locals.session.data;
	const appSettings = await getSettings(); // Load application settings

	if (session?.userId) {
		// Already logged in, check if onboarding needed

		if (!appSettings.onboarding?.completed) {
			throw redirect(302, '/onboarding/welcome');
		} else {
			throw redirect(302, '/');
		}
	}

	// Pass the redirect URL from the query string to the form
	const redirectTo = url.searchParams.get('redirect') || '/';
	const error = url.searchParams.get('error'); // Get error from URL params for OIDC errors

	return {
		redirectTo,
		settings: appSettings, // Pass all settings to the page
		error // Pass error to the page
	};
};

export const actions: Actions = {
	login: async ({ request, locals }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString() || '';
		const password = formData.get('password')?.toString() || '';
		const redirectTo = formData.get('redirectTo')?.toString() || '/'; // Ensure redirectTo is retrieved from form

		try {
			const user = await getUserByUsernameFromDb(username);

			if (!user) {
				console.log(`User not found: ${username}`);
				return fail(400, { error: 'Invalid username or password', username, redirectTo });
			}

			// Check if local login is disabled by settings
			const appSettings = await getSettings();
			if (appSettings.auth?.localAuthEnabled === false) {
				console.log(`Local login attempt for ${username} when local auth is disabled.`);
				return fail(403, { error: 'Local login is disabled.', username, redirectTo });
			}
			// Also check if the user is an OIDC-only user (no passwordHash)
			if (!user.passwordHash) {
				console.log(`Local login attempt for OIDC-only user: ${username}`);
				return fail(400, { error: 'This account must sign in via OIDC.', username, redirectTo });
			}

			const passwordValid = await verifyPassword(user, password);

			if (!passwordValid) {
				console.log('Password verification failed');
				return fail(400, { error: 'Invalid username or password', username, redirectTo });
			}

			try {
				await locals.session.set({
					userId: user.id,
					username: user.username,
					createdAt: Date.now(),
					lastAccessed: Date.now()
				});
			} catch (sessionError) {
				console.error('Session creation error:', sessionError);
				// Re-throw or return a specific fail, depending on desired behavior
				return fail(500, { error: 'Failed to create session.', username, redirectTo });
			}

			// Instead of returning an object with status and location,
			// SvelteKit form actions expect a redirect to be thrown for 302.
			return {
				status: 302,
				location: redirectTo
			};
		} catch (error) {
			// If it's a redirect, let it propagate
			if (error instanceof Response && error.status === 302) throw error;

			console.error('Login error details:', error);
			const errorMessage = error instanceof Error ? `Login failed: ${error.message}` : 'An error occurred during login';
			return fail(500, { error: errorMessage, username, redirectTo });
		}
	}
};
