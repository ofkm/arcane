import { db, dbManager, initializeDatabase } from '$lib/database';
import { eq, and, desc, asc } from 'drizzle-orm';
import { settings, authSettings, oidcConfig, registryCredentials, templateRegistries } from '$lib/database/schema/settings';
import type { Settings, AuthSettings, OidcConfig, RegistryCredential, TemplateRegistryConfig } from '$lib/types/settings.type';
import { encrypt, decrypt } from '$lib/services/encryption-service';

export class DatabaseSettingsService {
	private initialized = false;

	async init() {
		if (!this.initialized) {
			await initializeDatabase();
			this.initialized = true;
		}
	}

	// Settings methods
	async getSettings(): Promise<Settings | null> {
		await this.init();

		const settingsRow = await db.select().from(settings).limit(1);
		if (settingsRow.length === 0) return null;

		const setting = settingsRow[0];

		// Get related data
		const [authRow, oidcRow, registries, credentials] = await Promise.all([
			db.select().from(authSettings).where(eq(authSettings.settingsId, setting.id)).limit(1),
			db.select().from(oidcConfig).where(eq(oidcConfig.authSettingsId, setting.id)).limit(1),
			db.select().from(templateRegistries).where(eq(templateRegistries.settingsId, setting.id)),
			db.select().from(registryCredentials).where(eq(registryCredentials.settingsId, setting.id))
		]);

		const auth = authRow[0];
		const oidc = oidcRow[0];

		return {
			dockerHost: setting.dockerHost,
			autoUpdate: setting.autoUpdate,
			autoUpdateInterval: setting.autoUpdateInterval,
			pollingEnabled: setting.pollingEnabled,
			pollingInterval: setting.pollingInterval,
			pruneMode: setting.pruneMode as 'all' | 'dangling' | undefined,
			stacksDirectory: setting.stacksDirectory,
			maturityThresholdDays: setting.maturityThresholdDays,
			baseServerUrl: setting.baseServerUrl || undefined,
			onboarding: setting.onboarding
				? {
						completed: setting.onboarding,
						completedAt: setting.createdAt || undefined
					}
				: undefined,
			...(auth && {
				auth: {
					localAuthEnabled: auth.localAuthEnabled,
					oidcEnabled: auth.oidcEnabled,
					sessionTimeout: auth.sessionTimeout,
					passwordPolicy: auth.passwordPolicy === 'weak' ? 'basic' : auth.passwordPolicy === 'medium' ? 'standard' : 'strong',
					rbacEnabled: auth.rbacEnabled,
					oidc: oidc
						? {
								clientId: oidc.clientId,
								clientSecret: await decrypt((oidc.clientSecret as Buffer).toString('utf8')),
								redirectUri: oidc.redirectUri,
								authorizationEndpoint: oidc.authorizationEndpoint,
								tokenEndpoint: oidc.tokenEndpoint,
								userinfoEndpoint: oidc.userinfoEndpoint,
								scopes: oidc.scopes
							}
						: undefined
				}
			}),
			registryCredentials: await Promise.all(
				credentials.map(async (cred) => ({
					url: cred.registryUrl,
					username: cred.username,
					password: await decrypt((cred.password as Buffer).toString('utf8'))
				}))
			),
			templateRegistries: registries.map((reg) => ({
				name: reg.name,
				url: reg.url,
				enabled: reg.enabled,
				last_updated: reg.updatedAt || undefined
			}))
		};
	}

	async saveSettings(settingsData: Settings): Promise<void> {
		await this.init();

		// Insert or update main settings
		const [settingsRow] = await db.select().from(settings).limit(1);

		let settingsId: number;
		if (settingsRow) {
			await db
				.update(settings)
				.set({
					dockerHost: settingsData.dockerHost,
					autoUpdate: settingsData.autoUpdate,
					autoUpdateInterval: settingsData.autoUpdateInterval,
					pollingEnabled: settingsData.pollingEnabled,
					pollingInterval: settingsData.pollingInterval,
					pruneMode: (settingsData.pruneMode === 'dangling' ? 'all' : settingsData.pruneMode) || 'all',
					stacksDirectory: settingsData.stacksDirectory,
					maturityThresholdDays: settingsData.maturityThresholdDays,
					baseServerUrl: settingsData.baseServerUrl,
					onboarding: settingsData.onboarding?.completed || false,
					updatedAt: new Date().toISOString()
				})
				.where(eq(settings.id, settingsRow.id));
			settingsId = settingsRow.id;
		} else {
			const [newSettings] = await db
				.insert(settings)
				.values({
					dockerHost: settingsData.dockerHost,
					autoUpdate: settingsData.autoUpdate,
					autoUpdateInterval: settingsData.autoUpdateInterval,
					pollingEnabled: settingsData.pollingEnabled,
					pollingInterval: settingsData.pollingInterval,
					pruneMode: (settingsData.pruneMode === 'dangling' ? 'all' : settingsData.pruneMode) || 'all',
					stacksDirectory: settingsData.stacksDirectory,
					maturityThresholdDays: settingsData.maturityThresholdDays,
					baseServerUrl: settingsData.baseServerUrl,
					onboarding: settingsData.onboarding?.completed || false
				})
				.returning({ id: settings.id });
			settingsId = newSettings.id;
		}

		// Handle auth settings if provided
		if (settingsData.auth) {
			const [authRow] = await db.select().from(authSettings).where(eq(authSettings.settingsId, settingsId)).limit(1);

			// Map Settings password policy to database values
			let dbPasswordPolicy: 'weak' | 'medium' | 'strong' = 'strong';
			switch (settingsData.auth.passwordPolicy) {
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

			let authId: number;
			if (authRow) {
				await db
					.update(authSettings)
					.set({
						localAuthEnabled: settingsData.auth.localAuthEnabled,
						oidcEnabled: settingsData.auth.oidcEnabled,
						sessionTimeout: settingsData.auth.sessionTimeout,
						passwordPolicy: dbPasswordPolicy,
						rbacEnabled: settingsData.auth.rbacEnabled,
						updatedAt: new Date().toISOString()
					})
					.where(eq(authSettings.id, authRow.id));
				authId = authRow.id;
			} else {
				const [newAuth] = await db
					.insert(authSettings)
					.values({
						settingsId,
						localAuthEnabled: settingsData.auth.localAuthEnabled,
						oidcEnabled: settingsData.auth.oidcEnabled,
						sessionTimeout: settingsData.auth.sessionTimeout,
						passwordPolicy: dbPasswordPolicy,
						rbacEnabled: settingsData.auth.rbacEnabled
					})
					.returning({ id: authSettings.id });
				authId = newAuth.id;
			}

			// Handle OIDC config if provided
			if (settingsData.auth.oidc) {
				const [oidcRow] = await db.select().from(oidcConfig).where(eq(oidcConfig.authSettingsId, authId)).limit(1);

				const encryptedSecret = await encrypt(settingsData.auth.oidc.clientSecret);

				if (oidcRow) {
					await db
						.update(oidcConfig)
						.set({
							clientId: settingsData.auth.oidc.clientId,
							clientSecret: Buffer.from(encryptedSecret, 'utf8'),
							redirectUri: settingsData.auth.oidc.redirectUri,
							authorizationEndpoint: settingsData.auth.oidc.authorizationEndpoint,
							tokenEndpoint: settingsData.auth.oidc.tokenEndpoint,
							userinfoEndpoint: settingsData.auth.oidc.userinfoEndpoint,
							scopes: settingsData.auth.oidc.scopes,
							updatedAt: new Date().toISOString()
						})
						.where(eq(oidcConfig.id, oidcRow.id));
				} else {
					await db.insert(oidcConfig).values({
						authSettingsId: authId,
						clientId: settingsData.auth.oidc.clientId,
						clientSecret: Buffer.from(encryptedSecret, 'utf8'),
						redirectUri: settingsData.auth.oidc.redirectUri,
						authorizationEndpoint: settingsData.auth.oidc.authorizationEndpoint,
						tokenEndpoint: settingsData.auth.oidc.tokenEndpoint,
						userinfoEndpoint: settingsData.auth.oidc.userinfoEndpoint,
						scopes: settingsData.auth.oidc.scopes
					});
				}
			}
		}

		// Handle registry credentials
		await db.delete(registryCredentials).where(eq(registryCredentials.settingsId, settingsId));
		if (settingsData.registryCredentials && settingsData.registryCredentials.length > 0) {
			const credentialsData = await Promise.all(
				settingsData.registryCredentials.map(async (cred) => ({
					settingsId,
					registryUrl: cred.url,
					username: cred.username,
					password: Buffer.from(await encrypt(cred.password), 'utf8')
				}))
			);
			await db.insert(registryCredentials).values(credentialsData);
		}

		// Handle template registries
		await db.delete(templateRegistries).where(eq(templateRegistries.settingsId, settingsId));
		if (settingsData.templateRegistries && settingsData.templateRegistries.length > 0) {
			await db.insert(templateRegistries).values(
				settingsData.templateRegistries.map((reg) => ({
					settingsId,
					name: reg.name,
					url: reg.url,
					enabled: reg.enabled
				}))
			);
		}
	}

	async healthCheck(): Promise<boolean> {
		return await dbManager.healthCheck();
	}
}

// Export singleton instance
export const databaseSettingsService = new DatabaseSettingsService();
