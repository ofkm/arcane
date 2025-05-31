import { db, initializeDatabase } from '../database';
import { eq, and, sql } from 'drizzle-orm';
import { users, userSessions } from '../database/schema/users';
import { encrypt, decrypt } from './encryption-service';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import type { User } from '../types/user.type';

export class DatabaseUserService {
	private initialized = false;

	async init() {
		if (!this.initialized) {
			await initializeDatabase();
			this.initialized = true;
		}
	}

	// User methods
	async getUserById(id: string): Promise<User | null> {
		await this.init();

		const userRows = await db.select().from(users).where(eq(users.id, id)).limit(1);
		if (userRows.length === 0) return null;

		return this.mapDbUserToUser(userRows[0]);
	}

	async getUserByUsername(username: string): Promise<User | null> {
		await this.init();

		const userRows = await db.select().from(users).where(eq(users.username, username)).limit(1);
		if (userRows.length === 0) return null;

		return this.mapDbUserToUser(userRows[0]);
	}

	async getUserByEmail(email: string): Promise<User | null> {
		await this.init();

		const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
		if (userRows.length === 0) return null;

		return this.mapDbUserToUser(userRows[0]);
	}

	async getUserByOidcSubjectId(oidcSubjectId: string): Promise<User | null> {
		await this.init();

		const userRows = await db.select().from(users).where(eq(users.oidcSubject, oidcSubjectId)).limit(1);
		if (userRows.length === 0) return null;

		return this.mapDbUserToUser(userRows[0]);
	}

	async listUsers(): Promise<User[]> {
		await this.init();

		const userRows = await db.select().from(users);
		return Promise.all(userRows.map((user) => this.mapDbUserToUser(user)));
	}

	async saveUser(userData: User): Promise<User> {
		await this.init();

		const userId = userData.id || nanoid();
		const now = new Date().toISOString();

		// Handle password hash encryption if present
		let encryptedPasswordHash: Buffer | null = null;
		if (userData.passwordHash) {
			const encryptedHash = await encrypt(userData.passwordHash);
			encryptedPasswordHash = Buffer.from(encryptedHash, 'utf8');
		}

		// Check if user exists
		const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);

		if (existingUser.length > 0) {
			// Update existing user
			await db
				.update(users)
				.set({
					username: userData.username,
					email: userData.email || userData.username, // Use username as fallback for email
					passwordHash: encryptedPasswordHash,
					role: (userData.roles?.[0] as 'admin' | 'user' | 'viewer') || 'user',
					isActive: true,
					lastLogin: userData.lastLogin,
					oidcSubject: userData.oidcSubjectId,
					oidcProvider: undefined, // Not available in current User type
					oidcEmail: userData.email,
					oidcName: userData.displayName,
					oidcPicture: undefined, // Not available in current User type
					updatedAt: now
				})
				.where(eq(users.id, userId));
		} else {
			// Create new user
			await db.insert(users).values({
				id: userId,
				username: userData.username,
				email: userData.email || userData.username, // Use username as fallback for email
				passwordHash: encryptedPasswordHash,
				role: (userData.roles?.[0] as 'admin' | 'user' | 'viewer') || 'user',
				isActive: true,
				lastLogin: userData.lastLogin,
				oidcSubject: userData.oidcSubjectId,
				oidcProvider: undefined, // Not available in current User type
				oidcEmail: userData.email,
				oidcName: userData.displayName,
				oidcPicture: undefined, // Not available in current User type
				createdAt: userData.createdAt || now,
				updatedAt: now
			});
		}

		// Return the saved user
		const savedUser = await this.getUserById(userId);
		return savedUser!;
	}

	async verifyPassword(user: User, password: string): Promise<boolean> {
		if (!user.passwordHash) {
			return false;
		}
		return await bcrypt.compare(password, user.passwordHash);
	}

	async hashPassword(password: string): Promise<string> {
		return await bcrypt.hash(password, 14);
	}

	async deriveKeyFromPassword(password: string, salt: string): Promise<string> {
		return new Promise((resolve, reject) => {
			crypto.pbkdf2(password, salt, 150000, 64, 'sha512', (err, derivedKey) => {
				if (err) reject(err);
				else resolve(derivedKey.toString('hex'));
			});
		});
	}

	// Session methods
	async createSession(userId: string, token: string, expiresAt: string, userAgent?: string, ipAddress?: string): Promise<void> {
		await this.init();

		await db.insert(userSessions).values({
			id: nanoid(),
			userId,
			token,
			expiresAt,
			userAgent,
			ipAddress
		});
	}

	async getSessionByToken(token: string): Promise<{ userId: string; expiresAt: string } | null> {
		await this.init();

		const sessionRows = await db.select().from(userSessions).where(eq(userSessions.token, token)).limit(1);
		if (sessionRows.length === 0) return null;

		const session = sessionRows[0];
		return {
			userId: session.userId,
			expiresAt: session.expiresAt
		};
	}

	async deleteSession(token: string): Promise<void> {
		await this.init();

		await db.delete(userSessions).where(eq(userSessions.token, token));
	}

	async deleteExpiredSessions(): Promise<void> {
		await this.init();

		const now = new Date().toISOString();
		await db.delete(userSessions).where(sql`expires_at < ${now}`);
	}

	async deleteUserSessions(userId: string): Promise<void> {
		await this.init();

		await db.delete(userSessions).where(eq(userSessions.userId, userId));
	}

	// Helper to map database user to User type
	private async mapDbUserToUser(dbUser: any): Promise<User> {
		// Handle encrypted password hash
		let passwordHash: string | undefined;
		if (dbUser.passwordHash) {
			const decryptedHash = await decrypt((dbUser.passwordHash as Buffer).toString('utf8'));
			// decrypt function returns the actual password hash string
			passwordHash = typeof decryptedHash === 'string' ? decryptedHash : String(decryptedHash);
		}

		return {
			id: dbUser.id,
			username: dbUser.username,
			email: dbUser.email,
			passwordHash,
			displayName: dbUser.oidcName || undefined,
			roles: [dbUser.role],
			createdAt: dbUser.createdAt,
			lastLogin: dbUser.lastLogin || undefined,
			updatedAt: dbUser.updatedAt || undefined,
			oidcSubjectId: dbUser.oidcSubject || undefined
		};
	}
}

// Export singleton instance
export const databaseUserService = new DatabaseUserService();
