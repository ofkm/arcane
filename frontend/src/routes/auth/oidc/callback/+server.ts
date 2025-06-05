import { redirect } from '@sveltejs/kit';
import { settingsAPI } from '$lib/services/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('oidc_state');
	const finalRedirectTo = cookies.get('oidc_redirect') || '/';

	// Clean up cookies
	cookies.delete('oidc_state', { path: '/' });
	cookies.delete('oidc_redirect', { path: '/' });

	if (!code || !state || !storedState || state !== storedState) {
		console.error('OIDC callback error: state mismatch or missing params.');
		throw redirect(302, '/auth/login?error=oidc_invalid_response');
	}

	try {
		// Handle OIDC callback via backend API
		const authResult = await settingsAPI.handleOidcCallback(code, state);

		if (!authResult.success) {
			console.error('OIDC authentication failed:', authResult.error);
			throw redirect(302, `/auth/login?error=${authResult.error || 'oidc_auth_failed'}`);
		}

		// Set session with user data
		await locals.session.set({
			userId: authResult.user.id,
			username: authResult.user.username,
			createdAt: Date.now(),
			lastAccessed: Date.now()
		});

		throw redirect(302, finalRedirectTo);
	} catch (error) {
		console.error('OIDC callback processing error:', error);
		throw redirect(302, '/auth/login?error=oidc_generic_error');
	}
};
