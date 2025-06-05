import { eq } from 'drizzle-orm';
import { deploymentsTable } from '../../../db/schema';
import type { Deployment } from '$lib/types/deployment.type';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BASE_PATH } from '../paths-service';
import { db } from '../../../db';

const DEPLOYMENTS_DIR = path.join(BASE_PATH, 'deployments');

/**
 * Migrates deployments from file-based storage to database
 * @param backupOldFiles - Whether to backup the old deployment files (default: true)
 * @returns Promise<{ success: boolean, migratedCount: number, errors: string[] }>
 */
export async function migrateDeploymentsToDatabase(backupOldFiles: boolean = true): Promise<{
	success: boolean;
	migratedCount: number;
	errors: string[];
}> {
	const errors: string[] = [];
	let migratedCount = 0;

	try {
		console.log('Starting deployment migration from file to database...');

		// Get current deployments from file-based system
		const fileDeployments = await getDeploymentsFromFiles();
		console.log(`Found ${fileDeployments.length} deployments in file system`);

		if (fileDeployments.length === 0) {
			console.log('No deployments found in file system. Migration completed.');
			return { success: true, migratedCount: 0, errors: [] };
		}

		// Check if deployments already exist in database
		const existingDeployments = await db.select().from(deploymentsTable).limit(1);

		if (existingDeployments.length > 0) {
			console.log('Deployments already exist in database. Migration aborted.');
			return { success: false, migratedCount: 0, errors: ['Deployments already exist in database'] };
		}

		// Migrate each deployment to database
		for (const deployment of fileDeployments) {
			try {
				const insertData = {
					id: deployment.id,
					name: deployment.name,
					type: deployment.type,
					status: deployment.status,
					agentId: deployment.agentId,
					taskId: deployment.taskId || null,
					error: deployment.error || null,
					metadata: deployment.metadata ? JSON.stringify(deployment.metadata) : null,
					createdAt: new Date(deployment.createdAt),
					updatedAt: deployment.updatedAt ? new Date(deployment.updatedAt) : new Date(deployment.createdAt)
				} satisfies typeof deploymentsTable.$inferInsert;

				await db.insert(deploymentsTable).values(insertData);

				migratedCount++;
				console.log(`Migrated deployment: ${deployment.name} (${deployment.id})`);
			} catch (error) {
				const errorMsg = `Failed to migrate deployment ${deployment.name}: ${error}`;
				console.error(errorMsg);
				errors.push(errorMsg);
			}
		}

		console.log(`Successfully migrated ${migratedCount} deployments to database`);

		// Backup old deployment files if requested
		if (backupOldFiles && migratedCount > 0) {
			try {
				const backupDir = path.join(DEPLOYMENTS_DIR, `backup-${Date.now()}`);
				await fs.mkdir(backupDir, { recursive: true });

				const files = await fs.readdir(DEPLOYMENTS_DIR);
				const deploymentFiles = files.filter((file) => file.endsWith('.json'));

				for (const file of deploymentFiles) {
					const sourcePath = path.join(DEPLOYMENTS_DIR, file);
					const backupPath = path.join(backupDir, file);

					try {
						await fs.copyFile(sourcePath, backupPath);
					} catch (copyError) {
						console.warn(`Could not backup deployment file ${file}:`, copyError);
					}
				}

				console.log(`Deployment files backed up to: ${backupDir}`);
			} catch (backupError) {
				console.warn('Could not create backup of deployment files:', backupError);
				errors.push(`Backup failed: ${backupError}`);
			}
		}

		return {
			success: errors.length === 0,
			migratedCount,
			errors
		};
	} catch (error) {
		console.error('Failed to migrate deployments to database:', error);
		return {
			success: false,
			migratedCount,
			errors: [...errors, `Migration failed: ${error}`]
		};
	}
}

/**
 * Read deployments directly from file system (for migration purposes)
 */
async function getDeploymentsFromFiles(): Promise<Deployment[]> {
	try {
		// Check if deployments directory exists
		const dirExists = await fs
			.access(DEPLOYMENTS_DIR)
			.then(() => true)
			.catch(() => false);

		if (!dirExists) {
			console.log('No deployments directory found for migration');
			return [];
		}

		const files = await fs.readdir(DEPLOYMENTS_DIR);
		const deployments: Deployment[] = [];

		for (const file of files) {
			if (file.endsWith('.json')) {
				try {
					const filePath = path.join(DEPLOYMENTS_DIR, file);
					const fileContent = await fs.readFile(filePath, 'utf-8');
					const deployment = JSON.parse(fileContent) as Deployment;
					deployments.push(deployment);
				} catch (error) {
					console.warn(`Could not read deployment file ${file}:`, error);
				}
			}
		}

		return deployments;
	} catch (error) {
		console.error('Error reading deployments from file system:', error);
		return [];
	}
}

/**
 * Gets deployments from database
 */
export async function getDeploymentsFromDb(agentId?: string): Promise<Deployment[]> {
	try {
		const query = agentId ? db.select().from(deploymentsTable).where(eq(deploymentsTable.agentId, agentId)) : db.select().from(deploymentsTable);

		const dbDeployments = await query;

		return dbDeployments.map((dbDeployment) => ({
			id: dbDeployment.id,
			name: dbDeployment.name,
			type: dbDeployment.type,
			status: dbDeployment.status,
			agentId: dbDeployment.agentId,
			taskId: dbDeployment.taskId || undefined,
			error: dbDeployment.error || undefined,
			metadata: dbDeployment.metadata ? JSON.parse(dbDeployment.metadata as string) : undefined,
			createdAt: dbDeployment.createdAt.toISOString(),
			updatedAt: dbDeployment.updatedAt?.toISOString()
		})) as Deployment[];
	} catch (error) {
		console.error('Failed to get deployments from database:', error);
		return [];
	}
}

/**
 * Gets a single deployment from database
 */
export async function getDeploymentFromDb(deploymentId: string): Promise<Deployment | null> {
	try {
		const dbDeployments = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, deploymentId)).limit(1);

		if (dbDeployments.length === 0) {
			return null;
		}

		const dbDeployment = dbDeployments[0];

		return {
			id: dbDeployment.id,
			name: dbDeployment.name,
			type: dbDeployment.type,
			status: dbDeployment.status,
			agentId: dbDeployment.agentId,
			taskId: dbDeployment.taskId || undefined,
			error: dbDeployment.error || undefined,
			metadata: dbDeployment.metadata ? JSON.parse(dbDeployment.metadata as string) : undefined,
			createdAt: dbDeployment.createdAt.toISOString(),
			updatedAt: dbDeployment.updatedAt?.toISOString()
		} as Deployment;
	} catch (error) {
		console.error('Failed to get deployment from database:', error);
		return null;
	}
}

/**
 * Saves a deployment to database (create or update)
 */
export async function saveDeploymentToDb(deployment: Deployment): Promise<Deployment> {
	try {
		const now = new Date();
		const createdAtForDb = new Date(deployment.createdAt);

		const deploymentData = {
			id: deployment.id,
			name: deployment.name,
			type: deployment.type,
			status: deployment.status,
			agentId: deployment.agentId,
			taskId: deployment.taskId || null,
			error: deployment.error || null,
			metadata: deployment.metadata ? JSON.stringify(deployment.metadata) : null,
			createdAt: createdAtForDb,
			updatedAt: now
		};

		// Check if deployment exists
		const existing = await db.select({ id: deploymentsTable.id }).from(deploymentsTable).where(eq(deploymentsTable.id, deployment.id)).limit(1);

		if (existing.length > 0) {
			// Update existing deployment
			await db
				.update(deploymentsTable)
				.set({
					...deploymentData,
					updatedAt: now
				})
				.where(eq(deploymentsTable.id, deployment.id));
		} else {
			// Insert new deployment
			await db.insert(deploymentsTable).values(deploymentData);
		}

		return deployment;
	} catch (error) {
		console.error('Failed to save deployment to database:', error);
		throw error;
	}
}

/**
 * Updates deployment status and related fields
 */
export async function updateDeploymentInDb(
	deploymentId: string,
	updates: {
		status?: 'pending' | 'running' | 'stopped' | 'failed' | 'completed';
		error?: string;
		metadata?: any;
	}
): Promise<void> {
	try {
		const updateData: Partial<typeof deploymentsTable.$inferInsert> = {
			updatedAt: new Date()
		};

		if (updates.status !== undefined) updateData.status = updates.status;
		if (updates.error !== undefined) updateData.error = updates.error;
		if (updates.metadata !== undefined) {
			updateData.metadata = updates.metadata ? JSON.stringify(updates.metadata) : null;
		}

		await db.update(deploymentsTable).set(updateData).where(eq(deploymentsTable.id, deploymentId));
	} catch (error) {
		console.error('Failed to update deployment in database:', error);
		throw error;
	}
}

/**
 * Deletes a deployment from database
 */
export async function deleteDeploymentFromDb(deploymentId: string): Promise<boolean> {
	try {
		await db.delete(deploymentsTable).where(eq(deploymentsTable.id, deploymentId));
		return true;
	} catch (error) {
		console.error('Failed to delete deployment from database:', error);
		return false;
	}
}

/**
 * Gets deployments by task ID
 */
export async function getDeploymentByTaskIdFromDb(taskId: string): Promise<Deployment | null> {
	try {
		const dbDeployments = await db.select().from(deploymentsTable).where(eq(deploymentsTable.taskId, taskId)).limit(1);

		if (dbDeployments.length === 0) {
			return null;
		}

		const dbDeployment = dbDeployments[0];

		return {
			id: dbDeployment.id,
			name: dbDeployment.name,
			type: dbDeployment.type,
			status: dbDeployment.status,
			agentId: dbDeployment.agentId,
			taskId: dbDeployment.taskId || undefined,
			error: dbDeployment.error || undefined,
			metadata: dbDeployment.metadata ? JSON.parse(dbDeployment.metadata as string) : undefined,
			createdAt: dbDeployment.createdAt.toISOString(),
			updatedAt: dbDeployment.updatedAt?.toISOString()
		} as Deployment;
	} catch (error) {
		console.error('Failed to get deployment by task ID from database:', error);
		return null;
	}
}
