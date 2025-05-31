import type { Agent } from '$lib/types/agent.type';
import { DatabaseAgentService } from './database-agent-service.js';
import { AgentMigrationService } from './agent-migration-service.js';
import * as fs from 'fs';
import * as path from 'path';

export class HybridAgentService {
	private static instance: HybridAgentService;
	private databaseAgentService: DatabaseAgentService;
	private migrationService: AgentMigrationService;
	private migrationChecked = false;

	private constructor() {
		this.databaseAgentService = DatabaseAgentService.getInstance();
		this.migrationService = AgentMigrationService.getInstance();
	}

	public static getInstance(): HybridAgentService {
		if (!HybridAgentService.instance) {
			HybridAgentService.instance = new HybridAgentService();
		}
		return HybridAgentService.instance;
	}

	/**
	 * Ensure migration has been checked/performed
	 */
	private async ensureMigration(): Promise<void> {
		if (this.migrationChecked) {
			return;
		}

		try {
			const status = await this.migrationService.getMigrationStatus();
			if (status.needsMigration) {
				console.log('Performing agent migration from files to database...');
				const result = await this.migrationService.migrateAgents();
				console.log(`Agent migration completed: ${result.migrated} migrated, ${result.errors.length} errors`);
				if (result.errors.length > 0) {
					console.error('Agent migration errors:', result.errors);
				}
			}
		} catch (error) {
			console.error('Failed to perform agent migration:', error);
		}

		this.migrationChecked = true;
	}

	/**
	 * Save an agent (database first)
	 */
	public async saveAgent(agent: Agent): Promise<void> {
		await this.ensureMigration();

		try {
			await this.databaseAgentService.saveAgent(agent);
		} catch (error) {
			console.error('Failed to save agent to database, falling back to file:', error);
			await this.saveAgentToFile(agent);
		}
	}

	/**
	 * Get agent by ID (database first, file fallback)
	 */
	public async getAgentById(id: string): Promise<Agent | null> {
		await this.ensureMigration();

		try {
			const agent = await this.databaseAgentService.getAgentById(id);
			if (agent) {
				return agent;
			}
		} catch (error) {
			console.error('Failed to get agent from database, trying file fallback:', error);
		}

		// Fallback to file
		return this.getAgentFromFile(id);
	}

	/**
	 * List all agents (database first, file fallback)
	 */
	public async listAgents(): Promise<Agent[]> {
		await this.ensureMigration();

		try {
			const agents = await this.databaseAgentService.listAgents();
			if (agents.length > 0) {
				return agents;
			}
		} catch (error) {
			console.error('Failed to list agents from database, trying file fallback:', error);
		}

		// Fallback to files
		return this.listAgentsFromFiles();
	}

	/**
	 * Get online agents (database first, file fallback)
	 */
	public async getOnlineAgents(): Promise<Agent[]> {
		await this.ensureMigration();

		try {
			const agents = await this.databaseAgentService.getOnlineAgents();
			return agents;
		} catch (error) {
			console.error('Failed to get online agents from database, trying file fallback:', error);
			// For file fallback, we'll need to check all agents and filter by status and lastSeen
			const allAgents = await this.listAgentsFromFiles();
			const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
			return allAgents.filter((agent) => agent.status === 'online' && agent.lastSeen && new Date(agent.lastSeen) > fiveMinutesAgo);
		}
	}

	/**
	 * Update agent heartbeat (database first)
	 */
	public async updateAgentHeartbeat(id: string): Promise<void> {
		await this.ensureMigration();

		try {
			await this.databaseAgentService.updateAgentHeartbeat(id);
		} catch (error) {
			console.error('Failed to update agent heartbeat in database, trying file fallback:', error);
			// For file fallback, load agent, update lastSeen and status, then save
			const agent = await this.getAgentFromFile(id);
			if (agent) {
				agent.lastSeen = new Date().toISOString();
				agent.status = 'online';
				agent.updatedAt = new Date().toISOString();
				await this.saveAgentToFile(agent);
			}
		}
	}

	/**
	 * Delete an agent (database first)
	 */
	public async deleteAgent(id: string): Promise<void> {
		await this.ensureMigration();

		try {
			await this.databaseAgentService.deleteAgent(id);
		} catch (error) {
			console.error('Failed to delete agent from database, trying file fallback:', error);
			await this.deleteAgentFile(id);
		}
	}

	/**
	 * Save agent metrics (database only for now)
	 */
	public async saveAgentMetrics(agentId: string, metrics: any): Promise<void> {
		await this.ensureMigration();

		try {
			await this.databaseAgentService.saveAgentMetrics(agentId, metrics);
		} catch (error) {
			console.error('Failed to save agent metrics to database:', error);
			// Note: Agent metrics are not stored in files, so no fallback
		}
	}

	// File-based fallback methods

	private async saveAgentToFile(agent: Agent): Promise<void> {
		const agentsDir = path.join(process.cwd(), 'data', 'agents');

		if (!fs.existsSync(agentsDir)) {
			fs.mkdirSync(agentsDir, { recursive: true });
		}

		const filename = `agent-${agent.hostname}-${Date.now()}.json`;
		const filePath = path.join(agentsDir, filename);

		const fileData = {
			id: agent.id,
			hostname: agent.hostname,
			platform: agent.platform,
			version: agent.version,
			capabilities: agent.capabilities,
			status: agent.status,
			lastSeen: agent.lastSeen,
			registeredAt: agent.registeredAt,
			createdAt: agent.createdAt,
			updatedAt: agent.updatedAt,
			metrics: agent.metrics,
			dockerInfo: agent.dockerInfo,
			metadata: agent.metadata
		};

		fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
	}

	private async getAgentFromFile(id: string): Promise<Agent | null> {
		const agentsDir = path.join(process.cwd(), 'data', 'agents');

		if (!fs.existsSync(agentsDir)) {
			return null;
		}

		try {
			const files = fs.readdirSync(agentsDir);
			const agentFiles = files.filter((file) => file.endsWith('.json'));

			for (const filename of agentFiles) {
				const filePath = path.join(agentsDir, filename);
				const agentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

				if (agentData.id === id || agentData.agentId === id) {
					return this.convertFileDataToAgent(agentData);
				}
			}
		} catch (error) {
			console.error('Failed to read agent from file:', error);
		}

		return null;
	}

	private async listAgentsFromFiles(): Promise<Agent[]> {
		const agentsDir = path.join(process.cwd(), 'data', 'agents');
		const agents: Agent[] = [];

		if (!fs.existsSync(agentsDir)) {
			return agents;
		}

		try {
			const files = fs.readdirSync(agentsDir);
			const agentFiles = files.filter((file) => file.endsWith('.json'));

			for (const filename of agentFiles) {
				try {
					const filePath = path.join(agentsDir, filename);
					const agentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
					agents.push(this.convertFileDataToAgent(agentData));
				} catch (error) {
					console.error(`Failed to read agent file ${filename}:`, error);
				}
			}
		} catch (error) {
			console.error('Failed to list agents from files:', error);
		}

		return agents;
	}

	private async deleteAgentFile(id: string): Promise<void> {
		const agentsDir = path.join(process.cwd(), 'data', 'agents');

		if (!fs.existsSync(agentsDir)) {
			return;
		}

		try {
			const files = fs.readdirSync(agentsDir);
			const agentFiles = files.filter((file) => file.endsWith('.json'));

			for (const filename of agentFiles) {
				const filePath = path.join(agentsDir, filename);
				const agentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

				if (agentData.id === id || agentData.agentId === id) {
					fs.unlinkSync(filePath);
					console.log(`Deleted agent file: ${filename}`);
					break;
				}
			}
		} catch (error) {
			console.error('Failed to delete agent file:', error);
		}
	}

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
			updatedAt: fileData.updatedAt || new Date().toISOString(),
			metrics: fileData.metrics,
			dockerInfo: fileData.dockerInfo,
			metadata: fileData.metadata
		};
	}
}

// Export singleton instance
export const hybridAgentService = HybridAgentService.getInstance();
