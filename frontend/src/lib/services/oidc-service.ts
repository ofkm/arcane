import { settingsAPI } from './api';
import { env } from '$env/dynamic/public';
import { building } from '$app/environment';

// Cache for OIDC configuration
let cachedConfig: any = null;

/**
 * Get OIDC configuration from API
 */
export async function getOIDCConfig() {
	if (building) {
		// Return dummy config during build
		return {
			enabled: false,
			clientId: '',
			clientSecret: '',
			redirectUri: '',
			authorizationEndpoint: '',
			tokenEndpoint: '',
			userinfoEndpoint: '',
			scopes: ['openid', 'email', 'profile']
		};
	}

	if (cachedConfig) {
		return cachedConfig;
	}

	try {
		// Get OIDC status and config from API
		const [status, settings] = await Promise.all([settingsAPI.getOidcStatus(), settingsAPI.getSettings()]);

		// Check if OIDC is forced by environment variable
		const oidcForcedByEnv = env.PUBLIC_OIDC_ENABLED === 'true';

		// If OIDC is not enabled and not forced by env, return disabled config
		if (!oidcForcedByEnv && !status.enabled) {
			cachedConfig = {
				enabled: false,
				clientId: '',
				clientSecret: '',
				redirectUri: '',
				authorizationEndpoint: '',
				tokenEndpoint: '',
				userinfoEndpoint: '',
				scopes: ['openid', 'email', 'profile']
			};
			return cachedConfig;
		}

		// Get OIDC config from API if enabled
		let oidcConfig;
		try {
			oidcConfig = await settingsAPI.getOidcConfig();
		} catch (error) {
			console.warn('Failed to get OIDC config from API:', error);
			oidcConfig = settings.auth?.oidc;
		}

		cachedConfig = {
			enabled: status.enabled || oidcForcedByEnv,
			clientId: oidcConfig?.clientId || '',
			clientSecret: oidcConfig?.clientSecret || '',
			redirectUri: oidcConfig?.redirectUri || '',
			authorizationEndpoint: oidcConfig?.authorizationEndpoint || '',
			tokenEndpoint: oidcConfig?.tokenEndpoint || '',
			userinfoEndpoint: oidcConfig?.userinfoEndpoint || '',
			scopes: Array.isArray(oidcConfig?.scopes) ? oidcConfig.scopes : (oidcConfig?.scopes || 'openid email profile').split(' ')
		};

		return cachedConfig;
	} catch (error) {
		console.error('Failed to get OIDC config:', error);

		// Fallback to disabled config
		cachedConfig = {
			enabled: false,
			clientId: '',
			clientSecret: '',
			redirectUri: '',
			authorizationEndpoint: '',
			tokenEndpoint: '',
			userinfoEndpoint: '',
			scopes: ['openid', 'email', 'profile']
		};

		return cachedConfig;
	}
}

// Legacy exports for backward compatibility
export async function getOIDCScopes(): Promise<string[]> {
	const config = await getOIDCConfig();
	return config.scopes;
}

export async function getOIDCClientId(): Promise<string> {
	const config = await getOIDCConfig();
	return config.clientId;
}

export async function getOIDCClientSecret(): Promise<string> {
	const config = await getOIDCConfig();
	return config.clientSecret;
}

export async function getOIDCRedirectUri(): Promise<string> {
	const config = await getOIDCConfig();
	return config.redirectUri;
}

export async function getOIDCAuthorizationEndpoint(): Promise<string> {
	const config = await getOIDCConfig();
	return config.authorizationEndpoint;
}

export async function getOIDCTokenEndpoint(): Promise<string> {
	const config = await getOIDCConfig();
	return config.tokenEndpoint;
}

export async function getOIDCUserinfoEndpoint(): Promise<string> {
	const config = await getOIDCConfig();
	return config.userinfoEndpoint;
}

// Clear cache function for when settings are updated
export function clearOIDCConfigCache() {
	cachedConfig = null;
}
