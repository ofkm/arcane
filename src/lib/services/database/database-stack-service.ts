import { db } from '$lib/database';
import { stacks, stackServices, stackVariables } from '$lib/database/schema/stacks';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import slugify from 'slugify';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureStacksDir, getStackDir, normalizeHealthcheckTest } from '$lib/services/docker/stack-service';
import { getSettings } from '$lib/services/settings-service';
import type { Stack, StackUpdate } from '$lib/types/docker/stack.type';

export class DatabaseStackService {
	private initialized = false;

	private async init(): Promise<void> {
		if (this.initialized) return;
		this.initialized = true;
	}

	/**
	 * Create a new stack with database metadata and file storage for compose files
	 */
	async createStack(name: string, composeContent: string, envContent?: string): Promise<Stack> {
		await this.init();

		// Create a safe directory name from the stack name
		const dirName = slugify(name, {
			lower: true,
			strict: true,
			replacement: '-',
			trim: true
		});

		const settings = await getSettings();
		const stacksDir = settings.stacksDirectory;

		// Ensure the stacks directory exists
		await fs.mkdir(stacksDir, { recursive: true });

		let counter = 1;
		let uniqueDirName = dirName;

		// Ensure unique directory name
		while (await this.directoryExists(path.join(stacksDir, uniqueDirName))) {
			uniqueDirName = `${dirName}-${counter}`;
			counter++;
		}

		// Check if stack name already exists in database
		const existingStack = await db.select().from(stacks).where(eq(stacks.name, name)).limit(1);
		if (existingStack.length > 0) {
			throw new Error(`Stack with name "${name}" already exists`);
		}

		// Create the stack directory
		const stackDir = path.join(stacksDir, uniqueDirName);
		await fs.mkdir(stackDir, { recursive: true });

		// Write compose file
		const normalizedComposeContent = normalizeHealthcheckTest(composeContent);
		await fs.writeFile(path.join(stackDir, 'compose.yaml'), normalizedComposeContent);

		// Write env file if provided
		if (envContent) {
			await fs.writeFile(path.join(stackDir, '.env'), envContent);
		}

		// Create database entry
		const stackId = nanoid();
		const now = new Date().toISOString();

		await db.insert(stacks).values({
			id: stackId,
			name: name,
			description: `Stack: ${name}`,
			path: uniqueDirName, // Store the directory name as the path
			composeFile: 'compose.yaml',
			envFile: envContent ? '.env' : null,
			isTemplate: false,
			isActive: true,
			createdAt: now,
			updatedAt: now
		});

		return {
			id: uniqueDirName, // Use directory name as ID for compatibility
			name: name,
			serviceCount: 0,
			runningCount: 0,
			status: 'stopped',
			createdAt: now,
			updatedAt: now,
			composeContent: normalizedComposeContent,
			envContent: envContent || '',
			isExternal: false
		};
	}

	/**
	 * Update an existing stack
	 */
	async updateStack(stackDirName: string, updates: StackUpdate): Promise<Stack> {
		await this.init();

		// Find the stack by path (directory name)
		const existingStacks = await db.select().from(stacks).where(eq(stacks.path, stackDirName)).limit(1);
		if (existingStacks.length === 0) {
			throw new Error(`Stack with directory "${stackDirName}" not found`);
		}

		const existingStack = existingStacks[0];
		const stackDir = await getStackDir(stackDirName);

		// Handle file updates
		const promises = [];
		if (updates.composeContent !== undefined) {
			const normalizedComposeContent = normalizeHealthcheckTest(updates.composeContent);
			promises.push(fs.writeFile(path.join(stackDir, 'compose.yaml'), normalizedComposeContent, 'utf8'));
		}

		if (updates.envContent !== undefined) {
			if (updates.envContent) {
				promises.push(fs.writeFile(path.join(stackDir, '.env'), updates.envContent, 'utf8'));
			} else {
				// Remove .env file if content is empty
				promises.push(fs.unlink(path.join(stackDir, '.env')).catch(() => {})); // Ignore errors if file doesn't exist
			}
		}

		if (promises.length > 0) {
			await Promise.all(promises);
		}

		// Update database metadata
		const updateData: Partial<typeof stacks.$inferInsert> = {
			updatedAt: new Date().toISOString()
		};

		if (updates.name && updates.name !== existingStack.name) {
			updateData.name = updates.name;
		}

		if (updates.envContent !== undefined) {
			updateData.envFile = updates.envContent ? '.env' : null;
		}

		await db.update(stacks).set(updateData).where(eq(stacks.id, existingStack.id));

		// Return updated stack data
		const updatedStack = await this.getStack(stackDirName);
		if (!updatedStack) {
			throw new Error(`Failed to retrieve updated stack "${stackDirName}"`);
		}

		return updatedStack;
	}

	/**
	 * Get a specific stack
	 */
	async getStack(stackDirName: string): Promise<Stack | null> {
		await this.init();

		// Find the stack by path (directory name)
		const stackRecords = await db.select().from(stacks).where(eq(stacks.path, stackDirName)).limit(1);
		if (stackRecords.length === 0) {
			return null;
		}

		const stackRecord = stackRecords[0];
		const stackDir = await getStackDir(stackDirName);

		// Read compose and env files
		let composeContent = '';
		let envContent = '';

		try {
			composeContent = await fs.readFile(path.join(stackDir, 'compose.yaml'), 'utf8');
		} catch {
			try {
				composeContent = await fs.readFile(path.join(stackDir, 'docker-compose.yml'), 'utf8');
			} catch {
				// No compose file found
			}
		}

		if (stackRecord.envFile) {
			try {
				envContent = await fs.readFile(path.join(stackDir, stackRecord.envFile), 'utf8');
			} catch {
				// Env file not found or not readable
			}
		}

		return {
			id: stackDirName,
			name: stackRecord.name,
			serviceCount: 0, // This would need to be calculated from compose content
			runningCount: 0, // This would need to be calculated from Docker API
			status: 'unknown', // This would need to be calculated from Docker API
			createdAt: stackRecord.createdAt,
			updatedAt: stackRecord.updatedAt,
			composeContent,
			envContent,
			isExternal: false
		};
	}

	/**
	 * List all stacks from database
	 */
	async listStacks(): Promise<Stack[]> {
		await this.init();

		const stackRecords = await db.select().from(stacks).orderBy(desc(stacks.createdAt));
		const stacksList: Stack[] = [];

		for (const record of stackRecords) {
			const stack = await this.getStack(record.path);
			if (stack) {
				stacksList.push(stack);
			}
		}

		return stacksList;
	}

	/**
	 * Delete a stack from database and optionally remove files
	 */
	async deleteStack(stackDirName: string, removeFiles = false): Promise<boolean> {
		await this.init();

		try {
			// Find the stack by path (directory name)
			const stackRecords = await db.select().from(stacks).where(eq(stacks.path, stackDirName)).limit(1);
			if (stackRecords.length === 0) {
				return false;
			}

			const stackRecord = stackRecords[0];

			// Remove from database
			await db.delete(stacks).where(eq(stacks.id, stackRecord.id));

			// Remove files if requested
			if (removeFiles) {
				const stackDir = await getStackDir(stackDirName);
				try {
					await fs.rm(stackDir, { recursive: true, force: true });
				} catch (err) {
					console.warn(`Error removing stack files at ${stackDir}:`, err);
					// Continue execution - don't fail if files can't be removed
				}
			}

			return true;
		} catch (error) {
			console.error(`Error deleting stack ${stackDirName}:`, error);
			return false;
		}
	}

	/**
	 * Import an external stack into the database
	 */
	async importStack(stackName: string, composeContent: string, envContent?: string): Promise<Stack> {
		await this.init();

		return this.createStack(stackName, composeContent, envContent);
	}

	/**
	 * Migrate existing file-based stacks to the database
	 */
	async migrateFileBasedStacks(): Promise<{ success: number; failed: number; errors: string[] }> {
		await this.init();

		const settings = await getSettings();
		const stacksDir = settings.stacksDirectory;
		const results = { success: 0, failed: 0, errors: [] as string[] };

		try {
			// Check if stacks directory exists
			const stat = await fs.stat(stacksDir);
			if (!stat.isDirectory()) {
				results.errors.push(`Stacks directory not found: ${stacksDir}`);
				return results;
			}

			// Get all directories in stacks folder
			const entries = await fs.readdir(stacksDir, { withFileTypes: true });
			const stackDirs = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => entry.name);

			if (stackDirs.length === 0) {
				console.log('📝 No stack directories found to migrate.');
				return results;
			}

			console.log(`📂 Found ${stackDirs.length} stack directories to check: ${stackDirs.join(', ')}`);

			// Process each stack directory
			for (const stackDirName of stackDirs) {
				const stackPath = path.join(stacksDir, stackDirName);
				console.log(`🔍 Processing stack: ${stackDirName}`);

				try {
					// Check if stack already exists in database
					const existingStack = await this.getStack(stackDirName);
					if (existingStack) {
						console.log(`   ⚠️  Stack "${stackDirName}" already exists in database, skipping`);
						continue;
					}

					// Look for compose files (prefer compose.yaml, fallback to docker-compose.yml)
					let composeContent = '';
					let composeFile = '';

					const possibleComposeFiles = ['compose.yaml', 'docker-compose.yml', 'compose.yml', 'docker-compose.yaml'];

					for (const filename of possibleComposeFiles) {
						const composePath = path.join(stackPath, filename);
						try {
							composeContent = await fs.readFile(composePath, 'utf8');
							composeFile = filename;
							console.log(`   📄 Found compose file: ${composeFile}`);
							break;
						} catch {
							// Continue to next file
						}
					}

					if (!composeContent) {
						throw new Error('No compose file found (looking for compose.yaml, docker-compose.yml, etc.)');
					}

					// Look for .env file
					let envContent = '';
					const envPath = path.join(stackPath, '.env');
					try {
						envContent = await fs.readFile(envPath, 'utf8');
						console.log(`   🔧 Found .env file`);
					} catch {
						console.log(`   ℹ️  No .env file found`);
					}

					// Create database entry for existing stack
					console.log(`   🔄 Importing stack "${stackDirName}" into database...`);

					const stackId = nanoid();
					const now = new Date().toISOString();

					await db.insert(stacks).values({
						id: stackId,
						name: stackDirName, // Use directory name as stack name
						description: `Migrated stack: ${stackDirName}`,
						path: stackDirName, // Store the directory name as the path
						composeFile: composeFile,
						envFile: envContent ? '.env' : null,
						isTemplate: false,
						isActive: true,
						createdAt: now,
						updatedAt: now
					});

					console.log(`   ✅ Successfully migrated stack: ${stackDirName}`);
					results.success++;
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					console.error(`   ❌ Failed to migrate stack "${stackDirName}": ${errorMessage}`);
					results.errors.push(`${stackDirName}: ${errorMessage}`);
					results.failed++;
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`❌ Migration failed: ${errorMessage}`);
			results.errors.push(`GLOBAL: ${errorMessage}`);
			results.failed++;
		}

		console.log(`📊 Migration completed: ${results.success} successful, ${results.failed} failed`);
		return results;
	}

	private async directoryExists(dirPath: string): Promise<boolean> {
		try {
			const stat = await fs.stat(dirPath);
			return stat.isDirectory();
		} catch {
			return false;
		}
	}
}

// Create a singleton instance
export const databaseStackService = new DatabaseStackService();
