import { eq } from 'drizzle-orm';
import { stacksTable } from '../../../db/schema';
import type { Stack } from '$lib/types/docker/stack.type';
import fs from 'node:fs/promises';
import path from 'node:path';
import { STACKS_DIR } from '../paths-service';
import { db } from '../../../db';

// The toUnixTimestamp and fromUnixTimestamp helpers might still be useful
// for converting between numbers and ISO strings if your Stack type uses one of those,
// but for direct Drizzle interaction with { mode: 'timestamp' }, we'll use Date objects.

/**
 * Helper function to safely convert dates to Unix timestamps (numbers)
 * This might be used if the Stack type itself uses numeric timestamps.
 */
function toUnixTimestamp(date: string | Date | number): number {
	if (typeof date === 'number') {
		// Already a timestamp, but ensure it's in seconds
		return date > 1000000000000 ? Math.floor(date / 1000) : date;
	}
	if (typeof date === 'string') {
		return Math.floor(new Date(date).getTime() / 1000);
	}
	if (date instanceof Date) {
		return Math.floor(date.getTime() / 1000);
	}
	// Fallback to current time if input is invalid
	console.warn('toUnixTimestamp received invalid date input, using Date.now()');
	return Math.floor(Date.now() / 1000);
}

/**
 * Helper function to safely convert Unix timestamps (numbers) to ISO strings.
 * Used if Stack type expects ISO strings.
 */
function fromUnixTimestampToISOString(timestamp: number | null | undefined): string | undefined {
	if (timestamp === null || timestamp === undefined) return undefined;
	// Ensure timestamp is in milliseconds for Date constructor
	const ms = timestamp < 1000000000000 ? timestamp * 1000 : timestamp;
	return new Date(ms).toISOString();
}

/**
 * Helper function to convert various date inputs to a Date object.
 */
function ensureDateObject(dateInput: string | Date | number | null | undefined): Date | null {
	if (dateInput === null || dateInput === undefined) return null;
	if (dateInput instanceof Date) return dateInput;
	if (typeof dateInput === 'string') return new Date(dateInput);
	if (typeof dateInput === 'number') {
		// Assume Unix timestamp (seconds or milliseconds)
		return new Date(dateInput * (dateInput < 1000000000000 ? 1000 : 1));
	}
	console.warn('ensureDateObject received invalid input:', dateInput);
	return null;
}

/**
 * Load stacks directly from files for migration (to avoid circular dependency)
 */
async function loadStacksFromFiles(): Promise<Stack[]> {
	try {
		const stackDirEntries = await fs.readdir(STACKS_DIR, { withFileTypes: true });
		const stacks: Stack[] = [];

		for (const entry of stackDirEntries) {
			if (!entry.isDirectory()) {
				continue;
			}

			const dirName = entry.name;
			const stackDir = path.join(STACKS_DIR, dirName);

			let composeContent = '';

			const potentialComposePaths = [path.join(stackDir, 'compose.yaml'), path.join(stackDir, 'docker-compose.yml'), path.join(stackDir, 'compose.yml'), path.join(stackDir, 'docker-compose.yaml')];

			for (const p of potentialComposePaths) {
				try {
					await fs.access(p);
					composeContent = await fs.readFile(p, 'utf8');
					break;
				} catch {
					// File not accessible or doesn't exist, try next
				}
			}

			if (!composeContent) {
				console.warn(`No compose file found in directory ${dirName}, skipping.`);
				continue;
			}

			let dirStat;
			try {
				dirStat = await fs.stat(stackDir);
			} catch (statErr) {
				console.error(`Could not stat directory ${stackDir}:`, statErr);
				const now = new Date();
				dirStat = { birthtime: now, mtime: now };
			}

			stacks.push({
				id: dirName,
				name: dirName,
				serviceCount: 0,
				runningCount: 0,
				status: 'unknown',
				createdAt: dirStat.birthtime.toISOString(),
				updatedAt: dirStat.mtime.toISOString(),
				isExternal: false
			});
		}

		return stacks;
	} catch (err) {
		console.error('Error loading stacks from STACKS_DIR:', err);
		throw new Error('Failed to load compose stacks');
	}
}

/**
 * Migrates stacks from file-based storage to database
 */
export async function migrateStacksToDatabase(backupOldFiles: boolean = true): Promise<{
	success: boolean;
	migratedCount: number;
	errors: string[];
}> {
	const errors: string[] = [];
	let migratedCount = 0;

	try {
		console.log('Starting stack migration from file to database...');
		const fileStacks = await loadStacksFromFiles();
		console.log(`Found ${fileStacks.length} stacks in file system`);

		if (fileStacks.length === 0) {
			console.log('No stacks found in file system. Migration completed.');
			return { success: true, migratedCount: 0, errors: [] };
		}

		const existingStacks = await db.select({ id: stacksTable.id }).from(stacksTable).limit(1);
		if (existingStacks.length > 0) {
			console.log('Stacks already exist in database. Migration aborted.');
			return { success: false, migratedCount: 0, errors: ['Stacks already exist in database'] };
		}

		for (const stack of fileStacks) {
			// stack.createdAt and stack.updatedAt are ISO strings from loadStacksFromFiles
			try {
				// ... (reading composeContent, envContent) ...
				// ...existing code...
				const stackDir = path.join(STACKS_DIR, stack.id);
				let composeContent = '';
				let envContent = '';

				const potentialComposePaths = [path.join(stackDir, 'compose.yaml'), path.join(stackDir, 'docker-compose.yml'), path.join(stackDir, 'compose.yml'), path.join(stackDir, 'docker-compose.yaml')];
				for (const composePath of potentialComposePaths) {
					try {
						composeContent = await fs.readFile(composePath, 'utf8');
						break;
					} catch {
						/* Try next path */
					}
				}
				try {
					const envPath = path.join(stackDir, '.env');
					envContent = await fs.readFile(envPath, 'utf8');
				} catch {
					/* .env file doesn't exist, that's ok */
				}

				const dbInsertValues = {
					id: stack.id,
					name: stack.name,
					dirName: stack.id, // Assuming dirName is stack.id for migration
					path: stackDir, // Assuming path is STACKS_DIR + stack.id
					autoUpdate: false, // Default value
					isExternal: stack.isExternal || false,
					isLegacy: stack.isLegacy || false,
					isRemote: stack.isRemote || false,
					agentId: stack.agentId || null,
					agentHostname: stack.agentHostname || null,
					status: stack.status,
					serviceCount: stack.serviceCount || 0,
					runningCount: stack.runningCount || 0,
					composeContent: composeContent || null,
					envContent: envContent || null,
					lastPolled: null, // Explicitly null for new migration
					createdAt: ensureDateObject(stack.createdAt) || new Date(), // Convert ISO string to Date
					updatedAt: ensureDateObject(stack.updatedAt) || new Date() // Convert ISO string to Date
				};

				await db.insert(stacksTable).values(dbInsertValues);
				migratedCount++;
				console.log(`Migrated stack: ${stack.name}`);
			} catch (error) {
				const errorMsg = `Failed to migrate stack ${stack.name}: ${error}`;
				console.error(errorMsg);
				errors.push(errorMsg);
			}
		}
		// ...existing code...
	} catch (error) {
		console.error('Failed to migrate stacks to database:', error);
		return {
			success: false,
			migratedCount,
			errors: [...errors, `Migration failed: ${String(error)}`]
		};
	}
	// Add return statement if it was missing from the original snippet
	return { success: errors.length === 0, migratedCount, errors };
}

/**
 * Gets a stack from database by ID
 */
export async function getStackByIdFromDb(id: string): Promise<Stack | null> {
	try {
		const result = await db.select().from(stacksTable).where(eq(stacksTable.id, id)).limit(1);
		if (result.length === 0) return null;
		const dbStack = result[0]; // dbStack.createdAt, .updatedAt, .lastPolled are Date objects or null

		return {
			id: dbStack.id,
			name: dbStack.name,
			serviceCount: dbStack.serviceCount,
			runningCount: dbStack.runningCount,
			status: dbStack.status as 'running' | 'stopped' | 'partially running' | 'unknown',
			isExternal: dbStack.isExternal,
			isLegacy: dbStack.isLegacy,
			isRemote: dbStack.isRemote,
			agentId: dbStack.agentId || undefined,
			agentHostname: dbStack.agentHostname || undefined,
			createdAt: dbStack.createdAt.toISOString(), // Convert Date to ISO String
			updatedAt: dbStack.updatedAt.toISOString(), // Convert Date to ISO String
			lastPolled: dbStack.lastPolled ? dbStack.lastPolled.toISOString() : undefined, // Convert Date to ISO String
			composeContent: dbStack.composeContent || undefined,
			envContent: dbStack.envContent || undefined
		};
	} catch (error) {
		console.error('Failed to get stack from database:', error);
		throw error;
	}
}

/**
 * Gets a stack from database by name
 */
export async function getStackByNameFromDb(name: string): Promise<Stack | null> {
	try {
		const result = await db.select().from(stacksTable).where(eq(stacksTable.name, name)).limit(1);
		if (result.length === 0) return null;
		const dbStack = result[0];

		return {
			id: dbStack.id,
			name: dbStack.name,
			serviceCount: dbStack.serviceCount,
			runningCount: dbStack.runningCount,
			status: dbStack.status as 'running' | 'stopped' | 'partially running' | 'unknown',
			isExternal: dbStack.isExternal,
			isLegacy: dbStack.isLegacy,
			isRemote: dbStack.isRemote,
			agentId: dbStack.agentId || undefined,
			agentHostname: dbStack.agentHostname || undefined,
			createdAt: dbStack.createdAt.toISOString(),
			updatedAt: dbStack.updatedAt.toISOString(),
			lastPolled: dbStack.lastPolled ? dbStack.lastPolled.toISOString() : undefined,
			composeContent: dbStack.composeContent || undefined,
			envContent: dbStack.envContent || undefined
		};
	} catch (error) {
		console.error('Failed to get stack by name from database:', error);
		throw error;
	}
}

/**
 * Lists all stacks from database
 */
export async function listStacksFromDb(): Promise<Stack[]> {
	try {
		const result = await db.select().from(stacksTable);

		return result.map((dbStack) => ({
			id: dbStack.id,
			name: dbStack.name,
			serviceCount: dbStack.serviceCount,
			runningCount: dbStack.runningCount,
			status: dbStack.status as 'running' | 'stopped' | 'partially running' | 'unknown',
			isExternal: dbStack.isExternal,
			isLegacy: dbStack.isLegacy,
			isRemote: dbStack.isRemote,
			agentId: dbStack.agentId || undefined,
			agentHostname: dbStack.agentHostname || undefined,
			createdAt: dbStack.createdAt.toISOString(),
			updatedAt: dbStack.updatedAt.toISOString(),
			composeContent: dbStack.composeContent || undefined,
			envContent: dbStack.envContent || undefined,
			services: []
		}));
	} catch (error) {
		console.error('Failed to list stacks from database:', error);
		throw error;
	}
}

/**
 * Saves a stack to database (create or update)
 */
export async function saveStackToDb(stack: Stack): Promise<Stack> {
	// Assuming Stack type uses ISO strings for dates
	try {
		const now = new Date();
		// Ensure createdAt, updatedAt, and lastPolled are Date objects for DB
		const createdAtForDb = ensureDateObject(stack.createdAt) || now;
		const lastPolledForDb = ensureDateObject(stack.lastPolled);

		const dataToSave = {
			id: stack.id,
			name: stack.name,
			dirName: stack.dirName || stack.id,
			path: stack.path || path.join(STACKS_DIR, stack.id), // Ensure path is provided or derived
			isExternal: typeof stack.isExternal === 'boolean' ? stack.isExternal : false,
			isLegacy: typeof stack.isLegacy === 'boolean' ? stack.isLegacy : false,
			isRemote: typeof stack.isRemote === 'boolean' ? stack.isRemote : false,
			agentId: stack.agentId || null,
			agentHostname: stack.agentHostname || null,
			status: stack.status,
			serviceCount: stack.serviceCount || 0,
			runningCount: stack.runningCount || 0,
			composeContent: stack.composeContent || null,
			envContent: stack.envContent || null,
			lastPolled: lastPolledForDb
		};

		const existing = await db.select({ id: stacksTable.id }).from(stacksTable).where(eq(stacksTable.id, stack.id)).limit(1);

		if (existing.length > 0) {
			await db
				.update(stacksTable)
				.set({
					...dataToSave,
					updatedAt: now // Always update 'updatedAt' on modification
				})
				.where(eq(stacksTable.id, stack.id));
		} else {
			await db.insert(stacksTable).values({
				...dataToSave,
				createdAt: createdAtForDb, // Set 'createdAt' for new records
				updatedAt: now // Set 'updatedAt' for new records
			});
		}
		// Return the stack. Its date fields are strings. If you need to reflect the exact DB Date objects,
		// you might re-fetch or update the stack object.
		return stack;
	} catch (error) {
		console.error('Failed to save stack to database:', error);
		throw error;
	}
}

/**
 * Updates stack runtime information (status, service counts, last polled)
 */
export async function updateStackRuntimeInfoInDb(
	id: string,
	updates: {
		status?: 'running' | 'stopped' | 'partially running' | 'unknown';
		serviceCount?: number;
		runningCount?: number;
		lastPolled?: Date | string | number; // Input can be flexible
	}
): Promise<void> {
	try {
		const updateData: Partial<typeof stacksTable.$inferInsert> = {
			updatedAt: new Date() // Pass Date object directly
		};

		if (updates.status !== undefined) updateData.status = updates.status;
		if (updates.serviceCount !== undefined) updateData.serviceCount = updates.serviceCount;
		if (updates.runningCount !== undefined) updateData.runningCount = updates.runningCount;

		if (updates.lastPolled !== undefined) {
			updateData.lastPolled = ensureDateObject(updates.lastPolled);
		}

		await db.update(stacksTable).set(updateData).where(eq(stacksTable.id, id));
	} catch (error) {
		console.error('Failed to update stack runtime info in database:', error);
		throw error;
	}
}

/**
 * Updates stack content (compose and env files)
 */
export async function updateStackContentInDb(
	id: string,
	updates: {
		composeContent?: string;
		envContent?: string;
	}
): Promise<void> {
	try {
		const updateData: Partial<typeof stacksTable.$inferInsert> = {
			updatedAt: new Date() // Pass Date object
		};

		if (updates.composeContent !== undefined) updateData.composeContent = updates.composeContent;
		if (updates.envContent !== undefined) updateData.envContent = updates.envContent;

		await db.update(stacksTable).set(updateData).where(eq(stacksTable.id, id));
	} catch (error) {
		console.error('Failed to update stack content in database:', error);
		throw error;
	}
}

/**
 * Deletes a stack from database
 */
export async function deleteStackFromDb(id: string): Promise<boolean> {
	try {
		await db.delete(stacksTable).where(eq(stacksTable.id, id));
		return true;
	} catch (error) {
		console.error('Failed to delete stack from database:', error);
		throw error;
	}
}

/**
 * Gets stacks by agent ID (for remote stacks)
 */
export async function getStacksByAgentIdFromDb(agentId: string): Promise<Stack[]> {
	try {
		const result = await db.select().from(stacksTable).where(eq(stacksTable.agentId, agentId));
		return result.map((dbStack) => ({
			id: dbStack.id,
			name: dbStack.name,
			serviceCount: dbStack.serviceCount,
			runningCount: dbStack.runningCount,
			status: dbStack.status as 'running' | 'stopped' | 'partially running' | 'unknown',
			isExternal: dbStack.isExternal,
			isLegacy: dbStack.isLegacy,
			isRemote: dbStack.isRemote,
			agentId: dbStack.agentId || undefined,
			agentHostname: dbStack.agentHostname || undefined,
			createdAt: dbStack.createdAt.toISOString(),
			updatedAt: dbStack.updatedAt.toISOString(),
			lastPolled: dbStack.lastPolled ? dbStack.lastPolled.toISOString() : undefined,
			composeContent: dbStack.composeContent || undefined,
			envContent: dbStack.envContent || undefined
		}));
	} catch (error) {
		console.error('Failed to get stacks by agent ID from database:', error);
		throw error;
	}
}

/**
 * Updates stack auto-update setting
 */
export async function updateStackAutoUpdateInDb(id: string, autoUpdate: boolean): Promise<void> {
	try {
		await db
			.update(stacksTable)
			.set({
				autoUpdate,
				updatedAt: new Date() // Pass Date object
			})
			.where(eq(stacksTable.id, id));
	} catch (error) {
		console.error('Failed to update stack auto-update setting in database:', error);
		throw error;
	}
}

/**
 * Gets stacks that have auto-update enabled
 */
export async function getAutoUpdateStacksFromDb(): Promise<Stack[]> {
	try {
		const result = await db.select().from(stacksTable).where(eq(stacksTable.autoUpdate, true));
		return result.map((dbStack) => ({
			id: dbStack.id,
			name: dbStack.name,
			serviceCount: dbStack.serviceCount,
			runningCount: dbStack.runningCount,
			status: dbStack.status as 'running' | 'stopped' | 'partially running' | 'unknown',
			isExternal: dbStack.isExternal,
			isLegacy: dbStack.isLegacy,
			isRemote: dbStack.isRemote,
			agentId: dbStack.agentId || undefined,
			agentHostname: dbStack.agentHostname || undefined,
			createdAt: dbStack.createdAt.toISOString(),
			updatedAt: dbStack.updatedAt.toISOString(),
			lastPolled: dbStack.lastPolled ? dbStack.lastPolled.toISOString() : undefined,
			composeContent: dbStack.composeContent || undefined,
			envContent: dbStack.envContent || undefined
		}));
	} catch (error) {
		console.error('Failed to get auto-update stacks from database:', error);
		throw error;
	}
}
