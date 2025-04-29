import fs from 'fs/promises';
import path from 'path';
import * as client from 'openid-client'; // Renamed the import to match example
import proper from 'proper-lockfile';
import { getBasePath, getSettings } from './settings-service';
import type { User } from './user-service';
import { string } from 'zod';

// OIDC configuration directory
const OIDC_DIR = path.join(getBasePath(), 'auth-providers');

export interface OidcProvider {
	id: string;
	name: string;
	issuerUrl: string;
	clientId: string;
	clientSecret: string;
	scopes: string[];
	enabled: boolean;
	// Mapping rules to extract user data from OIDC claims
	claimMappings: {
		username?: string; // Default: 'preferred_username' or 'email'
		email?: string; // Default: 'email'
		name?: string; // Default: 'name'
		roles?: string; // Default: 'groups'
	};
}

// Store configurations for each provider
let oidcConfigs: Record<string, client.Configuration> = {};
// Store code verifiers for PKCE
let codeVerifiers: Record<string, string> = {};
// Store states for additional security
let authStates: Record<string, { providerId: string; state: string }> = {};

// Ensure OIDC directory exists
async function ensureOidcDir() {
	await fs.mkdir(OIDC_DIR, { recursive: true });
}

// Get all configured OIDC providers
export async function getOidcProviders(): Promise<OidcProvider[]> {
	try {
		await ensureOidcDir();
		const files = await fs.readdir(OIDC_DIR);
		const providers: OidcProvider[] = [];

		for (const file of files) {
			if (!file.endsWith('.json')) continue;

			const providerData = await fs.readFile(path.join(OIDC_DIR, file), 'utf-8');
			const provider = JSON.parse(providerData) as OidcProvider;

			if (provider.enabled) {
				providers.push(provider);
			}
		}

		return providers;
	} catch (error) {
		console.error('Error getting OIDC providers:', error);
		return [];
	}
}

// Save OIDC provider configuration
export async function saveOidcProvider(provider: OidcProvider): Promise<OidcProvider> {
	await ensureOidcDir();

	if (!provider.id) {
		provider.id = provider.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
	}

	const filePath = path.join(OIDC_DIR, `${provider.id}.json`);

	// Create the file if it doesn't exist
	try {
		await fs.access(filePath);
	} catch {
		await fs.writeFile(filePath, '{}');
	}

	// Acquire a lock
	const release = await proper.lock(filePath, { retries: 5 });

	try {
		await fs.writeFile(filePath, JSON.stringify(provider, null, 2));
	} finally {
		// Release the lock
		await release();
	}

	// Reset cached config for this provider
	if (provider.id in oidcConfigs) {
		delete oidcConfigs[provider.id];
	}

	return provider;
}

// Get or initialize OIDC configuration for a provider
async function getProviderConfig(providerId: string): Promise<client.Configuration | null> {
	try {
		// Return from cache if available
		if (oidcConfigs[providerId]) {
			return oidcConfigs[providerId];
		}

		// Get the provider configuration
		const providers = await getOidcProviders();
		const provider = providers.find((p) => p.id === providerId && p.enabled);

		if (!provider) {
			return null;
		}

		// Discover endpoints and create configuration
		const config = await client.discovery(new URL(provider.issuerUrl), provider.clientId, provider.clientSecret);

		// Cache the configuration
		oidcConfigs[providerId] = config;

		return config;
	} catch (error) {
		console.error(`Error initializing OIDC configuration for ${providerId}:`, error);
		return null;
	}
}

// Create an authorization URL for a provider
export async function createAuthorizationUrl(providerId: string): Promise<{ url: string; state: string } | null> {
	try {
		const config = await getProviderConfig(providerId);
		if (!config) {
			return null;
		}

		const providers = await getOidcProviders();
		const provider = providers.find((p) => p.id === providerId);

		if (!provider) {
			return null;
		}

		// Get redirect URI
		const redirect_uri = `${process.env.PUBLIC_URL || 'http://localhost:5173'}/auth/callback/${provider.id}`;

		// Generate PKCE values
		const code_verifier = client.randomPKCECodeVerifier();
		const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);

		// Generate state
		const state = client.randomState();

		// Store values for later verification
		codeVerifiers[state] = code_verifier;
		authStates[state] = { providerId, state };

		// Prepare parameters
		const parameters: Record<string, string> = {
			redirect_uri,
			scope: provider.scopes.join(' ') || 'openid email profile',
			code_challenge,
			code_challenge_method: 'S256',
			state
		};

		// Build the authorization URL
		const redirectTo = client.buildAuthorizationUrl(config, parameters);

		return { url: redirectTo.href, state };
	} catch (error) {
		console.error(`Error creating authorization URL for ${providerId}:`, error);
		return null;
	}
}

// Process an authorization callback
export async function handleOidcCallback(callbackParams: Record<string, string>): Promise<{ user: User; claims: Record<string, any> } | null> {
	try {
		const state = callbackParams.state;

		if (!state || !authStates[state] || !codeVerifiers[state]) {
			console.error('Invalid or missing state parameter');
			return null;
		}

		const { providerId } = authStates[state];
		const code_verifier = codeVerifiers[state];

		// Get configuration
		const config = await getProviderConfig(providerId);
		if (!config) {
			return null;
		}

		// Get redirect URI that includes the callback parameters
		const getCurrentUrl = () => {
			const baseUrl = `${process.env.PUBLIC_URL || 'http://localhost:5173'}/auth/callback/${providerId}`;
			const url = new URL(baseUrl);

			// Add all callback parameters to the URL
			Object.entries(callbackParams).forEach(([key, value]) => {
				url.searchParams.append(key, value);
			});

			return url;
		};

		// Exchange authorization code for tokens using the approach from the example
		const tokens = await client.authorizationCodeGrant(config, getCurrentUrl(), {
			pkceCodeVerifier: code_verifier,
			expectedState: state
		});

		// Clean up stored values
		delete codeVerifiers[state];
		delete authStates[state];

		// Extract claims from ID token
		const claims = tokens.claims;

		// Get the provider for claim mapping
		const providers = await getOidcProviders();
		const provider = providers.find((p) => p.id === providerId);

		if (!provider) {
			return null;
		}

		// Map the claims to a user object
		const mapping = provider.claimMappings || {};
		const usernameKey = mapping.username || 'preferred_username' || 'email';
		const emailKey = mapping.email || 'email';
		const nameKey = mapping.name || 'name';
		const rolesKey = mapping.roles || 'groups';

		// Extract basic user data
		const username = claims[usernameKey] || claims.sub;

		// Create a user object
		const user: User = {
			id: `oidc:${providerId}:${claims.sub}`, // Create a unique ID based on the provider and subject
			username,
			passwordHash: '', // No password for OIDC users
			displayName: claims[nameKey] || username,
			email: claims[emailKey],
			roles: Array.isArray(claims[rolesKey]) ? claims[rolesKey] : [],
			mfaEnabled: false,
			createdAt: new Date().toISOString(),
			lastLogin: new Date().toISOString()
		};

		return { user, claims };
	} catch (error) {
		console.error(`Error handling OIDC callback:`, error);
		return null;
	}
}
