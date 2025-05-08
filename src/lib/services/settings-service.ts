import fs from 'node:fs/promises';
import path from 'node:path';
import proper from 'proper-lockfile';
import type { Settings } from '$lib/types/settings.type';
import { encrypt, decrypt } from './encryption-service';
import { SETTINGS_DIR, STACKS_DIR, ensureDirectory } from './paths-service';

// Determine if we're in development or production
const isDev = process.env.NODE_ENV === 'development';

// Default settings - also adapt paths for development environment
export const DEFAULT_SETTINGS: Settings = {
	dockerHost: isDev ? (process.platform === 'win32' ? 'npipe:////./pipe/docker_engine' : 'unix:///var/run/docker.sock') : 'unix:///var/run/docker.sock',
	autoUpdate: false,
	autoUpdateInterval: 5,
	pollingEnabled: true,
	pollingInterval: 10,
	pruneMode: 'all',
	stacksDirectory: STACKS_DIR,
	registryCredentials: [],
	auth: {
		localAuthEnabled: true,
		sessionTimeout: 60,
		passwordPolicy: 'strong',
		rbacEnabled: false
	}
};

// Ensure settings directory exists with proper permissions
async function ensureSettingsDir() {
	try {
		await ensureDirectory(SETTINGS_DIR, 0o700); // Only owner can access

		// Only apply chmod on non-Windows platforms
		// Windows doesn't fully support POSIX permissions
		if (process.platform !== 'win32') {
			try {
				// Ensure correct permissions even if directory already existed
				await fs.chmod(SETTINGS_DIR, 0o700);
			} catch (chmodError: unknown) {
				// Ignore specific errors related to unsupported operations
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

// Save a setting to its own file
async function saveSetting(key: string, value: any): Promise<void> {
	const filePath = path.join(SETTINGS_DIR, `${key}.json`);

	// Make sure the directory exists
	await ensureDirectory(path.dirname(filePath));

	try {
		// Create the file if it doesn't exist
		try {
			await fs.access(filePath);
		} catch {
			await fs.writeFile(filePath, '{}');
		}

		// Acquire a lock
		const release = await proper.lock(filePath, { retries: 5 });

		try {
			await fs.writeFile(filePath, JSON.stringify(value));
		} finally {
			// Release the lock
			await release();
		}
	} catch (error) {
		console.error(`Error saving setting ${key}:`, error);
		throw error;
	}
}

// Get all settings
export async function getSettings(): Promise<Settings> {
	try {
		await ensureSettingsDir();
		const filePath = path.join(SETTINGS_DIR, 'settings.dat');

		try {
			await fs.access(filePath);
		} catch {
			// Settings file doesn't exist, return default settings
			return getDefaultSettings();
		}

		const rawData = await fs.readFile(filePath, 'utf8');
		const settingsData = JSON.parse(rawData);

		// Decrypt sensitive data if available
		if (settingsData._encrypted) {
			// Use destructuring to separate _encrypted from the rest of the settings
			const { _encrypted, ...nonSensitiveSettings } = settingsData;
			const decryptedData = await decrypt(_encrypted);

			// Merge the non-sensitive settings with decrypted data
			return { ...nonSensitiveSettings, ...decryptedData };
		}

		// Fallback for old format settings
		return settingsData;
	} catch (error) {
		console.error('Error loading settings:', error);
		return getDefaultSettings();
	}
}

// Save all settings
export async function saveSettings(settings: Settings): Promise<void> {
	await ensureSettingsDir();
	const filePath = path.join(SETTINGS_DIR, 'settings.dat');

	// Create the file if it doesn't exist
	try {
		await fs.access(filePath);
	} catch {
		// File doesn't exist, create an empty file
		await fs.writeFile(filePath, '{}', { mode: 0o600 });
	}

	// Acquire a lock on the settings file
	let release;
	try {
		release = await proper.lock(filePath, {
			retries: 5, // Try up to 5 times
			stale: 10000, // Consider lock stale after 10 seconds
			onCompromised: (err) => {
				console.error('Lock was compromised:', err);
			}
		});

		// Separate sensitive and non-sensitive settings
		const { auth, registryCredentials, ...nonSensitiveSettings } = settings;

		// Create a settings object with encrypted sensitive data
		const dataToSave = {
			...nonSensitiveSettings,
			_encrypted: await encrypt({ auth, registryCredentials })
		};

		// Write the settings with proper permissions
		await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), { mode: 0o600 });
	} catch (error) {
		console.error('Error saving settings with lock:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to save settings: ${errorMessage}`);
	} finally {
		// Always release the lock if we acquired it
		if (release) {
			try {
				await release();
			} catch (releaseError) {
				console.error('Error releasing lock:', releaseError);
			}
		}
	}
}

function getDefaultSettings(): Settings {
	return DEFAULT_SETTINGS;
}
