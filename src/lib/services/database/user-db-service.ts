import { eq } from 'drizzle-orm';
import { usersTable } from '../../../db/schema';
import { listUsersFromFile as getFileUsers } from '../user-service';
import type { User } from '$lib/types/user.type';
import fs from 'node:fs/promises';
import path from 'node:path';
import { USER_DIR } from '../paths-service';
import { db } from '../../../db';

/**
 * Migrates users from file-based storage to database
 * @param backupOldFiles - Whether to backup the old user files (default: true)
 * @returns Promise<{ success: boolean, migratedCount: number, errors: string[] }>
 */
export async function migrateUsersToDatabase(backupOldFiles: boolean = true): Promise<{
	success: boolean;
	migratedCount: number;
	errors: string[];
}> {
	const errors: string[] = [];
	let migratedCount = 0;

	try {
		console.log('Starting user migration from file to database...');

		// Get current users from file-based system (now correctly from files!)
		const fileUsers = await getFileUsers();
		console.log(`Found ${fileUsers.length} users in file system`);

		if (fileUsers.length === 0) {
			console.log('No users found in file system. Migration completed.');
			return { success: true, migratedCount: 0, errors: [] };
		}

		// Check if users already exist in database
		const existingUsers = await db.select().from(usersTable).limit(1);

		if (existingUsers.length > 0) {
			console.log('Users already exist in database. Migration aborted.');
			return { success: false, migratedCount: 0, errors: ['Users already exist in database'] };
		}

		// Migrate each user to database
		for (const user of fileUsers) {
			try {
				const insertData = {
					id: user.id,
					username: user.username,
					passwordHash: user.passwordHash || null,
					displayName: user.displayName || null,
					email: user.email || null,
					roles: JSON.stringify(user.roles || []),
					requirePasswordChange: user.requirePasswordChange || false,
					oidcSubjectId: user.oidcSubjectId || null,
					lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
					createdAt: new Date(user.createdAt),
					updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date()
				} satisfies typeof usersTable.$inferInsert;

				await db.insert(usersTable).values(insertData);

				migratedCount++;
				console.log(`Migrated user: ${user.username}`);
			} catch (error) {
				const errorMsg = `Failed to migrate user ${user.username}: ${error}`;
				console.error(errorMsg);
				errors.push(errorMsg);
			}
		}

		console.log(`Successfully migrated ${migratedCount} users to database`);

		// Backup old user files if requested
		if (backupOldFiles && migratedCount > 0) {
			try {
				const backupDir = path.join(USER_DIR, `backup-${Date.now()}`);
				await fs.mkdir(backupDir, { recursive: true });

				const files = await fs.readdir(USER_DIR);
				const userFiles = files.filter((file) => file.endsWith('.dat'));

				for (const file of userFiles) {
					const sourcePath = path.join(USER_DIR, file);
					const backupPath = path.join(backupDir, file);

					try {
						await fs.copyFile(sourcePath, backupPath);
					} catch (copyError) {
						console.warn(`Could not backup user file ${file}:`, copyError);
					}
				}

				console.log(`User files backed up to: ${backupDir}`);
			} catch (backupError) {
				console.warn('Could not create backup of user files:', backupError);
				errors.push(`Backup failed: ${backupError}`);
			}
		}

		return {
			success: errors.length === 0,
			migratedCount,
			errors
		};
	} catch (error) {
		console.error('Failed to migrate users to database:', error);
		return {
			success: false,
			migratedCount,
			errors: [...errors, `Migration failed: ${error}`]
		};
	}
}

/**
 * Gets a user from database by ID
 */
export async function getUserByIdFromDb(id: string): Promise<User | null> {
	try {
		const result = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);

		if (result.length === 0) {
			return null;
		}

		const dbUser = result[0];

		return {
			id: dbUser.id,
			username: dbUser.username,
			passwordHash: dbUser.passwordHash || undefined,
			displayName: dbUser.displayName || undefined,
			email: dbUser.email || undefined,
			roles: JSON.parse(dbUser.roles as string),
			requirePasswordChange: dbUser.requirePasswordChange,
			oidcSubjectId: dbUser.oidcSubjectId || undefined,
			lastLogin: dbUser.lastLogin ? dbUser.lastLogin.toISOString() : undefined,
			createdAt: dbUser.createdAt.toISOString(),
			updatedAt: dbUser.updatedAt ? dbUser.updatedAt.toISOString() : undefined
		};
	} catch (error) {
		console.error('Failed to get user from database:', error);
		throw error;
	}
}

/**
 * Gets a user from database by username
 */
export async function getUserByUsernameFromDb(username: string): Promise<User | null> {
	try {
		const result = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);

		if (result.length === 0) {
			return null;
		}

		const dbUser = result[0];

		return {
			id: dbUser.id,
			username: dbUser.username,
			passwordHash: dbUser.passwordHash || undefined,
			displayName: dbUser.displayName || undefined,
			email: dbUser.email || undefined,
			roles: JSON.parse(dbUser.roles as string),
			requirePasswordChange: dbUser.requirePasswordChange,
			oidcSubjectId: dbUser.oidcSubjectId || undefined,
			// Fix: Handle Date objects from Drizzle timestamp mode properly
			lastLogin: dbUser.lastLogin ? dbUser.lastLogin.toISOString() : undefined,
			createdAt: dbUser.createdAt.toISOString(),
			updatedAt: dbUser.updatedAt ? dbUser.updatedAt.toISOString() : undefined
		};
	} catch (error) {
		console.error('Failed to get user by username from database:', error);
		throw error;
	}
}

/**
 * Gets a user from database by OIDC subject ID
 */
export async function getUserByOidcSubjectIdFromDb(oidcSubjectId: string): Promise<User | null> {
	try {
		const result = await db.select().from(usersTable).where(eq(usersTable.oidcSubjectId, oidcSubjectId)).limit(1);

		if (result.length === 0) {
			return null;
		}

		const dbUser = result[0];

		return {
			id: dbUser.id,
			username: dbUser.username,
			passwordHash: dbUser.passwordHash || undefined,
			displayName: dbUser.displayName || undefined,
			email: dbUser.email || undefined,
			roles: JSON.parse(dbUser.roles as string),
			requirePasswordChange: dbUser.requirePasswordChange,
			oidcSubjectId: dbUser.oidcSubjectId || undefined,
			// Fix: Handle Date objects from Drizzle timestamp mode properly
			lastLogin: dbUser.lastLogin ? dbUser.lastLogin.toISOString() : undefined,
			createdAt: dbUser.createdAt.toISOString(),
			updatedAt: dbUser.updatedAt ? dbUser.updatedAt.toISOString() : undefined
		};
	} catch (error) {
		console.error('Failed to get user by OIDC subject ID from database:', error);
		throw error;
	}
}

/**
 * Lists all users from database
 */
export async function listUsersFromDb(): Promise<User[]> {
	try {
		const result = await db.select().from(usersTable);

		return result.map((dbUser) => ({
			id: dbUser.id,
			username: dbUser.username,
			passwordHash: dbUser.passwordHash || undefined,
			displayName: dbUser.displayName || undefined,
			email: dbUser.email || undefined,
			roles: JSON.parse(dbUser.roles as string),
			requirePasswordChange: dbUser.requirePasswordChange,
			oidcSubjectId: dbUser.oidcSubjectId || undefined,
			// Fix: Handle Date objects from Drizzle timestamp mode properly
			lastLogin: dbUser.lastLogin ? dbUser.lastLogin.toISOString() : undefined,
			createdAt: dbUser.createdAt.toISOString(),
			updatedAt: dbUser.updatedAt ? dbUser.updatedAt.toISOString() : undefined
		}));
	} catch (error) {
		console.error('Failed to list users from database:', error);
		throw error;
	}
}

/**
 * Saves a user to database
 */
export async function saveUserToDb(user: User): Promise<User> {
	try {
		const userData = {
			id: user.id,
			username: user.username,
			passwordHash: user.passwordHash || null,
			displayName: user.displayName || null,
			email: user.email || null,
			roles: JSON.stringify(user.roles || []),
			requirePasswordChange: user.requirePasswordChange || false,
			oidcSubjectId: user.oidcSubjectId || null,
			lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
			createdAt: new Date(user.createdAt),
			updatedAt: new Date()
		};

		// Check if user exists
		const existing = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);

		if (existing.length > 0) {
			// Update existing user
			await db.update(usersTable).set(userData).where(eq(usersTable.id, user.id));
		} else {
			// Insert new user
			await db.insert(usersTable).values(userData);
		}

		return user;
	} catch (error) {
		console.error('Failed to save user to database:', error);
		throw error;
	}
}

/**
 * Deletes a user from database
 */
export async function deleteUserFromDb(id: string): Promise<boolean> {
	try {
		const result = await db.delete(usersTable).where(eq(usersTable.id, id));
		return true;
	} catch (error) {
		console.error('Failed to delete user from database:', error);
		throw error;
	}
}
