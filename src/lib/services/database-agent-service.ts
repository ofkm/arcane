/**
 * Database Agent Service
 * Handles agent CRUD operations using Drizzle ORM
 */

import { eq, desc, and, gte } from 'drizzle-orm';
import { db, initializeDatabase } from '$lib/database';
import { agents, agentTasks, agentMetrics } from '$lib/database/schema';
import type { Agent } from '$lib/types/agent.type';

export class DatabaseAgentService {
	private static instance: DatabaseAgentService | null = null;
	private initialized = false;

	static getInstance(): DatabaseAgentService {
		if (!DatabaseAgentService.instance) {
			DatabaseAgentService.instance = new DatabaseAgentService();
		}
		return DatabaseAgentService.instance;
	}

	private async init(): Promise<void> {
		if (!this.initialized) {
			await initializeDatabase();
			this.initialized = true;
		}
	}

	/**
	 * Save an agent to the database
	 */
	async saveAgent(agent: Agent): Promise<Agent> {
		await this.init();

		try {
			// Map Agent to database fields
			const dbAgent = {
				id: agent.id,
				name: agent.hostname, // Using hostname as name for now
				hostname: agent.hostname,
				dockerHost: 'unix:///var/run/docker.sock', // Default value since Agent type doesn't have this
				status: agent.status as 'online' | 'offline' | 'error' | 'unknown',
				lastSeen: agent.lastSeen,
				version: agent.version,
				platform: agent.platform,
				architecture: 'unknown', // Default value since Agent type doesn't have this
				registeredAt: agent.registeredAt,
				updatedAt: agent.updatedAt || new Date().toISOString()
			};

			// Use insert with onConflictDoUpdate to handle both insert and update
			const result = await db
				.insert(agents)
				.values(dbAgent)
				.onConflictDoUpdate({
					target: agents.id,
					set: {
						name: dbAgent.name,
						hostname: dbAgent.hostname,
						dockerHost: dbAgent.dockerHost,
						status: dbAgent.status,
						lastSeen: dbAgent.lastSeen,
						version: dbAgent.version,
						platform: dbAgent.platform,
						architecture: dbAgent.architecture,
						updatedAt: dbAgent.updatedAt
					}
				})
				.returning();

			console.log(`💾 Agent saved to database: ${agent.id}`);
			return this.mapDbAgentToAgent(result[0]);
		} catch (error) {
			console.error(`❌ Failed to save agent ${agent.id} to database:`, error);
			throw error;
		}
	}

	/**
	 * Get agent by ID
	 */
	async getAgentById(id: string): Promise<Agent | null> {
		await this.init();

		try {
			const result = await db.select().from(agents).where(eq(agents.id, id));

			if (result.length === 0) {
				return null;
			}

			console.log(`👤 Agent loaded from database: ${id}`);
			return this.mapDbAgentToAgent(result[0]);
		} catch (error) {
			console.error(`❌ Failed to get agent ${id} from database:`, error);
			throw error;
		}
	}

	/**
	 * List all agents
	 */
	async listAgents(): Promise<Agent[]> {
		await this.init();

		try {
			const result = await db.select().from(agents).orderBy(desc(agents.lastSeen));

			console.log(`👥 ${result.length} agents loaded from database`);
			return result.map((agent) => this.mapDbAgentToAgent(agent));
		} catch (error) {
			console.error('❌ Failed to list agents from database:', error);
			throw error;
		}
	}

	/**
	 * Update agent heartbeat
	 */
	async updateAgentHeartbeat(id: string): Promise<void> {
		await this.init();

		try {
			await db
				.update(agents)
				.set({
					status: 'online',
					lastSeen: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				})
				.where(eq(agents.id, id));

			console.log(`💓 Agent heartbeat updated: ${id}`);
		} catch (error) {
			console.error(`❌ Failed to update agent heartbeat ${id}:`, error);
			throw error;
		}
	}

	/**
	 * Delete agent by ID
	 */
	async deleteAgent(id: string): Promise<boolean> {
		await this.init();

		try {
			const result = await db.delete(agents).where(eq(agents.id, id));

			if (result.changes > 0) {
				console.log(`🗑️ Agent deleted from database: ${id}`);
				return true;
			}
			return false;
		} catch (error) {
			console.error(`❌ Failed to delete agent ${id} from database:`, error);
			throw error;
		}
	}

	/**
	 * Get online agents (within timeout)
	 */
	async getOnlineAgents(timeoutMinutes: number = 5): Promise<Agent[]> {
		await this.init();

		try {
			const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

			const result = await db
				.select()
				.from(agents)
				.where(and(eq(agents.status, 'online'), gte(agents.lastSeen, cutoffTime)))
				.orderBy(desc(agents.lastSeen));

			console.log(`🌐 ${result.length} online agents loaded from database`);
			return result.map((agent) => this.mapDbAgentToAgent(agent));
		} catch (error) {
			console.error('❌ Failed to get online agents from database:', error);
			throw error;
		}
	}

	/**
	 * Save agent metrics
	 */
	async saveAgentMetrics(agentId: string, metrics: any): Promise<void> {
		await this.init();

		try {
			await db.insert(agentMetrics).values({
				agentId,
				cpuUsage: metrics.cpuUsage,
				memoryUsage: metrics.memoryUsage,
				diskUsage: metrics.diskUsage,
				networkRx: metrics.networkRx,
				networkTx: metrics.networkTx,
				containersRunning: metrics.containersRunning,
				containersTotal: metrics.containersTotal,
				imagesTotal: metrics.imagesTotal,
				volumesTotal: metrics.volumesTotal,
				networksTotal: metrics.networksTotal,
				timestamp: new Date().toISOString()
			});

			console.log(`📊 Agent metrics saved: ${agentId}`);
		} catch (error) {
			console.error(`❌ Failed to save agent metrics for ${agentId}:`, error);
			throw error;
		}
	}

	/**
	 * Map database agent record to Agent type
	 */
	private mapDbAgentToAgent(dbAgent: any): Agent {
		return {
			id: dbAgent.id,
			hostname: dbAgent.hostname,
			platform: dbAgent.platform || 'unknown',
			version: dbAgent.version || '1.0.0',
			capabilities: [], // Default empty, could be stored in JSON field if needed
			status: dbAgent.status,
			lastSeen: dbAgent.lastSeen || new Date().toISOString(),
			registeredAt: dbAgent.registeredAt || new Date().toISOString(),
			createdAt: dbAgent.registeredAt || new Date().toISOString(), // Use registeredAt as createdAt
			updatedAt: dbAgent.updatedAt || new Date().toISOString()
		};
	}
}

// Export singleton instance
export const databaseAgentService = DatabaseAgentService.getInstance();
