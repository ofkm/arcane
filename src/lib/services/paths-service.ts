import * as path from 'path';
import fs from 'node:fs/promises';
import { isDev, isTest } from '$lib/constants';

// Configure paths based on environment
export const BASE_PATH = isTest ? path.resolve(process.cwd(), '.test-data') : isDev ? path.resolve(process.cwd(), '.dev-data') : '/app/data';

export const SETTINGS_FILE = path.join(BASE_PATH, 'app-settings.json');
export const SETTINGS_DIR = path.join(BASE_PATH, 'settings');
export const KEY_FILE = path.join(BASE_PATH, '.secret_key');
export const SESSIONS_DIR = path.join(BASE_PATH, 'sessions');
export const USER_DIR = path.join(BASE_PATH, 'users');

export const STACKS_DIR = path.join(BASE_PATH, 'stacks');

export async function ensureDirectory(dir: string, mode = 0o755): Promise<void> {
	try {
		await fs.mkdir(dir, { recursive: true, mode });
	} catch (error) {
		throw error;
	}
}
