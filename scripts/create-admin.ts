// npx tsx scripts/create-admin.ts
// npx tsx scripts/create-admin.ts mypassword

import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';

// Get the directory of the current script
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Determine data directory based on environment
const dataDir = process.env.NODE_ENV === 'production' ? path.join(projectRoot, 'data') : path.join(projectRoot, '.dev-data');

const usersDir = path.join(dataDir, 'users');

async function createAdminUser() {
	try {
		console.log(`Using data directory: ${dataDir}`);

		// Create user directory if it doesn't exist
		await fs.mkdir(usersDir, { recursive: true });

		// Generate password hash
		const password = process.argv[2] || crypto.randomBytes(12).toString('hex');
		const passwordHash = await bcrypt.hash(password, 12);

		const userId = crypto.randomUUID();
		const adminUser = {
			id: userId,
			username: 'admin',
			passwordHash,
			displayName: 'Administrator',
			email: 'arcane@local',
			roles: ['admin'],
			createdAt: new Date().toISOString()
		};

		// Write the user file
		const userFilePath = path.join(usersDir, `${userId}.json`);
		await fs.writeFile(userFilePath, JSON.stringify(adminUser, null, 2));

		console.log(`✅ Admin user created successfully at ${userFilePath}`);
		console.log(`Username: admin`);
		console.log(`Password: ${password}`);
		console.log(`IMPORTANT: Change this password after first login!`);
	} catch (error) {
		console.error('❌ Failed to create admin user:', error);
	}
}

// Run the function
createAdminUser();
