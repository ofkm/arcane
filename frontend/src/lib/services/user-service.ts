import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { decrypt } from './encryption-service';
import { USER_DIR, ensureDirectory } from './paths-service';
import type { User } from '$lib/types/user.type';
// Import database functions
import { getUserByIdFromDb, getUserByUsernameFromDb, getUserByOidcSubjectIdFromDb, listUsersFromDb, saveUserToDb } from './database/user-db-service';

// Export database functions as the default user functions
export const getUserById = getUserByIdFromDb;
export const getUserByUsername = getUserByUsernameFromDb;
export const getUserByOidcSubjectId = getUserByOidcSubjectIdFromDb;
export const listUsers = listUsersFromDb;
export const saveUser = saveUserToDb;

// Keep these utility functions that don't need database changes
export async function verifyPassword(user: User, password: string): Promise<boolean> {
	if (typeof user.passwordHash !== 'string') {
		return false;
	}
	return await bcrypt.compare(password, user.passwordHash);
}

export async function hashPassword(password: string): Promise<string> {
	return await bcrypt.hash(password, 14);
}

export async function deriveKeyFromPassword(password: string, salt: string): Promise<string> {
	return new Promise((resolve, reject) => {
		crypto.pbkdf2(password, salt, 150000, 64, 'sha512', (err, derivedKey) => {
			if (err) reject(err);
			else resolve(derivedKey.toString('hex'));
		});
	});
}

// Keep the old file-based functions for migration purposes
async function ensureUserDir() {
	await ensureDirectory(USER_DIR, 0o700);
}

export async function getUserByUsernameFromFile(username: string): Promise<User | null> {
	try {
		await ensureUserDir();

		const files = await fs.readdir(USER_DIR);

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

export async function listUsersFromFile(): Promise<User[]> {
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

		return users.filter((user): user is User => user !== null);
	} catch (error) {
		console.error('Error listing users:', error);
		return [];
	}
}
