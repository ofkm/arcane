import { OAuth2Client } from 'arctic';
import { env } from '$env/dynamic/private'; // For server-side env vars

// These should be set in your .env file
const OIDC_CLIENT_ID = env.OIDC_CLIENT_ID;
const OIDC_CLIENT_SECRET = env.OIDC_CLIENT_SECRET;
const OIDC_REDIRECT_URI = env.OIDC_REDIRECT_URI; // e.g., 'http://localhost:5173/auth/oidc/callback'

if (!OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET || !OIDC_REDIRECT_URI) {
	throw new Error('OIDC client environment variables are not set.');
}

export const oidcClient = new OAuth2Client(OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI);

// You'll also need these from your OIDC provider, set them in .env
export const OIDC_AUTHORIZATION_ENDPOINT = env.OIDC_AUTHORIZATION_ENDPOINT;
export const OIDC_TOKEN_ENDPOINT = env.OIDC_TOKEN_ENDPOINT;
export const OIDC_USERINFO_ENDPOINT = env.OIDC_USERINFO_ENDPOINT;
export const OIDC_SCOPES = (env.OIDC_SCOPES || 'openid email profile').split(' ');

if (!OIDC_AUTHORIZATION_ENDPOINT || !OIDC_TOKEN_ENDPOINT) {
	console.warn('OIDC_AUTHORIZATION_ENDPOINT or OIDC_TOKEN_ENDPOINT is not set. OIDC flow will likely fail.');
}
