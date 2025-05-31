/**
 * Agent Tasks Migration Service
 * Handles migration of agent tasks from file storage to database
 */

import fs from 'fs/promises';
import path from 'path';
import { DatabaseAgentTasksService } from './database-agent-tasks-service';
import type { AgentTask } from '$lib/types/agent.type';

export class AgentTasksMigrationService {
	private static instance: AgentTasksMigrationService | null = null;
	private dbService: DatabaseAgentTasksService;
	private dataDir = '/Users/kylemendell/dev/ofkm/arcane/data/agent-tasks';

	static getInstance(): AgentTasksMigrationService {
		if (!AgentTasksMigrationService.instance) {
			AgentTasksMigrationService.instance = new AgentTasksMigrationService();
		}
		return AgentTasksMigrationService.instance;
	}

	constructor() {
		this.dbService = DatabaseAgentTasksService.getInstance();
	}

	/**
	 * Check if agent tasks have been migrated to database
	 */
	async hasAgentTasksMigrated(): Promise<boolean> {
		try {
			const tasks = await this.dbService.listAgentTasks();
			return tasks.length > 0;
		} catch (error) {
			console.error('❌ Error checking agent tasks migration status:', error);
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
			const [migrated, fileCount, dbTasks] = await Promise.all([this.hasAgentTasksMigrated(), this.getFileCount(), this.dbService.listAgentTasks()]);

			return {
				migrated,
				fileCount,
				dbCount: dbTasks.length
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
	 * Get count of agent task files
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
	 * Check if a specific agent task ID exists in database
	 */
	private async agentTaskExistsInDb(id: string): Promise<boolean> {
		try {
			const task = await this.dbService.getAgentTaskById(id);
			return task !== null;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Convert file data to AgentTask object with proper field mapping
	 */
	private convertFileDataToAgentTask(fileData: any, filename: string): AgentTask | null {
		try {
			// Extract ID from filename or use provided ID
			const id = fileData.id || path.basename(filename, '.json');

			// Ensure required fields exist
			if (!fileData.agentId || !fileData.type) {
				console.warn(`⚠️ Skipping agent task file ${filename}: missing required fields`);
				return null;
			}

			// Create properly typed agent task
			const task: AgentTask = {
				id,
				agentId: fileData.agentId,
				type: fileData.type,
				payload: fileData.payload || {},
				status: fileData.status || 'pending',
				result: fileData.result,
				error: fileData.error,
				createdAt: fileData.createdAt || new Date().toISOString(),
				updatedAt: fileData.updatedAt || fileData.completedAt
			};

			return task;
		} catch (error) {
			console.error(`❌ Error converting agent task file ${filename}:`, error);
			return null;
		}
	}

	/**
	 * Migrate agent tasks from files to database
	 */
	async migrateAgentTasks(): Promise<{
		success: boolean;
		migratedCount: number;
		errors: string[];
	}> {
		console.log('🔄 Starting agent tasks migration...');

		const errors: string[] = [];
		let migratedCount = 0;

		try {
			// Check if agent tasks directory exists
			try {
				await fs.access(this.dataDir);
			} catch (error) {
				console.log('📁 No agent tasks directory found, skipping migration');
				return {
					success: true,
					migratedCount: 0,
					errors: []
				};
			}

			// Read all agent task files
			const files = await fs.readdir(this.dataDir);
			const taskFiles = files.filter((file) => file.endsWith('.json'));

			console.log(`📄 Found ${taskFiles.length} agent task files`);

			if (taskFiles.length === 0) {
				console.log('📄 No agent task files found');
				return {
					success: true,
					migratedCount: 0,
					errors: []
				};
			}

			// Process each agent task file
			for (const filename of taskFiles) {
				try {
					const filePath = path.join(this.dataDir, filename);
					const fileContent = await fs.readFile(filePath, 'utf-8');
					const fileData = JSON.parse(fileContent);

					// Convert to AgentTask object
					const task = this.convertFileDataToAgentTask(fileData, filename);
					if (!task) {
						errors.push(`Failed to convert agent task file: ${filename}`);
						continue;
					}

					// Check if task already exists in database
					const exists = await this.agentTaskExistsInDb(task.id);
					if (exists) {
						console.log(`⚠️ Agent task already exists in database: ${task.id} (${task.type})`);
						continue;
					}

					// Save to database
					await this.dbService.saveAgentTask(task);
					migratedCount++;

					console.log(`✅ Migrated agent task: ${task.id} (${task.type}) - Agent: ${task.agentId}`);
				} catch (error) {
					const errorMessage = `Failed to migrate agent task file ${filename}: ${error}`;
					console.error(`❌ ${errorMessage}`);
					errors.push(errorMessage);
				}
			}

			const success = errors.length === 0;
			console.log(`${success ? '✅' : '⚠️'} Agent tasks migration completed: ${migratedCount} migrated, ${errors.length} errors`);

			return {
				success,
				migratedCount,
				errors
			};
		} catch (error) {
			const errorMessage = `Agent tasks migration failed: ${error}`;
			console.error(`❌ ${errorMessage}`);
			return {
				success: false,
				migratedCount,
				errors: [...errors, errorMessage]
			};
		}
	}

	/**
	 * Force migration even if agent tasks already exist in database
	 */
	async forceMigrateAgentTasks(): Promise<{
		success: boolean;
		migratedCount: number;
		errors: string[];
	}> {
		console.log('🔄 Force migrating agent tasks...');
		return this.migrateAgentTasks();
	}
}

// Export singleton instance
export const agentTasksMigrationService = AgentTasksMigrationService.getInstance();
