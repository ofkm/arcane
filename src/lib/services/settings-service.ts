import fs from 'fs/promises';
import path from 'path';
import proper from 'proper-lockfile';
import type { SettingsData } from '$lib/types/settings.type';
import { encrypt, decrypt } from './encryption-service';
import { SETTINGS_FILE, SETTINGS_FOLDER, SETTINGS_DIR, DEFAULT_STACKS_DIR, ensureDirectory } from './paths-service';

// Determine if we're in development or production
const isDev = process.env.NODE_ENV === 'development';

// Default settings - also adapt paths for development environment
export const DEFAULT_SETTINGS: SettingsData = {
	dockerHost: isDev ? (process.platform === 'win32' ? 'npipe:////./pipe/docker_engine' : 'unix:///var/run/docker.sock') : 'unix:///var/run/docker.sock',
	autoUpdate: false,
	autoUpdateInterval: 5,
	pollingEnabled: true,
	pollingInterval: 10,
	pruneMode: 'all',
	stacksDirectory: DEFAULT_STACKS_DIR
};

// Path getter functions
export function getBasePath(): string {
	return path.dirname(SETTINGS_FILE);
}

export function getSettingsFilePath(): string {
	return SETTINGS_FILE;
}

export function getStacksDirectory(): string {
	return DEFAULT_SETTINGS.stacksDirectory;
}

// Make sure directories exist
async function ensureDirs() {
	await ensureDirectory(path.dirname(SETTINGS_FILE));
	await ensureDirectory(SETTINGS_FOLDER);
}

// Ensure settings directory exists with proper permissions
async function ensureSettingsDir() {
	try {
		await ensureDirectory(SETTINGS_DIR, 0o700); // Only owner can access

		// Ensure correct permissions even if directory already existed
		await fs.chmod(SETTINGS_DIR, 0o700);
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
			await ensureDirectory(DEFAULT_STACKS_DIR);
			return DEFAULT_STACKS_DIR;
		} catch (innerErr) {
			console.error('Failed to create default stacks directory:', innerErr);
			throw new Error('Unable to create stacks directory');
		}
	}
}

// Save a setting to its own file
async function saveSetting(key: string, value: any): Promise<void> {
	const filePath = path.join(SETTINGS_FOLDER, `${key}.json`);

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

// Get a setting from its own file
async function getSetting(key: string): Promise<any | null> {
	const filePath = path.join(SETTINGS_FOLDER, `${key}.json`);

	try {
		const data = await fs.readFile(filePath, 'utf-8');
		return JSON.parse(data);
	} catch (error) {
		return null;
	}
}

// Get all settings
export async function getSettings(): Promise<SettingsData> {
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
		const settings = JSON.parse(rawData);

		// Decrypt sensitive data if available
		if (settings._encrypted) {
			const decryptedData = await decrypt(settings._encrypted);
			delete settings._encrypted;
			return { ...settings, ...decryptedData };
		}

		// Fallback for old format settings
		return settings;
	} catch (error) {
		console.error('Error loading settings:', error);
		return getDefaultSettings();
	}
}

// Save all settings
export async function saveSettings(settings: SettingsData): Promise<void> {
	await ensureSettingsDir();
	const filePath = path.join(SETTINGS_DIR, 'settings.dat');

	// Separate sensitive and non-sensitive settings
	const { auth, registryCredentials, ...nonSensitiveSettings } = settings;

	// Create a settings object with encrypted sensitive data
	const dataToSave = {
		...nonSensitiveSettings,
		_encrypted: await encrypt({ auth, registryCredentials })
	};

	await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), { mode: 0o600 });
}

// Helper function to flatten nested objects
function flattenObject(obj: any, prefix = ''): Record<string, any> {
	return Object.keys(obj).reduce((acc: Record<string, any>, k: string) => {
		const pre = prefix.length ? `${prefix}.` : '';
		if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
			Object.assign(acc, flattenObject(obj[k], `${pre}${k}`));
		} else {
			acc[`${pre}${k}`] = obj[k];
		}
		return acc;
	}, {});
}

// Helper to parse JSON values
function tryParse(value: string): any {
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

function getDefaultSettings(): SettingsData {
	return DEFAULT_SETTINGS;
}
