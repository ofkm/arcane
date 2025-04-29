import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import proper from 'proper-lockfile';
import { getBasePath } from './settings-service';

// User directory is under the same base path as settings
const USER_DIR = path.join(getBasePath(), 'users');

export interface User {
	id: string;
	username: string;
	passwordHash: string;
	displayName?: string;
	email?: string;
	roles: string[];
	mfaEnabled: boolean;
	mfaSecret?: string;
	createdAt: string;
	lastLogin?: string;
	requirePasswordChange?: boolean;
}

// Ensure user directory exists
async function ensureUserDir() {
	await fs.mkdir(USER_DIR, { recursive: true });
}

// Get user by username
export async function getUserByUsername(username: string): Promise<User | null> {
	try {
		await ensureUserDir();

		// List all user files
		const files = await fs.readdir(USER_DIR);

		// Find user by username (case insensitive)
		for (const file of files) {
			if (!file.endsWith('.json')) continue;

			const userData = await fs.readFile(path.join(USER_DIR, file), 'utf-8');
			const user = JSON.parse(userData) as User;

			if (user.username.toLowerCase() === username.toLowerCase()) {
				return user;
			}
		}

		return null;
	} catch (error) {
		console.error('Error getting user:', error);
		return null;
	}
}

// Create or update user
export async function saveUser(user: User): Promise<User> {
	await ensureUserDir();

	// Generate ID if it doesn't exist
	if (!user.id) {
		user.id = nanoid();
		user.createdAt = new Date().toISOString();
	}

	const filePath = path.join(USER_DIR, `${user.id}.json`);

	// Create the file if it doesn't exist
	try {
		await fs.access(filePath);
	} catch {
		await fs.writeFile(filePath, '{}');
	}

	// Acquire a lock
	const release = await proper.lock(filePath, { retries: 5 });

	try {
		await fs.writeFile(filePath, JSON.stringify(user, null, 2));
	} finally {
		// Release the lock
		await release();
	}

	return user;
}

// Verify a password
export async function verifyPassword(user: User, password: string): Promise<boolean> {
	return await bcrypt.compare(password, user.passwordHash);
}

// Hash a password
export async function hashPassword(password: string): Promise<string> {
	return await bcrypt.hash(password, 12);
}

// List all users
export async function listUsers(): Promise<User[]> {
	try {
		await ensureUserDir();

		const files = await fs.readdir(USER_DIR);
		const users: User[] = [];

		for (const file of files) {
			if (!file.endsWith('.json')) continue;

			const userData = await fs.readFile(path.join(USER_DIR, file), 'utf-8');
			users.push(JSON.parse(userData) as User);
		}

		return users;
	} catch (error) {
		console.error('Error listing users:', error);
		return [];
	}
}
