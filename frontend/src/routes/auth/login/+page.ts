import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { settingsAPI, sessionAPI } from '$lib/services/api';

export const load: PageLoad = async ({ url, fetch }) => {
	// Check if already logged in by validating session via API
	try {
		const isValidSession = await sessionAPI.validateSession();

		if (isValidSession) {
			// Already logged in, get settings to check onboarding
			const appSettings = await settingsAPI.getSettings().catch(() => null);

			if (!appSettings?.onboarding?.completed) {
				throw redirect(302, '/onboarding/welcome');
			} else {
				throw redirect(302, '/');
			}
		}
	} catch (error) {
		// If session validation fails, continue to login page
		console.debug('No valid session found, proceeding to login');
	}

	// Get settings for the login page (OIDC configuration, etc.)
	const appSettings = await settingsAPI.getSettings().catch(() => ({
		auth: {
			localAuthEnabled: true,
			oidcEnabled: false,
			sessionTimeout: 60,
			passwordPolicy: 'strong',
			rbacEnabled: false
		},
		onboarding: {
			completed: false
		}
	}));

	// Pass the redirect URL from the query string to the form
	const redirectTo = url.searchParams.get('redirect') || '/';
	const error = url.searchParams.get('error'); // Get error from URL params for OIDC errors

	return {
		redirectTo,
		settings: appSettings, // Pass all settings to the page
		error // Pass error to the page
	};
};
