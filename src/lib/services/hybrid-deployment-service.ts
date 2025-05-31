/**
 * Hybrid Deployment Service
 * Database-first approach with file fallback for deployments
 * Automatically handles migration from file storage to database
 */

import fs from 'fs/promises';
import path from 'path';
import { DatabaseDeploymentService } from './database-deployment-service';
import { DeploymentMigrationService } from './deployment-migration-service';
import type { Deployment } from '$lib/types/deployment.type';

export class HybridDeploymentService {
	private static instance: HybridDeploymentService | null = null;
	private dbService: DatabaseDeploymentService;
	private migrationService: DeploymentMigrationService;
	private dataDir = '/Users/kylemendell/dev/ofkm/arcane/data/deployments';
	private migrationChecked = false;

	static getInstance(): HybridDeploymentService {
		if (!HybridDeploymentService.instance) {
			HybridDeploymentService.instance = new HybridDeploymentService();
		}
		return HybridDeploymentService.instance;
	}

	constructor() {
		this.dbService = DatabaseDeploymentService.getInstance();
		this.migrationService = DeploymentMigrationService.getInstance();
	}

	/**
	 * Ensure migration is checked and performed if needed
	 */
	private async ensureMigration(): Promise<void> {
		if (this.migrationChecked) {
			return;
		}

		try {
			const hasDeploymentsMigrated = await this.migrationService.hasDeploymentsMigrated();

			if (!hasDeploymentsMigrated) {
				console.log('🔄 Deployments not migrated yet, starting automatic migration...');
				const result = await this.migrationService.migrateDeployments();

				if (result.success) {
					console.log(`✅ Successfully migrated ${result.migratedCount} deployments to database`);
				} else {
					console.warn(`⚠️ Migration completed with ${result.errors.length} errors`);
					result.errors.forEach((error) => console.error(`   ❌ ${error}`));
				}
			} else {
				console.log('✅ Deployments already migrated to database');
			}
		} catch (error) {
			console.error('❌ Error during deployment migration check:', error);
		}

		this.migrationChecked = true;
	}

	/**
	 * Save a deployment (database-first)
	 */
	async saveDeployment(deployment: Deployment): Promise<Deployment> {
		await this.ensureMigration();

		try {
			// Try database first
			return await this.dbService.saveDeployment(deployment);
		} catch (dbError) {
			console.error('❌ Failed to save deployment to database, falling back to file:', dbError);

			// Fallback to file storage
			try {
				await this.saveDeploymentToFile(deployment);
				return deployment;
			} catch (fileError) {
				console.error('❌ Failed to save deployment to file:', fileError);
				throw new Error(`Failed to save deployment to both database and file: DB(${dbError}), File(${fileError})`);
			}
		}
	}

	/**
	 * Get a deployment by ID (database-first with file fallback)
	 */
	async getDeploymentById(id: string): Promise<Deployment | null> {
		await this.ensureMigration();

		try {
			// Try database first
			const deployment = await this.dbService.getDeploymentById(id);
			if (deployment) {
				return deployment;
			}
		} catch (dbError) {
			console.error('❌ Failed to get deployment from database, trying file fallback:', dbError);
		}

		// Fallback to file storage
		try {
			return await this.getDeploymentFromFile(id);
		} catch (fileError) {
			console.error('❌ Failed to get deployment from file:', fileError);
			return null;
		}
	}

	/**
	 * List all deployments (database-first with file fallback)
	 */
	async listDeployments(): Promise<Deployment[]> {
		await this.ensureMigration();

		try {
			// Try database first
			const deployments = await this.dbService.listDeployments();
			if (deployments.length > 0) {
				return deployments;
			}

			// If no deployments in database, check if we have files
			const fileDeployments = await this.listDeploymentsFromFiles();
			if (fileDeployments.length > 0) {
				console.log('⚠️ Found deployments in files but not in database, consider re-running migration');
				return fileDeployments;
			}

			return deployments; // Return empty array from database
		} catch (dbError) {
			console.error('❌ Failed to list deployments from database, falling back to files:', dbError);

			// Fallback to file storage
			try {
				return await this.listDeploymentsFromFiles();
			} catch (fileError) {
				console.error('❌ Failed to list deployments from files:', fileError);
				return [];
			}
		}
	}

	/**
	 * List deployments by agent ID (database-first with file fallback)
	 */
	async listDeploymentsByAgent(agentId: string): Promise<Deployment[]> {
		await this.ensureMigration();

		try {
			// Try database first
			return await this.dbService.listDeploymentsByAgent(agentId);
		} catch (dbError) {
			console.error('❌ Failed to list deployments by agent from database, falling back to files:', dbError);

			// Fallback to file storage
			try {
				const allDeployments = await this.listDeploymentsFromFiles();
				return allDeployments.filter((deployment) => deployment.agentId === agentId);
			} catch (fileError) {
				console.error('❌ Failed to list deployments by agent from files:', fileError);
				return [];
			}
		}
	}

	/**
	 * Update deployment status (database-first)
	 */
	async updateDeploymentStatus(id: string, status: string, error?: string): Promise<void> {
		await this.ensureMigration();

		try {
			// Try database first
			await this.dbService.updateDeploymentStatus(id, status, error);
		} catch (dbError) {
			console.error('❌ Failed to update deployment status in database, falling back to file:', dbError);

			// Fallback to file storage
			try {
				const deployment = await this.getDeploymentFromFile(id);
				if (deployment) {
					deployment.status = status as any;
					deployment.updatedAt = new Date().toISOString();
					if (error) {
						deployment.error = error;
					}
					await this.saveDeploymentToFile(deployment);
				}
			} catch (fileError) {
				console.error('❌ Failed to update deployment status in file:', fileError);
				throw new Error(`Failed to update deployment status in both database and file: DB(${dbError}), File(${fileError})`);
			}
		}
	}

	/**
	 * Delete a deployment (database-first with file cleanup)
	 */
	async deleteDeployment(id: string): Promise<void> {
		await this.ensureMigration();

		try {
			// Try database first
			await this.dbService.deleteDeployment(id);
		} catch (dbError) {
			console.error('❌ Failed to delete deployment from database:', dbError);
		}

		// Also try to delete from file system if it exists
		try {
			await this.deleteDeploymentFile(id);
		} catch (fileError) {
			// File deletion errors are not critical
			console.warn('⚠️ Failed to delete deployment file (non-critical):', fileError);
		}
	}

	/**
	 * Get deployments by status (database-first with file fallback)
	 */
	async getDeploymentsByStatus(status: string): Promise<Deployment[]> {
		await this.ensureMigration();

		try {
			// Try database first
			return await this.dbService.getDeploymentsByStatus(status);
		} catch (dbError) {
			console.error('❌ Failed to get deployments by status from database, falling back to files:', dbError);

			// Fallback to file storage
			try {
				const allDeployments = await this.listDeploymentsFromFiles();
				return allDeployments.filter((deployment) => deployment.status === status);
			} catch (fileError) {
				console.error('❌ Failed to get deployments by status from files:', fileError);
				return [];
			}
		}
	}

	/**
	 * File storage fallback methods
	 */

	private async saveDeploymentToFile(deployment: Deployment): Promise<void> {
		const filePath = path.join(this.dataDir, `${deployment.id}.json`);

		// Ensure directory exists
		await fs.mkdir(this.dataDir, { recursive: true });

		// Write deployment data
		await fs.writeFile(filePath, JSON.stringify(deployment, null, 2));
		console.log(`💾 Saved deployment to file: ${deployment.id}`);
	}

	private async getDeploymentFromFile(id: string): Promise<Deployment | null> {
		try {
			const filePath = path.join(this.dataDir, `${id}.json`);
			const fileContent = await fs.readFile(filePath, 'utf-8');
			const deployment = JSON.parse(fileContent);

			// Ensure ID is set correctly
			deployment.id = deployment.id || id;

			return deployment;
		} catch (error) {
			// File doesn't exist or can't be read
			return null;
		}
	}

	private async listDeploymentsFromFiles(): Promise<Deployment[]> {
		try {
			await fs.access(this.dataDir);
			const files = await fs.readdir(this.dataDir);
			const deploymentFiles = files.filter((file) => file.endsWith('.json'));

			const deployments: Deployment[] = [];

			for (const filename of deploymentFiles) {
				try {
					const filePath = path.join(this.dataDir, filename);
					const fileContent = await fs.readFile(filePath, 'utf-8');
					const deployment = JSON.parse(fileContent);

					// Ensure ID is set correctly
					deployment.id = deployment.id || path.basename(filename, '.json');

					deployments.push(deployment);
				} catch (error) {
					console.error(`❌ Error reading deployment file ${filename}:`, error);
				}
			}

			// Sort by createdAt (newest first)
			return deployments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		} catch (error) {
			// Directory doesn't exist
			return [];
		}
	}

	private async deleteDeploymentFile(id: string): Promise<void> {
		const filePath = path.join(this.dataDir, `${id}.json`);
		await fs.unlink(filePath);
		console.log(`🗑️ Deleted deployment file: ${id}`);
	}

	/**
	 * Get migration status
	 */
	async getMigrationStatus(): Promise<{
		migrated: boolean;
		fileCount: number;
		dbCount: number;
	}> {
		return this.migrationService.getMigrationStatus();
	}

	/**
	 * Force migration (useful for re-syncing)
	 */
	async forceMigration(): Promise<{
		success: boolean;
		migratedCount: number;
		errors: string[];
	}> {
		this.migrationChecked = false; // Reset migration check
		return this.migrationService.forceMigrateDeployments();
	}
}
