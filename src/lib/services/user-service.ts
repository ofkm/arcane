import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import { encrypt, decrypt } from './encryption-service';
import { USER_DIR, ensureDirectory } from './paths-service';
import type { User } from '$lib/types/user.type';

// Ensure user directory exists
async function ensureUserDir() {
	await ensureDirectory(USER_DIR, 0o700);
}

// Get user by username
export async function getUserByUsername(username: string): Promise<User | null> {
	try {
		await ensureUserDir();

		// List all user files
		const files = await fs.readdir(USER_DIR);

		// Find user by username (case insensitive)
		for (const file of files) {
			if (!file.endsWith('.dat')) continue;

			const encryptedData = await fs.readFile(path.join(USER_DIR, file), 'utf-8');
			const user = (await decrypt(encryptedData)) as User;

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

// Get user by ID with decryption
export async function getUserById(id: string): Promise<User | null> {
	try {
		await ensureUserDir();

		const filePath = path.join(USER_DIR, `${id}.dat`);

		// Check if file exists
		await fs.access(filePath);

		// Read and decrypt
		const encryptedData = await fs.readFile(filePath, 'utf8');
		const user = (await decrypt(encryptedData)) as User;

		return user;
	} catch (error) {
		// File doesn't exist or decryption failed
		return null;
	}
}

// Save user with encryption
export async function saveUser(user: User): Promise<User> {
	await ensureUserDir();

	// Generate ID if it doesn't exist
	if (!user.id) {
		user.id = nanoid();
		user.createdAt = new Date().toISOString();
	}

	const filePath = path.join(USER_DIR, `${user.id}.dat`); // Changed extension

	// Encrypt user data
	const encryptedData = await encrypt(user);

	try {
		// Create/overwrite the file
		await fs.writeFile(filePath, encryptedData, { mode: 0o600 }); // Only owner can read/write
	} catch (error) {
		console.error('Error saving encrypted user data:', error);
		throw error;
	}

	return user;
}

// Verify a password
export async function verifyPassword(user: User, password: string): Promise<boolean> {
	return await bcrypt.compare(password, user.passwordHash);
}

// Hash a password with stronger settings
export async function hashPassword(password: string): Promise<string> {
	// Use a higher cost factor for bcrypt
	return await bcrypt.hash(password, 14); // Increased from 12
}

// Add a key stretching function for additional security
export async function deriveKeyFromPassword(password: string, salt: string): Promise<string> {
	return new Promise((resolve, reject) => {
		crypto.pbkdf2(
			password,
			salt,
			150000, // High iteration count for key stretching
			64, // 512-bit key
			'sha512',
			(err, derivedKey) => {
				if (err) reject(err);
				else resolve(derivedKey.toString('hex'));
			}
		);
	});
}

// List users with decryption
export async function listUsers(): Promise<User[]> {
	try {
		await ensureUserDir();

		const files = await fs.readdir(USER_DIR);
		const userFiles = files.filter((file) => file.endsWith('.dat'));

		const users = await Promise.all(
			userFiles.map(async (file) => {
				try {
					const filePath = path.join(USER_DIR, file);
					const encryptedData = await fs.readFile(filePath, 'utf8');
					return (await decrypt(encryptedData)) as User;
				} catch (error) {
					console.error(`Error reading user file ${file}:`, error);
					return null;
				}
			})
		);

		// Filter out any null results from failed reads
		return users.filter((user): user is User => user !== null);
	} catch (error) {
		console.error('Error listing users:', error);
		return [];
	}
}
