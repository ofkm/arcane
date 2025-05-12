import { redirect } from '@sveltejs/kit';
import { OAuth2RequestError } from 'arctic';
import { oidcClient, OIDC_TOKEN_ENDPOINT, OIDC_USERINFO_ENDPOINT } from '$lib/services/oidc-service';
import { getUserByUsername, saveUser, getUserById } from '$lib/services/user-service'; // Assuming you might want to use email as username or have a dedicated field
import type { User } from '$lib/types/user.type';
import { nanoid } from 'nanoid';
import type { RequestHandler } from './$types';
import type { UserSession } from '$lib/types/session.type';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('oidc_state');
	const codeVerifier = cookies.get('oidc_code_verifier');
	const finalRedirectTo = cookies.get('oidc_redirect') || '/';

	// Clear cookies
	cookies.delete('oidc_state', { path: '/' });
	cookies.delete('oidc_code_verifier', { path: '/' });
	cookies.delete('oidc_redirect', { path: '/' });

	if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
		console.error('OIDC callback error: state mismatch or missing params.');
		throw redirect(302, '/auth/login?error=oidc_invalid_response');
	}

	if (!OIDC_TOKEN_ENDPOINT) {
		console.error('OIDC_TOKEN_ENDPOINT is not configured.');
		throw redirect(302, '/auth/login?error=oidc_misconfigured');
	}

	try {
		const tokens = await oidcClient.validateAuthorizationCode(OIDC_TOKEN_ENDPOINT, code, codeVerifier);

		if (!OIDC_USERINFO_ENDPOINT) {
			console.error('OIDC_USERINFO_ENDPOINT is not configured. Cannot fetch user details.');
			throw redirect(302, '/auth/login?error=oidc_misconfigured');
		}

		const userInfoResponse = await fetch(OIDC_USERINFO_ENDPOINT, {
			headers: {
				Authorization: `Bearer ${tokens.accessToken()}` // Make sure to call accessToken()
			}
		});

		if (!userInfoResponse.ok) {
			console.error('Failed to fetch user info from OIDC provider:', await userInfoResponse.text());
			throw redirect(302, '/auth/login?error=oidc_userinfo_failed');
		}

		const oidcUser = await userInfoResponse.json();

		// Extract user information - field names depend on your OIDC provider and scopes requested
		// Common OIDC claims:
		// 'sub': Subject Identifier (unique ID for the user at the provider) - REQUIRED
		// 'email': User's email address
		// 'email_verified': Boolean indicating if email is verified
		// 'name': User's full name
		// 'preferred_username': Shorthand name by which the End-User wishes to be referred to
		// 'given_name': User's first name
		// 'family_name': User's last name
		// 'picture': URL of the End-User's profile picture

		const oidcSubjectId = oidcUser.sub;
		const oidcUserEmail = oidcUser.email;
		const oidcUserDisplayName = oidcUser.name;
		// Use preferred_username, or email, or generate one if not available or suitable for your system
		const oidcUsername = oidcUser.preferred_username || oidcUser.email || `user-${oidcUser.sub.slice(0, 8)}`;

		if (!oidcSubjectId) {
			console.error('OIDC userinfo response missing "sub" (subject identifier).');
			throw redirect(302, '/auth/login?error=oidc_missing_sub');
		}
		if (!oidcUserEmail) {
			// Decide how to handle missing email - it might be optional depending on your setup
			console.warn('OIDC userinfo response missing "email".');
			// Potentially throw an error or proceed without it if your system allows
		}

		// Find or create user in your system
		// It's best to use oidcSubjectId to find the user if they've logged in before with OIDC.
		// You might need to add a field like `oidcSubject` to your User model and a new service function.
		// For now, we'll try by email if available, then by username as a fallback for lookup.
		// Creating a new user will use the OIDC details.

		let user: User | null = null;
		// Example: if you add a getUserByOidcSubjectId function
		// user = await getUserByOidcSubjectId(oidcSubjectId);

		if (!user && oidcUserEmail) {
			user = await getUserByUsername(oidcUserEmail); // Assuming username can be an email
		}
		// If not found by email, or email is not primary, you might try by a derived username
		// if (!user) {
		// user = await getUserByUsername(oidcUsername);
		// }

		if (!user) {
			// Create a new user if one doesn't exist
			const newUser: User = {
				id: nanoid(),
				username: oidcUsername, // Ensure this is unique in your system
				email: oidcUserEmail,
				displayName: oidcUserDisplayName,
				// oidcSubjectId: oidcSubjectId, // Store this for future logins
				roles: ['admin'],
				createdAt: new Date().toISOString()
			};
			user = await saveUser(newUser);
		} else {
			// Optionally, update existing user's details if they've changed at the OIDC provider
			// For example, if their email or name changed.
			// user.email = oidcUserEmail;
			// user.name = oidcUser.name; // if you store name
			// await saveUser(user); // or an updateUser function
		}

		if (!user || !user.id || !user.username) {
			console.error('Failed to retrieve or create user after OIDC auth.');
			throw redirect(302, '/auth/login?error=user_processing_failed');
		}

		// Create session
		const userSession: UserSession = {
			userId: user.id,
			username: user.username,
			createdAt: Date.now(),
			lastAccessed: Date.now()
		};
		await locals.session.set(userSession);

		throw redirect(302, finalRedirectTo);
	} catch (e) {
		console.error('OIDC callback processing error:', e);
		if (e instanceof OAuth2RequestError) {
			// e.code, e.description
			throw redirect(302, `/auth/login?error=oidc_token_error&code=${e.code || 'unknown'}`);
		}
		throw redirect(302, '/auth/login?error=oidc_generic_error');
	}
};
