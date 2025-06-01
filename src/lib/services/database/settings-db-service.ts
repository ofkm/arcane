import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import { settingsTable } from '../../../db/schema';
import { getSettings as getFileSettings, saveSettings as saveFileSettings } from '../settings-service';
import type { Settings } from '$lib/types/settings.type';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SETTINGS_DIR } from '../paths-service';
import { db } from '../../../db';

/**
 * Migrates settings from file-based storage to database
 * @param backupOldFile - Whether to backup the old settings file (default: true)
 * @returns Promise<boolean> - Success status
 */
export async function migrateSettingsToDatabase(backupOldFile: boolean = true): Promise<boolean> {
	try {
		console.log('Starting settings migration from file to database...');

		// Get current settings from file-based system
		const fileSettings = await getFileSettings();
		console.log('Retrieved settings from file system');

		// Check if settings already exist in database
		const existingSettings = await db.select().from(settingsTable).limit(1);

		if (existingSettings.length > 0) {
			console.log('Settings already exist in database. Migration aborted.');
			return false;
		}

		// Insert settings into database
		await db.insert(settingsTable).values({
			dockerHost: fileSettings.dockerHost,
			stacksDirectory: fileSettings.stacksDirectory,
			autoUpdate: fileSettings.autoUpdate,
			autoUpdateInterval: fileSettings.autoUpdateInterval,
			pollingEnabled: fileSettings.pollingEnabled,
			pollingInterval: fileSettings.pollingInterval,
			pruneMode: fileSettings.pruneMode,
			registryCredentials: JSON.stringify(fileSettings.registryCredentials || []),
			templateRegistries: JSON.stringify(fileSettings.templateRegistries || []),
			auth: JSON.stringify(fileSettings.auth),
			onboarding: fileSettings.onboarding ? JSON.stringify(fileSettings.onboarding) : null,
			baseServerUrl: fileSettings.baseServerUrl,
			maturityThresholdDays: fileSettings.maturityThresholdDays
		});

		console.log('Settings successfully migrated to database');

		// Backup old settings file if requested
		if (backupOldFile) {
			const settingsFilePath = path.join(SETTINGS_DIR, 'settings.dat');
			const backupPath = path.join(SETTINGS_DIR, `settings.dat.backup.${Date.now()}`);

			try {
				await fs.access(settingsFilePath);
				await fs.copyFile(settingsFilePath, backupPath);
				console.log(`Settings file backed up to: ${backupPath}`);
			} catch (error) {
				console.warn('Could not backup settings file:', error);
			}
		}

		return true;
	} catch (error) {
		console.error('Failed to migrate settings to database:', error);
		throw error;
	}
}

/**
 * Gets settings from database
 */
export async function getSettingsFromDb(): Promise<Settings | null> {
	try {
		const result = await db.select().from(settingsTable).limit(1);

		if (result.length === 0) {
			return null;
		}

		const dbSettings = result[0];

		return {
			dockerHost: dbSettings.dockerHost,
			stacksDirectory: dbSettings.stacksDirectory,
			autoUpdate: dbSettings.autoUpdate,
			autoUpdateInterval: dbSettings.autoUpdateInterval,
			pollingEnabled: dbSettings.pollingEnabled,
			pollingInterval: dbSettings.pollingInterval,
			pruneMode: dbSettings.pruneMode as 'all' | 'dangling' | undefined,
			registryCredentials: JSON.parse(dbSettings.registryCredentials as string),
			templateRegistries: JSON.parse(dbSettings.templateRegistries as string),
			auth: JSON.parse(dbSettings.auth as string),
			onboarding: dbSettings.onboarding ? JSON.parse(dbSettings.onboarding as string) : undefined,
			baseServerUrl: dbSettings.baseServerUrl || undefined,
			maturityThresholdDays: dbSettings.maturityThresholdDays
		};
	} catch (error) {
		console.error('Failed to get settings from database:', error);
		throw error;
	}
}

/**
 * Saves settings to database
 */
export async function saveSettingsToDb(settings: Settings): Promise<void> {
	try {
		// Check if settings exist
		const existing = await db.select().from(settingsTable).limit(1);

		const settingsData = {
			dockerHost: settings.dockerHost,
			stacksDirectory: settings.stacksDirectory,
			autoUpdate: settings.autoUpdate,
			autoUpdateInterval: settings.autoUpdateInterval,
			pollingEnabled: settings.pollingEnabled,
			pollingInterval: settings.pollingInterval,
			pruneMode: settings.pruneMode,
			registryCredentials: JSON.stringify(settings.registryCredentials || []),
			templateRegistries: JSON.stringify(settings.templateRegistries || []),
			auth: JSON.stringify(settings.auth),
			onboarding: settings.onboarding ? JSON.stringify(settings.onboarding) : null,
			baseServerUrl: settings.baseServerUrl,
			maturityThresholdDays: settings.maturityThresholdDays,
			updatedAt: new Date()
		};

		if (existing.length > 0) {
			// Update existing settings
			await db.update(settingsTable).set(settingsData).where(eq(settingsTable.id, existing[0].id));
		} else {
			// Insert new settings
			await db.insert(settingsTable).values(settingsData);
		}
	} catch (error) {
		console.error('Failed to save settings to database:', error);
		throw error;
	}
}
