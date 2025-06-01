/**
 * Deployment Migration Service
 * Handles migration of deployments from file storage to database
 */

import fs from 'fs/promises';
import path from 'path';
import { DatabaseDeploymentService } from './database-deployment-service';
import type { Deployment } from '$lib/types/deployment.type';

export class DeploymentMigrationService {
	private static instance: DeploymentMigrationService | null = null;
	private dbService: DatabaseDeploymentService;
	private dataDir = '/Users/kylemendell/dev/ofkm/arcane/data/deployments';

	static getInstance(): DeploymentMigrationService {
		if (!DeploymentMigrationService.instance) {
			DeploymentMigrationService.instance = new DeploymentMigrationService();
		}
		return DeploymentMigrationService.instance;
	}

	constructor() {
		this.dbService = DatabaseDeploymentService.getInstance();
	}

	/**
	 * Check if deployments have been migrated to database
	 */
	async hasDeploymentsMigrated(): Promise<boolean> {
		try {
			const deployments = await this.dbService.listDeployments();
			return deployments.length > 0;
		} catch (error) {
			console.error('❌ Error checking deployment migration status:', error);
			return false;
		}
	}

	/**
	 * Get migration status information
	 */
	async getMigrationStatus(): Promise<{
		migrated: boolean;
		fileCount: number;
		dbCount: number;
	}> {
		try {
			const [migrated, fileCount, dbDeployments] = await Promise.all([this.hasDeploymentsMigrated(), this.getFileCount(), this.dbService.listDeployments()]);

			return {
				migrated,
				fileCount,
				dbCount: dbDeployments.length
			};
		} catch (error) {
			console.error('❌ Error getting migration status:', error);
			return {
				migrated: false,
				fileCount: 0,
				dbCount: 0
			};
		}
	}

	/**
	 * Get count of deployment files
	 */
	private async getFileCount(): Promise<number> {
		try {
			await fs.access(this.dataDir);
			const files = await fs.readdir(this.dataDir);
			return files.filter((file) => file.endsWith('.json')).length;
		} catch (error) {
			// Directory doesn't exist or can't be accessed
			return 0;
		}
	}

	/**
	 * Convert file data to Deployment object with proper field mapping
	 */
	private convertFileDataToDeployment(fileData: any, filename: string): Deployment | null {
		try {
			// Extract ID from filename or use provided ID
			const id = fileData.id || path.basename(filename, '.json');

			// Ensure required fields exist
			if (!fileData.name || !fileData.agentId) {
				console.warn(`⚠️ Skipping deployment file ${filename}: missing required fields`);
				return null;
			}

			// Create properly typed deployment
			const deployment: Deployment = {
				id,
				name: fileData.name,
				type: fileData.type || 'stack',
				status: fileData.status || 'pending',
				agentId: fileData.agentId,
				createdAt: fileData.createdAt || new Date().toISOString(),
				updatedAt: fileData.updatedAt,
				metadata: fileData.metadata || {},
				taskId: fileData.taskId,
				error: fileData.error
			};

			return deployment;
		} catch (error) {
			console.error(`❌ Error converting deployment file ${filename}:`, error);
			return null;
		}
	}

	/**
	 * Check if a specific deployment ID exists in database
	 */
	private async deploymentExistsInDb(id: string): Promise<boolean> {
		try {
			const deployment = await this.dbService.getDeploymentById(id);
			return deployment !== null;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Migrate deployments from files to database
	 */
	async migrateDeployments(): Promise<{
		success: boolean;
		migratedCount: number;
		errors: string[];
	}> {
		console.log('🔄 Starting deployment migration...');

		const errors: string[] = [];
		let migratedCount = 0;

		try {
			// Check if deployments directory exists
			try {
				await fs.access(this.dataDir);
			} catch (error) {
				console.log('📁 No deployments directory found, skipping migration');
				return {
					success: true,
					migratedCount: 0,
					errors: []
				};
			}

			// Read all deployment files
			const files = await fs.readdir(this.dataDir);
			const deploymentFiles = files.filter((file) => file.endsWith('.json'));

			console.log(`📄 Found ${deploymentFiles.length} deployment files`);

			if (deploymentFiles.length === 0) {
				console.log('📄 No deployment files found');
				return {
					success: true,
					migratedCount: 0,
					errors: []
				};
			}

			// Process each deployment file
			for (const filename of deploymentFiles) {
				try {
					const filePath = path.join(this.dataDir, filename);
					const fileContent = await fs.readFile(filePath, 'utf-8');
					const fileData = JSON.parse(fileContent);

					// Convert to Deployment object
					const deployment = this.convertFileDataToDeployment(fileData, filename);
					if (!deployment) {
						errors.push(`Failed to convert deployment file: ${filename}`);
						continue;
					}

					// Check if deployment already exists in database
					const existsInDb = await this.deploymentExistsInDb(deployment.id);
					if (existsInDb) {
						console.log(`⚠️ Deployment already exists in database: ${deployment.name} (${deployment.id})`);
						continue;
					}

					// Save to database
					await this.dbService.saveDeployment(deployment);
					migratedCount++;

					console.log(`✅ Migrated deployment: ${deployment.name} (${deployment.id})`);
				} catch (error) {
					const errorMessage = `Failed to migrate deployment file ${filename}: ${error}`;
					console.error(`❌ ${errorMessage}`);
					errors.push(errorMessage);
				}
			}

			const success = errors.length === 0;
			console.log(`${success ? '✅' : '⚠️'} Deployment migration completed: ${migratedCount} migrated, ${errors.length} errors`);

			return {
				success,
				migratedCount,
				errors
			};
		} catch (error) {
			const errorMessage = `Deployment migration failed: ${error}`;
			console.error(`❌ ${errorMessage}`);
			return {
				success: false,
				migratedCount,
				errors: [...errors, errorMessage]
			};
		}
	}

	/**
	 * Force migration even if deployments already exist in database
	 */
	async forceMigrateDeployments(): Promise<{
		success: boolean;
		migratedCount: number;
		errors: string[];
	}> {
		console.log('🔄 Force migrating deployments...');
		return this.migrateDeployments();
	}
}
