import { OAuth2Client } from 'arctic';
import { env } from '$env/dynamic/private';
import { getSettings } from './settings-service';

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

export const OIDC_SCOPES = resolvedScopesString.split(' ').filter((s) => s.trim() !== '');

// Export the resolved configuration values
export const OIDC_CLIENT_ID = resolvedClientId;
export const OIDC_CLIENT_SECRET = resolvedClientSecret;
export const OIDC_REDIRECT_URI = resolvedRedirectUri;
export const OIDC_AUTHORIZATION_ENDPOINT = resolvedAuthEndpoint;
export const OIDC_TOKEN_ENDPOINT = resolvedTokenEndpoint;
export const OIDC_USERINFO_ENDPOINT = resolvedUserInfoEndpoint;

// Critical configuration check using the resolved values
if (!OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET || !OIDC_REDIRECT_URI) {
	const missing: string[] = [];
	if (!OIDC_CLIENT_ID) missing.push('Client ID');
	if (!OIDC_CLIENT_SECRET) missing.push('Client Secret');
	if (!OIDC_REDIRECT_URI) missing.push('Redirect URI');
	throw new Error(`Critical OIDC configuration (${missing.join(', ')}) not found in environment variables or application settings.`);
}

export const oidcClient = new OAuth2Client(OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI);

if (!OIDC_AUTHORIZATION_ENDPOINT || !OIDC_TOKEN_ENDPOINT) {
	console.warn('OIDC Authorization or Token Endpoint is not set (from environment or application settings). OIDC flow will likely fail.');
}
