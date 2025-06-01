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
import { databaseUserService } from '$lib/services/database/database-user-service';

export async function getUserByUsername(username: string): Promise<User | null> {
	await initializeDatabase();
	return await databaseUserService.getUserByUsername(username);
}

export async function getUserById(id: string): Promise<User | null> {
	await initializeDatabase();
	return await databaseUserService.getUserById(id);
}

export async function saveUser(user: User): Promise<User> {
	await initializeDatabase();
	return await databaseUserService.saveUser(user);
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
	await initializeDatabase();
	return await databaseUserService.listUsers();
}

export async function getUserByOidcSubjectId(oidcSubjectId: string): Promise<User | null> {
	await initializeDatabase();
	return await databaseUserService.getUserByOidcSubjectId(oidcSubjectId);
}
