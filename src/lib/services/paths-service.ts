import path from 'node:path';
import fs from 'node:fs/promises';

// Determine if we're in development or production
const isDev = process.env.NODE_ENV === 'development';

// Configure paths based on environment
export const BASE_PATH = isDev ? path.resolve(process.cwd(), '.dev-data') : '/app/data';

export const SETTINGS_FILE = path.join(BASE_PATH, 'app-settings.json');
export const SETTINGS_FOLDER = path.join(BASE_PATH, 'settings');
export const SETTINGS_DIR = path.join(BASE_PATH, 'settings');
export const KEY_FILE = path.join(BASE_PATH, '.secret_key');
export const SESSIONS_DIR = path.join(BASE_PATH, 'sessions');
export const USER_DIR = path.join(BASE_PATH, 'users');

// Path getter functions
export function getBasePath(): string {
	return BASE_PATH;
}

export function getSettingsFilePath(): string {
	return SETTINGS_FILE;
}

export function getStacksDirectory(customPath?: string): string {
	return customPath || path.resolve(BASE_PATH, 'stacks');
}

// Default stacks directory
export const DEFAULT_STACKS_DIR = path.resolve(BASE_PATH, 'stacks');

// Helper function to ensure directories exist with proper permissions
export async function ensureDirectory(dir: string, mode = 0o755): Promise<void> {
	try {
		await fs.mkdir(dir, { recursive: true, mode });
	} catch (error) {
		console.error(`Error creating directory ${dir}:`, error);
		throw error;
	}
}
