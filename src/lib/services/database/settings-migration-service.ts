import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { db, initializeDatabase } from '../../database';
import { settings, authSettings, oidcConfig, registryCredentials, templateRegistries } from '../../database/schema/settings';
import { decrypt, encrypt } from '../encryption-service';
import type { Settings } from '$lib/types/settings.type';

export class SettingsMigrationService {
	private dataPath = './data';

	async migrateSettings(): Promise<{ success: boolean; error?: string }> {
		try {
			console.log('🔄 Starting settings migration from file-based storage to database...');

			// Initialize database first
			await initializeDatabase();
			console.log('✅ Database initialized');

			// Check if settings already exist in database
			const existingSettings = await db.select().from(settings).limit(1);
			if (existingSettings.length > 0) {
				console.log('⚠️ Settings already exist in database, skipping migration');
				return { success: true };
			}

			// Read settings from file
			const settingsFile = join(this.dataPath, 'settings', 'settings.dat');
			if (!existsSync(settingsFile)) {
				console.log('⚠️ No settings file found, creating default settings in database');
				await this.createDefaultSettings();
				return { success: true };
			}

			console.log('📖 Reading settings from file...');
			const rawData = readFileSync(settingsFile, 'utf8');
			const settingsFromFile = JSON.parse(rawData);

			// Handle encrypted data
			let decryptedData: any = {};
			if (settingsFromFile._encrypted) {
				console.log('🔓 Decrypting sensitive settings...');
				const decryptedString = await decrypt(settingsFromFile._encrypted);
				decryptedData = JSON.parse(decryptedString);
			}

			// Merge non-sensitive and decrypted data
			const { _encrypted, ...nonSensitiveSettings } = settingsFromFile;
			const settingsData: Settings = {
				...nonSensitiveSettings,
				auth: decryptedData.auth || {},
				registryCredentials: decryptedData.registryCredentials || []
			};

			console.log('💾 Migrating settings to database...');

			// Insert main settings
			const [newSettings] = await db
				.insert(settings)
				.values({
					dockerHost: settingsData.dockerHost || 'unix:///var/run/docker.sock',
					autoUpdate: settingsData.autoUpdate || false,
					autoUpdateInterval: settingsData.autoUpdateInterval || 5,
					pollingEnabled: settingsData.pollingEnabled ?? true,
					pollingInterval: settingsData.pollingInterval || 10,
					pruneMode: settingsData.pruneMode === 'dangling' ? 'all' : settingsData.pruneMode || 'all',
					stacksDirectory: settingsData.stacksDirectory || './data/stacks',
					maturityThresholdDays: settingsData.maturityThresholdDays || 30,
					baseServerUrl: settingsData.baseServerUrl,
					onboarding: settingsData.onboarding?.completed ?? false
				})
				.returning({ id: settings.id });

			const settingsId = newSettings.id;
			console.log(`✅ Settings migrated with ID: ${settingsId}`);

			// Migrate auth settings if they exist
			if (settingsData.auth) {
				console.log('🔐 Migrating auth settings...');

				// Map password policy from Settings type to database type
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

				const [newAuth] = await db
					.insert(authSettings)
					.values({
						settingsId,
						localAuthEnabled: settingsData.auth.localAuthEnabled ?? true,
						oidcEnabled: settingsData.auth.oidcEnabled ?? false,
						sessionTimeout: settingsData.auth.sessionTimeout || 60,
						passwordPolicy: dbPasswordPolicy,
						rbacEnabled: settingsData.auth.rbacEnabled ?? false
					})
					.returning({ id: authSettings.id });

				const authId = newAuth.id;
				console.log(`✅ Auth settings migrated with ID: ${authId}`);

				// Migrate OIDC config if it exists
				if (settingsData.auth.oidc) {
					console.log('🔑 Migrating OIDC configuration...');
					const encryptedSecret = await encrypt(settingsData.auth.oidc.clientSecret);
					await db.insert(oidcConfig).values({
						authSettingsId: authId,
						clientId: settingsData.auth.oidc.clientId,
						clientSecret: Buffer.from(encryptedSecret),
						redirectUri: settingsData.auth.oidc.redirectUri,
						authorizationEndpoint: settingsData.auth.oidc.authorizationEndpoint,
						tokenEndpoint: settingsData.auth.oidc.tokenEndpoint,
						userinfoEndpoint: settingsData.auth.oidc.userinfoEndpoint,
						scopes: settingsData.auth.oidc.scopes
					});
					console.log('✅ OIDC configuration migrated');
				}
			}

			// Migrate registry credentials if they exist
			if (settingsData.registryCredentials && settingsData.registryCredentials.length > 0) {
				console.log(`🐳 Migrating ${settingsData.registryCredentials.length} registry credentials...`);

				for (const cred of settingsData.registryCredentials) {
					const encryptedPassword = await encrypt(cred.password);
					await db.insert(registryCredentials).values({
						settingsId,
						registryUrl: cred.url,
						username: cred.username,
						password: Buffer.from(encryptedPassword)
					});
				}
				console.log('✅ Registry credentials migrated');
			}

			// Migrate template registries if they exist
			if (settingsData.templateRegistries && settingsData.templateRegistries.length > 0) {
				console.log(`📦 Migrating ${settingsData.templateRegistries.length} template registries...`);

				for (const reg of settingsData.templateRegistries) {
					await db.insert(templateRegistries).values({
						settingsId,
						name: reg.name,
						url: reg.url,
						description: '', // Default empty description since it's not in the current type
						enabled: reg.enabled ?? true
					});
				}
				console.log('✅ Template registries migrated');
			}

			console.log('🎉 Settings migration completed successfully!');
			return { success: true };
		} catch (error) {
			const errorMsg = `Settings migration failed: ${error instanceof Error ? error.message : String(error)}`;
			console.error('❌', errorMsg);
			return { success: false, error: errorMsg };
		}
	}

	private async createDefaultSettings() {
		console.log('📝 Creating default settings in database...');

		await db.insert(settings).values({
			dockerHost: 'unix:///var/run/docker.sock',
			autoUpdate: false,
			autoUpdateInterval: 5,
			pollingEnabled: true,
			pollingInterval: 10,
			pruneMode: 'all',
			stacksDirectory: './data/stacks',
			maturityThresholdDays: 30,
			baseServerUrl: 'http://localhost:3000'
		});

		console.log('✅ Default settings created');
	}
}

// Export singleton instance
export const settingsMigrationService = new SettingsMigrationService();
