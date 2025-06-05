import type { PageServerLoad } from './$types';
import { getSettings } from '$lib/services/settings-service';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
	const settings = await getSettings();

	const oidcEnvVarsConfigured = !!env.OIDC_CLIENT_ID && !!env.OIDC_CLIENT_SECRET && !!env.OIDC_REDIRECT_URI && !!env.OIDC_AUTHORIZATION_ENDPOINT && !!env.OIDC_TOKEN_ENDPOINT && !!env.OIDC_USERINFO_ENDPOINT;

	return {
		settings,
		oidcEnvVarsConfigured
	};
};
