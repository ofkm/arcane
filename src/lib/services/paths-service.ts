import * as path from 'path';
import fs from 'node:fs/promises';
import { isDev, isTest } from '$lib/constants';
import { env } from '$env/dynamic/private'; // Use SvelteKit's private env system

// Configure paths based on environment
// Default to production paths unless APP_ENV is explicitly set to something else
// or we're in a development or test context
const useProductionPaths = env.APP_ENV === undefined || env.APP_ENV === 'production' || (!isTest && !isDev);
export const BASE_PATH = isTest ? path.resolve(process.cwd(), '.test-data') : useProductionPaths ? '/app/data' : path.resolve(process.cwd(), '.dev-data');

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
