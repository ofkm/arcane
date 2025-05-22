import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs'; // Make sure bcryptjs is installed as a dev dependency
import { encrypt } from '../src/lib/services/encryption-service';
import { ensureDirectory } from '../src/lib/services/paths-service';
import { DEFAULT_SETTINGS } from '../src/lib/services/settings-service';

// --- Configuration ---
const TEST_USERNAME = 'arcane';
const TEST_PASSWORD = 'arcane-admin'; // Use a simple password for testing
const TEST_DATA_DIR = process.env.APP_ENV === 'TEST' ? path.resolve(process.cwd(), 'data') : null;
// --- End Configuration ---

async function setupTestEnvironment() {
	console.log('Starting test environment setup...');

	if (!TEST_DATA_DIR) {
		throw new Error('This script should only run in TEST environment (APP_ENV=TEST)');
	}

	// --- Ensure Directories Exist ---
	console.log(`Ensuring test data directory exists: ${TEST_DATA_DIR}`);
	const settingsDir = path.join(TEST_DATA_DIR, 'settings');
	const usersDir = path.join(TEST_DATA_DIR, 'users');
	await ensureDirectory(TEST_DATA_DIR);
	await ensureDirectory(settingsDir);
	await ensureDirectory(usersDir);
	console.log('Directories ensured.');

	// --- Initialize Test User ---
	console.log(`Initializing test user: ${TEST_USERNAME}`);
	const usersFilePath = path.join(usersDir, 'users.json');
	const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
	const testUser = {
		username: TEST_USERNAME,
		password: hashedPassword,
		roles: ['admin', 'containers:view', 'containers:manage', 'settings:view', 'networks:view', 'networks:manage'], // Add all necessary roles for tests
		createdAt: new Date().toISOString()
	};
	// Write user data (overwriting if exists)
	await fs.writeFile(usersFilePath, JSON.stringify([testUser], null, 2), { mode: 0o600 });
	console.log(`Test user data written to ${usersFilePath}`);

	// --- Initialize Settings ---
	console.log('Initializing settings...');
	const testSettings = {
		...DEFAULT_SETTINGS,
		onboarding: {
			completed: true,
			completedAt: new Date().toISOString()
		},
		auth: {
			rbacEnabled: true,
			localAuthEnabled: true,
			sessionTimeout: 60,
			passwordPolicy: 'medium'
		},
		registryCredentials: []
	};

	const { auth, registryCredentials, ...nonSensitiveSettings } = testSettings;
	const dataToSave = {
		...nonSensitiveSettings,
		_encrypted: await encrypt({ auth, registryCredentials })
	};

	const settingsDatPath = path.join(settingsDir, 'settings.dat');
	await fs.writeFile(settingsDatPath, JSON.stringify(dataToSave, null, 2), { mode: 0o600 });
	console.log(`Settings written to ${settingsDatPath}`);

	// --- Cleanup Old/Unused Files ---
	console.log('Cleaning up potentially old settings files...');
	try {
		await fs.unlink(path.join(settingsDir, 'settings.json'));
	} catch (e) {
		/* ignore */
	}
	try {
		await fs.unlink(path.join(TEST_DATA_DIR, 'app-settings.json'));
	} catch (e) {
		/* ignore */
	}
	console.log('Cleanup complete.');

	console.log('--- Test environment setup finished successfully! ---');
}

const isRunDirectly = import.meta.url && process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`;

if (isRunDirectly) {
	setupTestEnvironment().catch((error) => {
		console.error('Error setting up test environment:', error);
		process.exit(1);
	});
}

export { setupTestEnvironment };
