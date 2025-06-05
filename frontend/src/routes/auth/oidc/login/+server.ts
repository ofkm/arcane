import { redirect } from '@sveltejs/kit';
import { generateState, generateCodeVerifier } from 'arctic';
import { settingsAPI } from '$lib/services/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	try {
		// Get OIDC auth URL from backend
		const redirectParam = url.searchParams.get('redirect') || '/';
		const authResponse = await settingsAPI.getOidcAuthUrl(redirectParam);

		if (!authResponse.authUrl) {
			console.error('OIDC auth URL not available.');
			throw redirect(302, '/auth/login?error=oidc_misconfigured');
		}

		// Store state and redirect info in cookies
		cookies.set('oidc_state', authResponse.state, {
			path: '/',
			secure: import.meta.env.PROD,
			httpOnly: true,
			maxAge: 60 * 10,
			sameSite: 'lax'
		});

		cookies.set('oidc_redirect', redirectParam, {
			path: '/',
			secure: import.meta.env.PROD,
			httpOnly: true,
			maxAge: 60 * 10,
			sameSite: 'lax'
		});

		throw redirect(302, authResponse.authUrl);
	} catch (error) {
		console.error('OIDC login error:', error);
		throw redirect(302, '/auth/login?error=oidc_misconfigured');
	}
};
