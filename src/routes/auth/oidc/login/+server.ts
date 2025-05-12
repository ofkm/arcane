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

	// Use createAuthorizationURLWithPKCE for PKCE flow
	const authUrl = await oidcClient.createAuthorizationURLWithPKCE(
		OIDC_AUTHORIZATION_ENDPOINT,
		state,
		CodeChallengeMethod.S256, // Pass CodeChallengeMethod directly
		codeVerifier, // Pass codeVerifier directly
		OIDC_SCOPES // Pass OIDC_SCOPES (string[]) directly as the scopes
	);

	cookies.set('oidc_state', state, {
		path: '/',
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		sameSite: 'lax'
	});

	cookies.set('oidc_code_verifier', codeVerifier, {
		path: '/',
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		sameSite: 'lax'
	});

	const redirectTo = url.searchParams.get('redirect') || '/';
	cookies.set('oidc_redirect', redirectTo, {
		path: '/',
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	throw redirect(302, authUrl.toString());
};
