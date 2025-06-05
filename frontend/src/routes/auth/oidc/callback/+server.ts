import { redirect } from '@sveltejs/kit';
import { OAuth2RequestError } from 'arctic';
import { getOIDCClient, getOIDCTokenEndpoint, getOIDCUserinfoEndpoint } from '$lib/services/oidc-service';
import { getUserByUsername, saveUser, getUserById, getUserByOidcSubjectId } from '$lib/services/user-service';
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

	cookies.delete('oidc_state', { path: '/' });
	cookies.delete('oidc_code_verifier', { path: '/' });
	cookies.delete('oidc_redirect', { path: '/' });

	if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
		console.error('OIDC callback error: state mismatch or missing params.');
		throw redirect(302, '/auth/login?error=oidc_invalid_response');
	}

	// Get OIDC configuration at runtime
	const oidcClient = await getOIDCClient();
	const tokenEndpoint = await getOIDCTokenEndpoint();
	const userinfoEndpoint = await getOIDCUserinfoEndpoint();

	if (!oidcClient) {
		console.error('OIDC client is not configured.');
		throw redirect(302, '/auth/login?error=oidc_misconfigured');
	}

	if (!tokenEndpoint) {
		console.error('OIDC_TOKEN_ENDPOINT is not configured.');
		throw redirect(302, '/auth/login?error=oidc_misconfigured');
	}

	try {
		const tokens = await oidcClient.validateAuthorizationCode(tokenEndpoint, code, codeVerifier);

		if (!userinfoEndpoint) {
			console.error('OIDC_USERINFO_ENDPOINT is not configured. Cannot fetch user details.');
			throw redirect(302, '/auth/login?error=oidc_misconfigured');
		}

		const userInfoResponse = await fetch(userinfoEndpoint, {
			headers: {
				Authorization: `Bearer ${tokens.accessToken()}`
			}
		});

		if (!userInfoResponse.ok) {
			console.error('Failed to fetch user info from OIDC provider:', await userInfoResponse.text());
			throw redirect(302, '/auth/login?error=oidc_userinfo_failed');
		}

		const oidcUser = await userInfoResponse.json();

		const oidcSubjectId = oidcUser.sub;
		const oidcUserEmail = oidcUser.email;
		const oidcUserDisplayName = oidcUser.name || oidcUser.preferred_username;
		const oidcUsername = oidcUser.preferred_username || oidcUser.email || `user-${oidcUser.sub?.slice(0, 8)}`;

		if (!oidcSubjectId) {
			console.error('OIDC userinfo response missing "sub" (subject identifier).');
			throw redirect(302, '/auth/login?error=oidc_missing_sub');
		}

		let user: User | null = null;
		let needsUpdate = false;

		user = await getUserByOidcSubjectId(oidcSubjectId);

		if (user) {
			if (oidcUserDisplayName && user.displayName !== oidcUserDisplayName) {
				user.displayName = oidcUserDisplayName;
				needsUpdate = true;
			}
			if (oidcUserEmail && user.email !== oidcUserEmail) {
				user.email = oidcUserEmail;
				needsUpdate = true;
			}
			if (needsUpdate) {
				user.updatedAt = new Date().toISOString();
			}
		} else if (oidcUserEmail) {
			const userByEmail = await getUserByUsername(oidcUserEmail);
			if (userByEmail) {
				if (!userByEmail.oidcSubjectId) {
					userByEmail.oidcSubjectId = oidcSubjectId;
					userByEmail.displayName = oidcUserDisplayName || userByEmail.displayName;
					userByEmail.updatedAt = new Date().toISOString();
					user = userByEmail;
					needsUpdate = true;
				} else if (userByEmail.oidcSubjectId === oidcSubjectId) {
					user = userByEmail;
					if (oidcUserDisplayName && user.displayName !== oidcUserDisplayName) {
						user.displayName = oidcUserDisplayName;
						needsUpdate = true;
					}
					if (needsUpdate) {
						user.updatedAt = new Date().toISOString();
					}
				} else {
					console.error(`OIDC login attempt for email ${oidcUserEmail} with new OIDC subjectId ${oidcSubjectId}, but email is already linked to OIDC subjectId ${userByEmail.oidcSubjectId}.`);
					throw redirect(302, '/auth/login?error=oidc_email_collision');
				}
			}
		}

		if (!user) {
			const newUser: User = {
				id: nanoid(),
				username: oidcUsername,
				email: oidcUserEmail,
				displayName: oidcUserDisplayName,
				oidcSubjectId: oidcSubjectId,
				roles: ['admin'], //This will be part of the rbac feature, user or admin doesnt really matter right now
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				lastLogin: new Date().toISOString()
			};
			user = newUser;
			needsUpdate = true;
		}

		if (needsUpdate && user) {
			await saveUser(user);
		}

		if (!user || !user.id || !user.username) {
			console.error('Failed to retrieve or create user after OIDC auth.');
			throw redirect(302, '/auth/login?error=user_processing_failed');
		}

		if (user && !needsUpdate) {
			user.lastLogin = new Date().toISOString();
			user.updatedAt = new Date().toISOString();
			await saveUser(user);
		}

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
			throw redirect(302, `/auth/login?error=oidc_token_error&code=${e.code || 'unknown'}`);
		}
		if (e instanceof Error && e.message.includes('/auth/login?error=oidc_email_collision')) {
			throw e;
		}
		throw redirect(302, '/auth/login?error=oidc_generic_error');
	}
};
