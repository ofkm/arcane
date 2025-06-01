import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { db, initializeDatabase } from '../../database';
import { eq } from 'drizzle-orm';
import { users } from '../../database/schema/users';
import { decrypt } from '../encryption-service';
import { nanoid } from 'nanoid';
import type { User } from '../../types/user.type';

export class UserMigrationService {
	private dataPath = './data';
	private migrationStatusFile = join(this.dataPath, 'user-migration-status.json');

	async getMigrationStatus(): Promise<{ completed: boolean; lastRun?: string; errors?: string[] }> {
		if (!existsSync(this.migrationStatusFile)) {
			return { completed: false };
		}

		try {
			const status = JSON.parse(readFileSync(this.migrationStatusFile, 'utf8'));
			return status;
		} catch (error) {
			console.error('Failed to read user migration status:', error);
			return { completed: false, errors: ['Failed to read migration status'] };
		}
	}

	async setMigrationStatus(status: { completed: boolean; lastRun?: string; errors?: string[] }) {
		try {
			const fs = await import('fs');
			const { dirname } = await import('path');

			const dir = dirname(this.migrationStatusFile);
			if (!existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			fs.writeFileSync(this.migrationStatusFile, JSON.stringify(status, null, 2));
		} catch (error) {
			console.error('Failed to write user migration status:', error);
		}
	}

	async migrateUsersFromFiles(): Promise<{ success: boolean; errors: string[] }> {
		const errors: string[] = [];

		try {
			console.log('🔄 Starting user migration from file-based storage to database...');

			// Initialize database first
			await initializeDatabase();

			// Check if migration was already completed
			const migrationStatus = await this.getMigrationStatus();
			if (migrationStatus.completed) {
				console.log('✅ User migration already completed, skipping...');
				return { success: true, errors: [] };
			}

			// Migrate users
			const userErrors = await this.migrateUsers();
			errors.push(...userErrors);

			// Mark migration as completed
			await this.setMigrationStatus({
				completed: true,
				lastRun: new Date().toISOString(),
				errors: errors.length > 0 ? errors : undefined
			});

			const success = errors.length === 0;
			console.log(`🎉 User migration ${success ? 'completed successfully' : 'completed with errors'}`);
			if (errors.length > 0) {
				console.log('❌ Migration errors:', errors);
			}

			return { success, errors };
		} catch (error) {
			const errorMsg = `User migration failed: ${error instanceof Error ? error.message : String(error)}`;
			console.error('❌', errorMsg);
			errors.push(errorMsg);

			await this.setMigrationStatus({
				completed: false,
				lastRun: new Date().toISOString(),
				errors
			});

			return { success: false, errors };
		}
	}

	private async migrateUsers(): Promise<string[]> {
		const errors: string[] = [];
		const usersDir = join(this.dataPath, 'users');

		if (!existsSync(usersDir)) {
			console.log('📁 No users directory found, skipping user migration');
			return errors;
		}

		try {
			console.log('👥 Migrating users...');
			const userFiles = readdirSync(usersDir).filter((file) => file.endsWith('.dat'));

			if (userFiles.length === 0) {
				console.log('📝 No user files found');
				return errors;
			}

			console.log(`📊 Found ${userFiles.length} user files to migrate`);

			for (const userFile of userFiles) {
				try {
					const userPath = join(usersDir, userFile);
					const encryptedData = readFileSync(userPath, 'utf8');
					const decryptedData = await decrypt(encryptedData);
					// decrypt function already returns parsed object, not JSON string
					const userData: User = typeof decryptedData === 'string' ? JSON.parse(decryptedData) : decryptedData;

					// Check if user already exists in database
					const existingUser = await db.select().from(users).where(eq(users.id, userData.id)).limit(1);
					if (existingUser.length > 0) {
						console.log(`👤 User ${userData.username || userData.email} already exists in database, skipping...`);
						continue;
					}

					// Prepare user data for database insertion
					const now = new Date().toISOString();

					// Handle password hash - keep it encrypted
					let encryptedPasswordHash: Buffer | null = null;
					if (userData.passwordHash) {
						// Re-encrypt the password hash for database storage
						const { encrypt } = await import('../encryption-service');
						const reEncryptedHash = await encrypt(userData.passwordHash);
						encryptedPasswordHash = Buffer.from(reEncryptedHash, 'utf8');
					}

					// Insert user into database
					await db.insert(users).values({
						id: userData.id,
						username: userData.username,
						email: userData.email || userData.username, // Use username as fallback
						passwordHash: encryptedPasswordHash,
						role: (userData.roles?.[0] as 'admin' | 'user' | 'viewer') || 'user',
						isActive: true,
						lastLogin: userData.lastLogin,
						oidcSubject: userData.oidcSubjectId,
						oidcProvider: null, // Not available in current User type
						oidcEmail: userData.email,
						oidcName: userData.displayName,
						oidcPicture: null, // Not available in current User type
						createdAt: userData.createdAt || now,
						updatedAt: userData.updatedAt || now
					});

					console.log(`✅ Migrated user: ${userData.username || userData.email}`);
				} catch (userError) {
					const errorMsg = `Failed to migrate user from ${userFile}: ${userError instanceof Error ? userError.message : String(userError)}`;
					console.error('❌', errorMsg);
					errors.push(errorMsg);
				}
			}

			console.log(`🎉 Users migration completed. Processed ${userFiles.length} user files.`);
		} catch (error) {
			const errorMsg = `Failed to migrate users: ${error instanceof Error ? error.message : String(error)}`;
			console.error('❌', errorMsg);
			errors.push(errorMsg);
		}

		return errors;
	}

	async getUserCount(): Promise<{ files: number; database: number }> {
		const usersDir = join(this.dataPath, 'users');
		let fileCount = 0;

		if (existsSync(usersDir)) {
			const userFiles = readdirSync(usersDir).filter((file) => file.endsWith('.dat'));
			fileCount = userFiles.length;
		}

		await initializeDatabase();
		const dbUsers = await db.select().from(users);
		const dbCount = dbUsers.length;

		return { files: fileCount, database: dbCount };
	}
}

// Export singleton instance
export const userMigrationService = new UserMigrationService();
