import { redirect } from '@sveltejs/kit';
import { generateState, generateCodeVerifier, CodeChallengeMethod } from 'arctic';
import { oidcClient, OIDC_AUTHORIZATION_ENDPOINT, OIDC_SCOPES } from '$lib/services/oidc-service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	if (!OIDC_AUTHORIZATION_ENDPOINT) {
		console.error('OIDC_AUTHORIZATION_ENDPOINT is not configured.');
		throw redirect(302, '/auth/login?error=oidc_misconfigured');
	}

	const state = generateState();
	const codeVerifier = generateCodeVerifier();

	const authUrl = await oidcClient.createAuthorizationURLWithPKCE(OIDC_AUTHORIZATION_ENDPOINT, state, CodeChallengeMethod.S256, codeVerifier, OIDC_SCOPES);

	cookies.set('oidc_state', state, {
		path: '/',
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	cookies.set('oidc_code_verifier', codeVerifier, {
		path: '/',
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	// Add validation for the redirect URL
	function isSafeRedirect(redirect: string | null): boolean {
		if (!redirect) return false;
		try {
			// Only allow relative paths (no protocol, no host)
			const parsed = new URL(redirect, 'http://dummy');
			return parsed.origin === 'http://dummy' && redirect.startsWith('/');
		} catch {
			return false;
		}
	}

	const redirectUrl = url.searchParams.get('redirect');
	const safeRedirect = isSafeRedirect(redirectUrl) ? redirectUrl : '/';

	cookies.set('oidc_redirect', safeRedirect ?? '/', {
		path: '/',
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	throw redirect(302, authUrl.toString());
};
