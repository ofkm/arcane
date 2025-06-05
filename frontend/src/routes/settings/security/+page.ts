import type { PageLoad } from './$types';
import { getSettings } from '$lib/services/settings-service';

export const load: PageLoad = async () => {
	const settings = await getSettings();

	// const oidcEnvVarsConfigured = !!env.OIDC_CLIENT_ID && !!env.OIDC_CLIENT_SECRET && !!env.OIDC_REDIRECT_URI && !!env.OIDC_AUTHORIZATION_ENDPOINT && !!env.OIDC_TOKEN_ENDPOINT && !!env.OIDC_USERINFO_ENDPOINT;

	return {
		settings
	};
};
