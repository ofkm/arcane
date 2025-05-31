import { DatabaseAgentService } from './database-agent-service.js';
import type { Agent } from '$lib/types/agent.type';
import * as fs from 'fs';
import * as path from 'path';

export class AgentMigrationService {
	private static instance: AgentMigrationService;
	private databaseAgentService: DatabaseAgentService;

	private constructor() {
		this.databaseAgentService = DatabaseAgentService.getInstance();
	}

	public static getInstance(): AgentMigrationService {
		if (!AgentMigrationService.instance) {
			AgentMigrationService.instance = new AgentMigrationService();
		}
		return AgentMigrationService.instance;
	}

	/**
	 * Migrate all agents from file storage to database
	 */
	public async migrateAgents(): Promise<{ migrated: number; errors: string[] }> {
		const agentsDir = path.join(process.cwd(), 'data', 'agents');
		const errors: string[] = [];
		let migrated = 0;

		try {
			// Check if agents directory exists
			if (!fs.existsSync(agentsDir)) {
				console.log('No agents directory found, skipping agent migration');
				return { migrated: 0, errors: [] };
			}

			const files = fs.readdirSync(agentsDir);
			const agentFiles = files.filter((file) => file.endsWith('.json'));

			console.log(`Found ${agentFiles.length} agent files to migrate`);

			for (const filename of agentFiles) {
				try {
					const filePath = path.join(agentsDir, filename);
					const agentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

					// Convert file data to Agent type
					const agent: Agent = this.convertFileDataToAgent(agentData);

					// Save to database
					await this.databaseAgentService.saveAgent(agent);
					migrated++;

					console.log(`Migrated agent: ${agent.id} (${agent.hostname})`);
				} catch (error) {
					const errorMsg = `Failed to migrate agent from ${filename}: ${error}`;
					console.error(errorMsg);
					errors.push(errorMsg);
				}
			}

			console.log(`Agent migration completed: ${migrated} migrated, ${errors.length} errors`);
			return { migrated, errors };
		} catch (error) {
			const errorMsg = `Failed to migrate agents: ${error}`;
			console.error(errorMsg);
			return { migrated, errors: [errorMsg] };
		}
	}

	/**
	 * Convert file-based agent data to Agent type
	 */
	private convertFileDataToAgent(fileData: any): Agent {
		return {
			id: fileData.id || fileData.agentId,
			hostname: fileData.hostname,
			platform: fileData.platform || 'unknown',
			version: fileData.version || '1.0.0',
			capabilities: fileData.capabilities || [],
			status: fileData.status || 'offline',
			lastSeen: fileData.lastSeen || new Date().toISOString(),
			registeredAt: fileData.registeredAt || new Date().toISOString(),
			createdAt: fileData.createdAt || fileData.registeredAt || new Date().toISOString(),
			updatedAt: fileData.updatedAt || new Date().toISOString()
		};
	}

	/**
	 * Check if agents have been migrated by checking if database has any agents
	 */
	public async hasAgentsMigrated(): Promise<boolean> {
		try {
			const agents = await this.databaseAgentService.listAgents();
			return agents.length > 0;
		} catch (error) {
			console.error('Failed to check agent migration status:', error);
			return false;
		}
	}

	/**
	 * Get migration status with counts
	 */
	public async getMigrationStatus(): Promise<{
		fileCount: number;
		databaseCount: number;
		needsMigration: boolean;
	}> {
		const agentsDir = path.join(process.cwd(), 'data', 'agents');
		let fileCount = 0;

		try {
			if (fs.existsSync(agentsDir)) {
				const files = fs.readdirSync(agentsDir);
				fileCount = files.filter((file) => file.endsWith('.json')).length;
			}
		} catch (error) {
			console.error('Failed to count agent files:', error);
		}

		let databaseCount = 0;
		try {
			const agents = await this.databaseAgentService.listAgents();
			databaseCount = agents.length;
		} catch (error) {
			console.error('Failed to count database agents:', error);
		}

		return {
			fileCount,
			databaseCount,
			needsMigration: fileCount > 0 && databaseCount === 0
		};
	}
}
