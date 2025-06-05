import { OAuth2Client } from 'arctic';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { getSettings } from './settings-service';

// Lazy-loaded configuration
let oidcConfig: {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	authorizationEndpoint?: string;
	tokenEndpoint?: string;
	userinfoEndpoint?: string;
	scopes: string[];
} | null = null;

let oidcClient: OAuth2Client | null = null;

/**
 * Get OIDC configuration - only loads at runtime
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

	if (oidcConfig) {
		return { enabled: true, ...oidcConfig };
	}

	try {
		const settings = await getSettings();

		// Resolve OIDC configuration:
		// 1. Environment variables (highest precedence)
		// 2. Settings from getSettings() (if OIDC is enabled in settings and env var is not set)
		// 3. Hardcoded fallback for scopes if neither of the above provides it.

		let resolvedClientId = env.OIDC_CLIENT_ID;
		let resolvedClientSecret = env.OIDC_CLIENT_SECRET;
		let resolvedRedirectUri = env.OIDC_REDIRECT_URI;
		let resolvedAuthEndpoint = env.OIDC_AUTHORIZATION_ENDPOINT;
		let resolvedTokenEndpoint = env.OIDC_TOKEN_ENDPOINT;
		let resolvedUserInfoEndpoint = env.OIDC_USERINFO_ENDPOINT;
		let resolvedScopesString = env.OIDC_SCOPES;

		// If OIDC is enabled in settings, use those values as fallbacks if environment variables are not set.
		if (settings.auth.oidcEnabled && settings.auth.oidc) {
			if (resolvedClientId === undefined) resolvedClientId = settings.auth.oidc.clientId;
			if (resolvedClientSecret === undefined) resolvedClientSecret = settings.auth.oidc.clientSecret;
			if (resolvedRedirectUri === undefined) resolvedRedirectUri = settings.auth.oidc.redirectUri;
			if (resolvedAuthEndpoint === undefined) resolvedAuthEndpoint = settings.auth.oidc.authorizationEndpoint;
			if (resolvedTokenEndpoint === undefined) resolvedTokenEndpoint = settings.auth.oidc.tokenEndpoint;
			if (resolvedUserInfoEndpoint === undefined) resolvedUserInfoEndpoint = settings.auth.oidc.userinfoEndpoint;
			if (resolvedScopesString === undefined) resolvedScopesString = settings.auth.oidc.scopes;
		}

		if (resolvedScopesString === undefined) {
			resolvedScopesString = 'openid email profile';
		}

		const scopes = resolvedScopesString.split(' ').filter((s) => s.trim() !== '');

		// Check if OIDC is properly configured
		if (!resolvedClientId || !resolvedClientSecret || !resolvedRedirectUri) {
			console.log('OIDC not configured or incomplete configuration, OIDC will be disabled');
			return {
				enabled: false,
				clientId: '',
				clientSecret: '',
				redirectUri: '',
				authorizationEndpoint: '',
				tokenEndpoint: '',
				userinfoEndpoint: '',
				scopes
			};
		}

		oidcConfig = {
			clientId: resolvedClientId,
			clientSecret: resolvedClientSecret,
			redirectUri: resolvedRedirectUri,
			authorizationEndpoint: resolvedAuthEndpoint,
			tokenEndpoint: resolvedTokenEndpoint,
			userinfoEndpoint: resolvedUserInfoEndpoint,
			scopes
		};

		if (!resolvedAuthEndpoint || !resolvedTokenEndpoint) {
			console.warn('OIDC Authorization or Token Endpoint is not set (from environment or application settings). OIDC flow will likely fail.');
		}

		return { enabled: true, ...oidcConfig };
	} catch (error) {
		console.warn('Failed to load OIDC configuration:', error);
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
}

/**
 * Get OIDC client - lazy initialization
 */
export async function getOIDCClient(): Promise<OAuth2Client | null> {
	if (building) {
		return null;
	}

	if (oidcClient) {
		return oidcClient;
	}

	const config = await getOIDCConfig();
	if (!config.enabled) {
		return null;
	}

	oidcClient = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
	return oidcClient;
}

// Legacy exports for backward compatibility - these will be lazy-loaded
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
