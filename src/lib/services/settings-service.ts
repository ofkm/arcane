import fs from 'node:fs/promises';
import path from 'node:path';
import proper from 'proper-lockfile';
import type { Settings, OidcConfig } from '$lib/types/settings.type';
import { encrypt, decrypt } from './encryption-service';
import { SETTINGS_DIR, STACKS_DIR, ensureDirectory } from './paths-service';
import { db, initializeDatabase } from '../database';
import { settings as settingsTable, authSettings, oidcConfig, registryCredentials, templateRegistries } from '../database/schema/settings';
import { eq } from 'drizzle-orm';
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
	let effectiveSettings: Settings;

	try {
		// First try to get settings from database
		await initializeDatabase();

		const dbSettings = await db.select().from(settingsTable).limit(1);

		if (dbSettings.length > 0) {
			// Settings found in database, construct the Settings object
			const mainSettings = dbSettings[0];

			effectiveSettings = {
				dockerHost: mainSettings.dockerHost,
				autoUpdate: mainSettings.autoUpdate,
				autoUpdateInterval: mainSettings.autoUpdateInterval,
				pollingEnabled: mainSettings.pollingEnabled,
				pollingInterval: mainSettings.pollingInterval,
				pruneMode: mainSettings.pruneMode as 'all' | 'dangling' | undefined,
				stacksDirectory: mainSettings.stacksDirectory,
				maturityThresholdDays: mainSettings.maturityThresholdDays,
				baseServerUrl: mainSettings.baseServerUrl || undefined,
				onboarding: mainSettings.onboarding
					? {
							completed: true,
							completedAt: mainSettings.createdAt || undefined
						}
					: undefined,
				auth: DEFAULT_SETTINGS.auth, // Default auth settings
				registryCredentials: [],
				templateRegistries: []
			};

			// Get auth settings
			const dbAuthSettings = await db.select().from(authSettings).where(eq(authSettings.settingsId, mainSettings.id));
			if (dbAuthSettings.length > 0) {
				const auth = dbAuthSettings[0];

				// Map database password policy values to Settings type values
				let mappedPasswordPolicy: 'basic' | 'standard' | 'strong' = 'strong';
				switch (auth.passwordPolicy) {
					case 'weak':
						mappedPasswordPolicy = 'basic';
						break;
					case 'medium':
						mappedPasswordPolicy = 'standard';
						break;
					case 'strong':
						mappedPasswordPolicy = 'strong';
						break;
					default:
						mappedPasswordPolicy = 'strong';
				}

				effectiveSettings.auth = {
					localAuthEnabled: auth.localAuthEnabled,
					oidcEnabled: auth.oidcEnabled,
					sessionTimeout: auth.sessionTimeout,
					passwordPolicy: mappedPasswordPolicy,
					rbacEnabled: auth.rbacEnabled
				};

				// Get OIDC config if it exists
				const dbOidcConfig = await db.select().from(oidcConfig).where(eq(oidcConfig.authSettingsId, auth.id));
				if (dbOidcConfig.length > 0) {
					const oidc = dbOidcConfig[0];
					// Handle Buffer type for encrypted clientSecret
					const clientSecretBuffer = oidc.clientSecret as Buffer;
					const decryptedSecret = await decrypt(clientSecretBuffer.toString('utf8'));
					effectiveSettings.auth.oidc = {
						clientId: oidc.clientId,
						clientSecret: decryptedSecret,
						redirectUri: oidc.redirectUri,
						authorizationEndpoint: oidc.authorizationEndpoint,
						tokenEndpoint: oidc.tokenEndpoint,
						userinfoEndpoint: oidc.userinfoEndpoint,
						scopes: oidc.scopes
					};
				}
			}

			// Get registry credentials
			const dbRegistryCredentials = await db.select().from(registryCredentials).where(eq(registryCredentials.settingsId, mainSettings.id));
			effectiveSettings.registryCredentials = await Promise.all(
				dbRegistryCredentials.map(async (cred) => {
					// Handle Buffer type for encrypted password
					const passwordBuffer = cred.password as Buffer;
					const decryptedPassword = await decrypt(passwordBuffer.toString('utf8'));
					return {
						url: cred.registryUrl,
						username: cred.username,
						password: decryptedPassword
					};
				})
			);

			// Get template registries
			const dbTemplateRegistries = await db.select().from(templateRegistries).where(eq(templateRegistries.settingsId, mainSettings.id));
			effectiveSettings.templateRegistries = dbTemplateRegistries.map((reg) => ({
				url: reg.url,
				name: reg.name,
				enabled: reg.enabled,
				last_updated: reg.updatedAt || undefined
			}));

			console.log('📊 Settings loaded from database');
		} else {
			// No settings in database, fall back to file-based loading
			console.log('⚠️ No settings in database, falling back to file-based loading');
			effectiveSettings = await getSettingsFromFile();
		}
	} catch (dbError) {
		console.warn('Database error, falling back to file-based settings:', dbError);
		effectiveSettings = await getSettingsFromFile();
	}

	// Apply environment variable OIDC overrides
	effectiveSettings = applyOidcEnvironmentOverrides(effectiveSettings);

	return effectiveSettings;
}

async function getSettingsFromFile(): Promise<Settings> {
	let effectiveSettings: Settings;

	try {
		await ensureSettingsDir();
		const filePath = path.join(SETTINGS_DIR, 'settings.dat');

		try {
			await fs.access(filePath);
			const rawData = await fs.readFile(filePath, 'utf8');
			const settingsFromFile = JSON.parse(rawData);

			const baseSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as Settings;

			if (settingsFromFile._encrypted) {
				const { _encrypted, ...nonSensitiveSettings } = settingsFromFile;
				const decryptedData = await decrypt(_encrypted);

				effectiveSettings = {
					...baseSettings,
					...nonSensitiveSettings,
					auth: {
						...baseSettings.auth,
						...(nonSensitiveSettings.auth || {}),
						...(decryptedData.auth || {})
					},
					registryCredentials: decryptedData.registryCredentials || baseSettings.registryCredentials,
					templateRegistries: nonSensitiveSettings.templateRegistries || baseSettings.templateRegistries,
					onboarding: nonSensitiveSettings.onboarding || baseSettings.onboarding,
					baseServerUrl: nonSensitiveSettings.baseServerUrl || baseSettings.baseServerUrl
				};
			} else {
				effectiveSettings = {
					...baseSettings,
					...settingsFromFile,
					auth: {
						...baseSettings.auth,
						...(settingsFromFile.auth || {})
					},
					registryCredentials: settingsFromFile.registryCredentials || baseSettings.registryCredentials,
					templateRegistries: settingsFromFile.templateRegistries || baseSettings.templateRegistries,
					onboarding: settingsFromFile.onboarding || baseSettings.onboarding,
					baseServerUrl: settingsFromFile.baseServerUrl || baseSettings.baseServerUrl
				};
			}
		} catch (fileError) {
			console.warn('Settings file not found or unreadable, using default settings.', fileError instanceof Error ? fileError.message : fileError);
			effectiveSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as Settings;
		}
	} catch (dirError) {
		console.error('Critical error ensuring settings directory or reading settings file:', dirError);
		effectiveSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as Settings;
	}

	return effectiveSettings;
}

function applyOidcEnvironmentOverrides(settings: Settings): Settings {
	const oidcClientId = env.OIDC_CLIENT_ID;
	const oidcClientSecret = env.OIDC_CLIENT_SECRET;
	const oidcRedirectUri = env.OIDC_REDIRECT_URI;
	const oidcAuthorizationEndpoint = env.OIDC_AUTHORIZATION_ENDPOINT;
	const oidcTokenEndpoint = env.OIDC_TOKEN_ENDPOINT;
	const oidcUserinfoEndpoint = env.OIDC_USERINFO_ENDPOINT;
	const oidcScopesEnv = env.OIDC_SCOPES;

	if (oidcClientId && oidcClientSecret && oidcRedirectUri && oidcAuthorizationEndpoint && oidcTokenEndpoint && oidcUserinfoEndpoint) {
		if (!settings.auth) {
			settings.auth = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.auth));
		}

		const oidcConfigFromEnv: OidcConfig = {
			clientId: oidcClientId,
			clientSecret: oidcClientSecret,
			redirectUri: oidcRedirectUri,
			authorizationEndpoint: oidcAuthorizationEndpoint,
			tokenEndpoint: oidcTokenEndpoint,
			userinfoEndpoint: oidcUserinfoEndpoint,
			scopes: oidcScopesEnv || settings.auth.oidc?.scopes || DEFAULT_SETTINGS.auth.oidc?.scopes || 'openid email profile'
		};
		settings.auth.oidc = oidcConfigFromEnv;
	}

	return settings;
}

export async function saveSettings(settings: Settings): Promise<void> {
	try {
		// Save to database first
		await initializeDatabase();

		// Map Settings password policy values to database values
		let dbPasswordPolicy: 'weak' | 'medium' | 'strong' = 'strong';
		if (settings.auth?.passwordPolicy) {
			switch (settings.auth.passwordPolicy) {
				case 'basic':
					dbPasswordPolicy = 'weak';
					break;
				case 'standard':
					dbPasswordPolicy = 'medium';
					break;
				case 'strong':
					dbPasswordPolicy = 'strong';
					break;
				default:
					dbPasswordPolicy = 'strong';
			}
		}

		// Check if settings already exist
		const existingSettings = await db.select().from(settingsTable).limit(1);

		if (existingSettings.length > 0) {
			// Update existing settings
			const settingsId = existingSettings[0].id;

			// Update main settings
			await db
				.update(settingsTable)
				.set({
					dockerHost: settings.dockerHost,
					autoUpdate: settings.autoUpdate,
					autoUpdateInterval: settings.autoUpdateInterval,
					pollingEnabled: settings.pollingEnabled,
					pollingInterval: settings.pollingInterval,
					pruneMode: (settings.pruneMode === 'dangling' ? 'all' : settings.pruneMode) || 'all',
					stacksDirectory: settings.stacksDirectory,
					maturityThresholdDays: settings.maturityThresholdDays,
					baseServerUrl: settings.baseServerUrl,
					onboarding: settings.onboarding?.completed || false,
					updatedAt: new Date().toISOString()
				})
				.where(eq(settingsTable.id, settingsId));

			// Update auth settings
			const existingAuthSettings = await db.select().from(authSettings).where(eq(authSettings.settingsId, settingsId));

			if (existingAuthSettings.length > 0) {
				const authSettingsId = existingAuthSettings[0].id;

				await db
					.update(authSettings)
					.set({
						localAuthEnabled: settings.auth?.localAuthEnabled || true,
						oidcEnabled: settings.auth?.oidcEnabled || false,
						sessionTimeout: settings.auth?.sessionTimeout || 60,
						passwordPolicy: dbPasswordPolicy,
						rbacEnabled: settings.auth?.rbacEnabled || false,
						updatedAt: new Date().toISOString()
					})
					.where(eq(authSettings.id, authSettingsId));

				// Handle OIDC config
				if (settings.auth?.oidc) {
					const existingOidcConfig = await db.select().from(oidcConfig).where(eq(oidcConfig.authSettingsId, authSettingsId));
					const encryptedSecret = await encrypt(settings.auth.oidc.clientSecret);

					if (existingOidcConfig.length > 0) {
						await db
							.update(oidcConfig)
							.set({
								clientId: settings.auth.oidc.clientId,
								clientSecret: Buffer.from(encryptedSecret, 'utf8'),
								redirectUri: settings.auth.oidc.redirectUri,
								authorizationEndpoint: settings.auth.oidc.authorizationEndpoint,
								tokenEndpoint: settings.auth.oidc.tokenEndpoint,
								userinfoEndpoint: settings.auth.oidc.userinfoEndpoint,
								scopes: settings.auth.oidc.scopes,
								updatedAt: new Date().toISOString()
							})
							.where(eq(oidcConfig.id, existingOidcConfig[0].id));
					} else {
						await db.insert(oidcConfig).values({
							authSettingsId: authSettingsId,
							clientId: settings.auth.oidc.clientId,
							clientSecret: Buffer.from(encryptedSecret, 'utf8'),
							redirectUri: settings.auth.oidc.redirectUri,
							authorizationEndpoint: settings.auth.oidc.authorizationEndpoint,
							tokenEndpoint: settings.auth.oidc.tokenEndpoint,
							userinfoEndpoint: settings.auth.oidc.userinfoEndpoint,
							scopes: settings.auth.oidc.scopes
						});
					}
				}
			} else {
				// Create new auth settings
				const [authSettingsResult] = await db
					.insert(authSettings)
					.values({
						settingsId: settingsId,
						localAuthEnabled: settings.auth?.localAuthEnabled || true,
						oidcEnabled: settings.auth?.oidcEnabled || false,
						sessionTimeout: settings.auth?.sessionTimeout || 60,
						passwordPolicy: dbPasswordPolicy,
						rbacEnabled: settings.auth?.rbacEnabled || false
					})
					.returning({ id: authSettings.id });

				// Handle OIDC config
				if (settings.auth?.oidc) {
					const encryptedSecret = await encrypt(settings.auth.oidc.clientSecret);
					await db.insert(oidcConfig).values({
						authSettingsId: authSettingsResult.id,
						clientId: settings.auth.oidc.clientId,
						clientSecret: Buffer.from(encryptedSecret, 'utf8'),
						redirectUri: settings.auth.oidc.redirectUri,
						authorizationEndpoint: settings.auth.oidc.authorizationEndpoint,
						tokenEndpoint: settings.auth.oidc.tokenEndpoint,
						userinfoEndpoint: settings.auth.oidc.userinfoEndpoint,
						scopes: settings.auth.oidc.scopes
					});
				}
			}

			// Handle registry credentials - delete existing and recreate
			await db.delete(registryCredentials).where(eq(registryCredentials.settingsId, settingsId));
			if (settings.registryCredentials && settings.registryCredentials.length > 0) {
				for (const cred of settings.registryCredentials) {
					const encryptedPassword = await encrypt(cred.password);
					await db.insert(registryCredentials).values({
						settingsId: settingsId,
						registryUrl: cred.url,
						username: cred.username,
						password: Buffer.from(encryptedPassword, 'utf8')
					});
				}
			}

			// Handle template registries - delete existing and recreate
			await db.delete(templateRegistries).where(eq(templateRegistries.settingsId, settingsId));
			if (settings.templateRegistries && settings.templateRegistries.length > 0) {
				for (const registry of settings.templateRegistries) {
					await db.insert(templateRegistries).values({
						settingsId: settingsId,
						name: registry.name,
						url: registry.url,
						enabled: registry.enabled
					});
				}
			}
		} else {
			// Create new settings
			const [settingsResult] = await db
				.insert(settingsTable)
				.values({
					dockerHost: settings.dockerHost,
					autoUpdate: settings.autoUpdate,
					autoUpdateInterval: settings.autoUpdateInterval,
					pollingEnabled: settings.pollingEnabled,
					pollingInterval: settings.pollingInterval,
					pruneMode: (settings.pruneMode === 'dangling' ? 'all' : settings.pruneMode) || 'all',
					stacksDirectory: settings.stacksDirectory,
					maturityThresholdDays: settings.maturityThresholdDays,
					baseServerUrl: settings.baseServerUrl,
					onboarding: settings.onboarding?.completed || false
				})
				.returning({ id: settingsTable.id });

			const settingsId = settingsResult.id;

			// Create auth settings
			const [authSettingsResult] = await db
				.insert(authSettings)
				.values({
					settingsId: settingsId,
					localAuthEnabled: settings.auth?.localAuthEnabled || true,
					oidcEnabled: settings.auth?.oidcEnabled || false,
					sessionTimeout: settings.auth?.sessionTimeout || 60,
					passwordPolicy: dbPasswordPolicy,
					rbacEnabled: settings.auth?.rbacEnabled || false
				})
				.returning({ id: authSettings.id });

			// Handle OIDC config
			if (settings.auth?.oidc) {
				const encryptedSecret = await encrypt(settings.auth.oidc.clientSecret);
				await db.insert(oidcConfig).values({
					authSettingsId: authSettingsResult.id,
					clientId: settings.auth.oidc.clientId,
					clientSecret: Buffer.from(encryptedSecret, 'utf8'),
					redirectUri: settings.auth.oidc.redirectUri,
					authorizationEndpoint: settings.auth.oidc.authorizationEndpoint,
					tokenEndpoint: settings.auth.oidc.tokenEndpoint,
					userinfoEndpoint: settings.auth.oidc.userinfoEndpoint,
					scopes: settings.auth.oidc.scopes
				});
			}

			// Handle registry credentials
			if (settings.registryCredentials && settings.registryCredentials.length > 0) {
				for (const cred of settings.registryCredentials) {
					const encryptedPassword = await encrypt(cred.password);
					await db.insert(registryCredentials).values({
						settingsId: settingsId,
						registryUrl: cred.url,
						username: cred.username,
						password: Buffer.from(encryptedPassword, 'utf8')
					});
				}
			}

			// Handle template registries
			if (settings.templateRegistries && settings.templateRegistries.length > 0) {
				for (const registry of settings.templateRegistries) {
					await db.insert(templateRegistries).values({
						settingsId: settingsId,
						name: registry.name,
						url: registry.url,
						enabled: registry.enabled
					});
				}
			}
		}

		console.log('💾 Settings saved to database');

		// Also save to file as fallback
		await saveSettingsToFile(settings);
	} catch (dbError) {
		console.warn('Database error while saving settings, falling back to file only:', dbError);
		await saveSettingsToFile(settings);
	}
}

async function saveSettingsToFile(settings: Settings): Promise<void> {
	await ensureSettingsDir();
	const filePath = path.join(SETTINGS_DIR, 'settings.dat');

	try {
		await fs.access(filePath);
	} catch {
		await fs.writeFile(filePath, '{}', { mode: 0o600 });
	}

	let release;
	try {
		release = await proper.lock(filePath, {
			retries: 5,
			stale: 10000,
			onCompromised: (err) => {
				console.error('Lock was compromised:', err);
			}
		});

		const { auth, registryCredentials, ...nonSensitiveSettings } = settings;

		const dataToSave = {
			...nonSensitiveSettings,
			_encrypted: await encrypt({ auth: auth || DEFAULT_SETTINGS.auth, registryCredentials: registryCredentials || [] })
		};

		await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), { mode: 0o600 });
	} catch (error) {
		console.error('Error saving settings with lock:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to save settings: ${errorMessage}`);
	} finally {
		if (release) {
			try {
				await release();
			} catch (releaseError) {
				console.error('Error releasing lock:', releaseError);
			}
		}
	}
}
