import type { PageServerLoad } from './$types';
import { getSettings } from '$lib/services/settings-service';
import { listUsers } from '$lib/services/user-service';
import { env } from '$env/dynamic/private'; // Import private env

export const load: PageServerLoad = async () => {
	const settings = await getSettings();
	const users = await listUsers();

	const csrf = crypto.randomUUID();

	const sanitizedUsers = users.map((user) => {
		const { passwordHash: _passwordHash, ...rest } = user;
		return rest;
	});

	// Check if essential OIDC environment variables are configured
	const oidcEnvVarsConfigured = !!env.OIDC_CLIENT_ID && !!env.OIDC_CLIENT_SECRET && !!env.OIDC_REDIRECT_URI && !!env.OIDC_AUTHORIZATION_ENDPOINT && !!env.OIDC_TOKEN_ENDPOINT && !!env.OIDC_USERINFO_ENDPOINT;

	return {
		settings,
		csrf,
		users: sanitizedUsers,
		oidcEnvVarsConfigured // Pass this to the page
	};
};
