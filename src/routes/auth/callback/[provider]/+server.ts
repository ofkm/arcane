import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleOidcCallback } from '$lib/services/oidc-service';
import { createSession } from '$lib/services/session-service';
import { saveUser } from '$lib/services/user-service';
import { getSettings } from '$lib/services/settings-service';

export const GET: RequestHandler = async ({ params, url, cookies, getClientAddress, request }) => {
	// Get the callback parameters from URL query params
	const callbackParams: Record<string, string> = {};
	for (const [key, value] of url.searchParams.entries()) {
		callbackParams[key] = value;
	}

	// Handle errors from the OIDC provider
	if (callbackParams.error) {
		throw redirect(302, `/auth/login?error=${callbackParams.error}`);
	}

	if (!callbackParams.code || !callbackParams.state) {
		throw redirect(302, '/auth/login?error=invalid-callback');
	}

	// Process the callback - with new method signature that takes only callbackParams
	const result = await handleOidcCallback(callbackParams);

	if (!result) {
		throw redirect(302, '/auth/login?error=oidc-failed');
	}

	const { user, claims } = result;

	// Save or update the user in our system
	const savedUser = await saveUser(user);

	// Create a session for the user
	const ip = getClientAddress();
	const userAgent = request.headers.get('user-agent') || undefined;
	const session = await createSession(savedUser, ip, userAgent);

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

	// Clear the OIDC states cookie
	cookies.delete('oidc_states', { path: '/' });

	// Redirect to home or where the user was trying to go
	const redirectTo = url.searchParams.get('redirect_uri') || '/';
	throw redirect(302, redirectTo);
};
