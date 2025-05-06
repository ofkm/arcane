import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserByUsername, verifyPassword } from '$lib/services/user-service';
import { getSettings } from '$lib/services/settings-service';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Check if already logged in
	const session = locals.session.data;

	if (session?.userId) {
		// Already logged in, check if onboarding needed
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
	login: async ({ request, locals }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString() || '';
		const password = formData.get('password')?.toString() || '';
		const redirectTo = formData.get('redirectTo')?.toString() || '/';

		try {
			const user = await getUserByUsername(username);

			if (!user) {
				console.log(`User not found: ${username}`);
				return fail(400, { error: 'Invalid username or password', username });
			}

			const passwordValid = await verifyPassword(user, password);

			if (!passwordValid) {
				console.log('Password verification failed');
				return fail(400, { error: 'Invalid username or password', username });
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
				throw sessionError;
			}

			console.log(`Redirecting to: ${redirectTo}`);
			return {
				status: 302,
				location: redirectTo
			};
		} catch (error) {
			// Detailed error logging
			console.error('Login error details:', error);

			if (error instanceof Response) throw error;

			// Include more specific error message if available
			const errorMessage = error instanceof Error ? `Login failed: ${error.message}` : 'An error occurred during login';

			return fail(500, { error: errorMessage, username });
		}
	}
};
