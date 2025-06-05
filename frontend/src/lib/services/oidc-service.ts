import { settingsAPI } from './api';
import { env } from '$env/dynamic/public';
import { building } from '$app/environment';

// Cache for OIDC configuration
let cachedConfig: any = null;

/**
 * Get OIDC configuration from API or environment
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
		// Get settings from API instead of directly from database
		const settings = await settingsAPI.getSettings();

		// Check if OIDC is forced by environment variable
		const oidcForcedByEnv = env.PUBLIC_OIDC_ENABLED === 'true';

		// If OIDC is not enabled and not forced by env, return disabled config
		if (!oidcForcedByEnv && !settings.auth?.oidcEnabled) {
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

		// Get OIDC configuration from API
		const oidcConfig = await settingsAPI.getOidcConfig();

		cachedConfig = {
			enabled: true,
			...oidcConfig
		};

		return cachedConfig;
	} catch (error) {
		console.warn('Failed to load OIDC configuration:', error);
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
	return config.scopes || ['openid', 'email', 'profile'];
}

export async function getOIDCClientId(): Promise<string> {
	const config = await getOIDCConfig();
	return config.clientId || '';
}

export async function getOIDCClientSecret(): Promise<string> {
	const config = await getOIDCConfig();
	return config.clientSecret || '';
}

export async function getOIDCRedirectUri(): Promise<string> {
	const config = await getOIDCConfig();
	return config.redirectUri || '';
}

export async function getOIDCAuthorizationEndpoint(): Promise<string> {
	const config = await getOIDCConfig();
	return config.authorizationEndpoint || '';
}

export async function getOIDCTokenEndpoint(): Promise<string> {
	const config = await getOIDCConfig();
	return config.tokenEndpoint || '';
}

export async function getOIDCUserinfoEndpoint(): Promise<string> {
	const config = await getOIDCConfig();
	return config.userinfoEndpoint || '';
}

// Clear cache function for when settings are updated
export function clearOIDCConfigCache() {
	cachedConfig = null;
}
