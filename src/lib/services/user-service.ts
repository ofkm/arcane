import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import { encrypt, decrypt } from './encryption-service';
import { USER_DIR, ensureDirectory } from './paths-service';
import { db, initializeDatabase } from '../database';
import { users } from '../database/schema/users';
import { eq } from 'drizzle-orm';
import type { User } from '$lib/types/user.type';
import { databaseUserService } from './database-user-service';

async function ensureUserDir() {
	await ensureDirectory(USER_DIR, 0o700);
}

export async function getUserByUsername(username: string): Promise<User | null> {
	try {
		// First try to get user from database
		await initializeDatabase();
		const dbUser = await databaseUserService.getUserByUsername(username);
		if (dbUser) {
			console.log('👤 User loaded from database');
			return dbUser;
		}

		// Fallback to file-based storage
		console.log('⚠️ User not found in database, checking files...');
		return await getUserByUsernameFromFile(username);
	} catch (dbError) {
		console.warn('Database error, falling back to file-based user lookup:', dbError);
		return await getUserByUsernameFromFile(username);
	}
}

async function getUserByUsernameFromFile(username: string): Promise<User | null> {
	try {
		await ensureUserDir();

		const files = await fs.readdir(USER_DIR);

		for (const file of files) {
			if (!file.endsWith('.dat')) continue;

			const encryptedData = await fs.readFile(path.join(USER_DIR, file), 'utf-8');
			const decryptedData = await decrypt(encryptedData);
			const user = typeof decryptedData === 'string' ? JSON.parse(decryptedData) : decryptedData;

			if (user.username.toLowerCase() === username.toLowerCase()) {
				return user;
			}
		}

		return null;
	} catch (error) {
		console.error('Error getting user from file:', error);
		return null;
	}
}

export async function getUserById(id: string): Promise<User | null> {
	try {
		// First try to get user from database
		await initializeDatabase();
		const dbUser = await databaseUserService.getUserById(id);
		if (dbUser) {
			console.log('👤 User loaded from database');
			return dbUser;
		}

		// Fallback to file-based storage
		console.log('⚠️ User not found in database, checking files...');
		return await getUserByIdFromFile(id);
	} catch (dbError) {
		console.warn('Database error, falling back to file-based user lookup:', dbError);
		return await getUserByIdFromFile(id);
	}
}

async function getUserByIdFromFile(id: string): Promise<User | null> {
	try {
		await ensureUserDir();

		const filePath = path.join(USER_DIR, `${id}.dat`);

		await fs.access(filePath);

		const encryptedData = await fs.readFile(filePath, 'utf8');
		const decryptedData = await decrypt(encryptedData);
		const user = typeof decryptedData === 'string' ? JSON.parse(decryptedData) : decryptedData;

		return user;
	} catch (error) {
		return null;
	}
}

export async function saveUser(user: User): Promise<User> {
	try {
		// Save to database first
		await initializeDatabase();
		const savedUser = await databaseUserService.saveUser(user);
		console.log('💾 User saved to database');

		// Also save to file as fallback
		await saveUserToFile(savedUser);
		return savedUser;
	} catch (dbError) {
		console.warn('Database error while saving user, falling back to file only:', dbError);
		return await saveUserToFile(user);
	}
}

async function saveUserToFile(user: User): Promise<User> {
	await ensureUserDir();

	if (!user.id) {
		user.id = nanoid();
		user.createdAt = new Date().toISOString();
	}

	const filePath = path.join(USER_DIR, `${user.id}.dat`);

	const encryptedData = await encrypt(user);

	try {
		await fs.writeFile(filePath, encryptedData, { mode: 0o600 });
	} catch (error) {
		console.error('Error saving encrypted user data:', error);
		throw error;
	}

	return user;
}

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

export async function listUsers(): Promise<User[]> {
	try {
		// First try to get users from database
		await initializeDatabase();
		const dbUsers = await databaseUserService.listUsers();
		if (dbUsers.length > 0) {
			console.log('👥 Users loaded from database');
			return dbUsers;
		}

		// Fallback to file-based storage
		console.log('⚠️ No users found in database, checking files...');
		return await listUsersFromFiles();
	} catch (dbError) {
		console.warn('Database error, falling back to file-based user listing:', dbError);
		return await listUsersFromFiles();
	}
}

async function listUsersFromFiles(): Promise<User[]> {
	try {
		await ensureUserDir();

		const files = await fs.readdir(USER_DIR);
		const userFiles = files.filter((file) => file.endsWith('.dat'));

		const users = await Promise.all(
			userFiles.map(async (file) => {
				try {
					const filePath = path.join(USER_DIR, file);
					const encryptedData = await fs.readFile(filePath, 'utf8');
					const decryptedData = await decrypt(encryptedData);
					return typeof decryptedData === 'string' ? JSON.parse(decryptedData) : decryptedData;
				} catch (error) {
					console.error(`Error reading user file ${file}:`, error);
					return null;
				}
			})
		);

		return users.filter((user): user is User => user !== null);
	} catch (error) {
		console.error('Error listing users from files:', error);
		return [];
	}
}

export async function getUserByOidcSubjectId(oidcSubjectId: string): Promise<User | null> {
	try {
		// First try to get user from database
		await initializeDatabase();
		const dbUser = await databaseUserService.getUserByOidcSubjectId(oidcSubjectId);
		if (dbUser) {
			console.log('👤 OIDC user loaded from database');
			return dbUser;
		}

		// Fallback to file-based storage
		console.log('⚠️ OIDC user not found in database, checking files...');
		return await getUserByOidcSubjectIdFromFiles(oidcSubjectId);
	} catch (dbError) {
		console.warn('Database error, falling back to file-based OIDC user lookup:', dbError);
		return await getUserByOidcSubjectIdFromFiles(oidcSubjectId);
	}
}

async function getUserByOidcSubjectIdFromFiles(oidcSubjectId: string): Promise<User | null> {
	const users = await listUsersFromFiles();
	const user = users.find((u) => u.oidcSubjectId === oidcSubjectId);
	return user || null;
}
