import fs from 'node:fs/promises';
import path from 'node:path';
import proper from 'proper-lockfile';
import type { Settings, OidcConfig } from '$lib/types/settings.type';
import { encrypt, decrypt } from './encryption-service';
import { SETTINGS_DIR, STACKS_DIR, ensureDirectory } from './paths-service';
import { getSettingsFromDb, saveSettingsToDb } from './database/settings-db-service';
let env: any;
try {
	env = await import('$env/static/private');
} catch (e) {
	// Fallback for tests
	env = process.env;
}

const isDev = process.env.NODE_ENV === 'development';

export const DEFAULT_SETTINGS: Settings = {
	dockerHost: isDev ? (process.platform === 'win32' ? 'npipe:////./pipe/docker_engine' : 'unix:///var/run/docker.sock') : 'unix:///var/run/docker.sock',
	autoUpdate: false,
	autoUpdateInterval: 5,
	pollingEnabled: true,
	pollingInterval: 10,
	pruneMode: 'all',
	stacksDirectory: STACKS_DIR,
	registryCredentials: [],
	templateRegistries: [],
	auth: {
		localAuthEnabled: true,
		oidcEnabled: false,
		sessionTimeout: 60,
		passwordPolicy: 'strong',
		rbacEnabled: false
	},
	maturityThresholdDays: 30
};

async function ensureSettingsDir() {
	try {
		await ensureDirectory(SETTINGS_DIR, 0o700);

		if (process.platform !== 'win32') {
			try {
				await fs.chmod(SETTINGS_DIR, 0o700);
			} catch (chmodError: unknown) {
				if (chmodError && typeof chmodError === 'object' && 'code' in chmodError && chmodError.code !== 'EINVAL' && chmodError.code !== 'ENOTSUP') {
					console.warn('Non-critical error setting permissions:', chmodError);
				}
			}
		}
	} catch (error) {
		console.error('Error ensuring settings directory with proper permissions:', error);
		throw error;
	}
}

/**
 * Create stacks directory if it doesn't exist
 */
export async function ensureStacksDirectory(): Promise<string> {
	try {
		const settings = await getSettings();
		const stacksDir = settings.stacksDirectory;

		await ensureDirectory(stacksDir);
		return stacksDir;
	} catch (err) {
		console.error('Error ensuring stacks directory:', err);
		// Fall back to default
		try {
			await ensureDirectory(STACKS_DIR);
			return STACKS_DIR;
		} catch (innerErr) {
			console.error('Failed to create default stacks directory:', innerErr);
			throw new Error('Unable to create stacks directory');
		}
	}
}

async function saveSetting(key: string, value: any): Promise<void> {
	const filePath = path.join(SETTINGS_DIR, `${key}.json`);

	await ensureDirectory(path.dirname(filePath));

	try {
		try {
			await fs.access(filePath);
		} catch {
			await fs.writeFile(filePath, '{}');
		}

		const release = await proper.lock(filePath, { retries: 5 });

		try {
			await fs.writeFile(filePath, JSON.stringify(value));
		} finally {
			await release();
		}
	} catch (error) {
		console.error(`Error saving setting ${key}:`, error);
		throw error;
	}
}

export async function getSettings(): Promise<Settings> {
	try {
		// Try to get settings from database first
		const dbSettings = await getSettingsFromDb();

		let effectiveSettings: Settings;

		if (dbSettings) {
			effectiveSettings = dbSettings;
		} else {
			// If no settings in database, use defaults
			console.log('No settings found in database, using default settings');
			effectiveSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as Settings;
		}

		// Override with environment variables if present (for OIDC config)
		const oidcClientId = env.OIDC_CLIENT_ID;
		const oidcClientSecret = env.OIDC_CLIENT_SECRET;
		const oidcRedirectUri = env.OIDC_REDIRECT_URI;
		const oidcAuthorizationEndpoint = env.OIDC_AUTHORIZATION_ENDPOINT;
		const oidcTokenEndpoint = env.OIDC_TOKEN_ENDPOINT;
		const oidcUserinfoEndpoint = env.OIDC_USERINFO_ENDPOINT;
		const oidcScopesEnv = env.OIDC_SCOPES;

		if (oidcClientId && oidcClientSecret && oidcRedirectUri && oidcAuthorizationEndpoint && oidcTokenEndpoint && oidcUserinfoEndpoint) {
			if (!effectiveSettings.auth) {
				effectiveSettings.auth = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.auth));
			}

			const oidcConfigFromEnv: OidcConfig = {
				clientId: oidcClientId,
				clientSecret: oidcClientSecret,
				redirectUri: oidcRedirectUri,
				authorizationEndpoint: oidcAuthorizationEndpoint,
				tokenEndpoint: oidcTokenEndpoint,
				userinfoEndpoint: oidcUserinfoEndpoint,
				scopes: oidcScopesEnv || effectiveSettings.auth.oidc?.scopes || DEFAULT_SETTINGS.auth.oidc?.scopes || 'openid email profile'
			};
			effectiveSettings.auth.oidc = oidcConfigFromEnv;
		}

		return effectiveSettings;
	} catch (error) {
		console.error('Error getting settings from database, falling back to defaults:', error);
		return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as Settings;
	}
}

export async function saveSettings(settings: Settings): Promise<void> {
	try {
		await saveSettingsToDb(settings);
		console.log('Settings saved to database successfully');
	} catch (error) {
		console.error('Error saving settings to database:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to save settings: ${errorMessage}`);
	}
}
