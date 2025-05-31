/**
 * Database Agent Tasks Service
 * Handles agent task CRUD operations using Drizzle ORM
 */

import { eq, desc, and } from 'drizzle-orm';
import { db, initializeDatabase } from '$lib/database';
import { agentTasks } from '$lib/database/schema';
import type { AgentTask } from '$lib/types/agent.type';

export class DatabaseAgentTasksService {
	private static instance: DatabaseAgentTasksService | null = null;
	private initialized = false;

	static getInstance(): DatabaseAgentTasksService {
		if (!DatabaseAgentTasksService.instance) {
			DatabaseAgentTasksService.instance = new DatabaseAgentTasksService();
		}
		return DatabaseAgentTasksService.instance;
	}

	private async init(): Promise<void> {
		if (!this.initialized) {
			await initializeDatabase();
			this.initialized = true;
		}
	}

	/**
	 * Map task type from AgentTask to database enum
	 */
	private mapTaskType(type: string): 'container_start' | 'container_stop' | 'container_restart' | 'container_remove' | 'image_pull' | 'image_remove' | 'image_prune' | 'volume_create' | 'volume_remove' | 'volume_prune' | 'network_create' | 'network_remove' | 'network_prune' | 'stack_deploy' | 'stack_remove' | 'stack_update' | 'system_prune' | 'system_info' | 'system_df' {
		// Map common task types to database enum values
		switch (type) {
			case 'docker_command':
				return 'system_info'; // Default mapping
			case 'stack_deploy':
				return 'stack_deploy';
			case 'stack_list':
				return 'system_info'; // Map to system_info for now
			case 'image_pull':
				return 'image_pull';
			case 'health_check':
				return 'system_info';
			case 'container_start':
				return 'container_start';
			case 'container_stop':
				return 'container_stop';
			case 'container_restart':
				return 'container_restart';
			case 'container_remove':
				return 'container_remove';
			case 'agent_upgrade':
				return 'system_info'; // Map to system_info for now
			default:
				return 'system_info'; // Default fallback
		}
	}

	/**
	 * Map task status from AgentTask to database enum
	 */
	private mapTaskStatus(status: string): 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' {
		switch (status) {
			case 'pending':
				return 'pending';
			case 'running':
				return 'running';
			case 'completed':
				return 'completed';
			case 'failed':
				return 'failed';
			default:
				return 'pending';
		}
	}

	/**
	 * Save an agent task to the database
	 */
	async saveAgentTask(task: AgentTask): Promise<AgentTask> {
		await this.init();

		try {
			// Map AgentTask to database fields
			const dbTask = {
				id: task.id,
				agentId: task.agentId,
				type: this.mapTaskType(task.type),
				status: this.mapTaskStatus(task.status),
				priority: 5, // Default priority
				payload: task.payload || null,
				result: task.result || null,
				error: task.error || null,
				progress: 0, // Default progress
				startedAt: task.status === 'running' ? task.updatedAt || new Date().toISOString() : null,
				completedAt: task.status === 'completed' || task.status === 'failed' ? task.updatedAt || new Date().toISOString() : null,
				createdAt: task.createdAt,
				updatedAt: task.updatedAt || new Date().toISOString()
			};

			// Use insert with onConflictDoUpdate to handle both insert and update
			await db
				.insert(agentTasks)
				.values(dbTask)
				.onConflictDoUpdate({
					target: agentTasks.id,
					set: {
						agentId: dbTask.agentId,
						type: dbTask.type,
						status: dbTask.status,
						priority: dbTask.priority,
						payload: dbTask.payload,
						result: dbTask.result,
						error: dbTask.error,
						progress: dbTask.progress,
						startedAt: dbTask.startedAt,
						completedAt: dbTask.completedAt,
						updatedAt: dbTask.updatedAt
					}
				});

			console.log(`✅ Saved agent task: ${task.id}`);
			return task;
		} catch (error) {
			console.error('❌ Error saving agent task:', error);
			throw new Error(`Failed to save agent task: ${error}`);
		}
	}

	/**
	 * Get an agent task by ID
	 */
	async getAgentTaskById(id: string): Promise<AgentTask | null> {
		await this.init();

		try {
			const result = await db.select().from(agentTasks).where(eq(agentTasks.id, id)).limit(1);

			if (result.length === 0) {
				return null;
			}

			const dbTask = result[0];

			// Map database fields back to AgentTask type
			const task: AgentTask = {
				id: dbTask.id,
				agentId: dbTask.agentId,
				type: this.mapDbTypeToAgentType(dbTask.type),
				payload: dbTask.payload || {},
				status: dbTask.status as 'pending' | 'running' | 'completed' | 'failed',
				result: dbTask.result || undefined,
				error: dbTask.error || undefined,
				createdAt: dbTask.createdAt,
				updatedAt: dbTask.updatedAt
			};

			return task;
		} catch (error) {
			console.error('❌ Error getting agent task:', error);
			throw new Error(`Failed to get agent task: ${error}`);
		}
	}

	/**
	 * Map database type back to AgentTask type
	 */
	private mapDbTypeToAgentType(dbType: string): 'container_start' | 'container_stop' | 'container_restart' | 'container_remove' | 'image_pull' | 'stack_deploy' | 'docker_command' | 'health_check' | 'agent_upgrade' {
		// Map database enum values back to AgentTask types
		switch (dbType) {
			case 'container_start':
				return 'container_start';
			case 'container_stop':
				return 'container_stop';
			case 'container_restart':
				return 'container_restart';
			case 'container_remove':
				return 'container_remove';
			case 'image_pull':
				return 'image_pull';
			case 'stack_deploy':
				return 'stack_deploy';
			case 'health_check':
				return 'health_check';
			case 'agent_upgrade':
				return 'agent_upgrade';
			case 'system_info':
			case 'image_remove':
			case 'image_prune':
			case 'volume_create':
			case 'volume_remove':
			case 'volume_prune':
			case 'network_create':
			case 'network_remove':
			case 'network_prune':
			case 'stack_remove':
			case 'stack_update':
			case 'system_prune':
			case 'system_df':
				return 'docker_command'; // Map all others to docker_command as default
			default:
				return 'docker_command'; // Default fallback
		}
	}

	/**
	 * List all agent tasks
	 */
	async listAgentTasks(): Promise<AgentTask[]> {
		await this.init();

		try {
			const results = await db.select().from(agentTasks).orderBy(desc(agentTasks.createdAt));

			return results.map((dbTask) => ({
				id: dbTask.id,
				agentId: dbTask.agentId,
				type: this.mapDbTypeToAgentType(dbTask.type),
				payload: dbTask.payload || {},
				status: dbTask.status as 'pending' | 'running' | 'completed' | 'failed',
				result: dbTask.result || undefined,
				error: dbTask.error || undefined,
				createdAt: dbTask.createdAt,
				updatedAt: dbTask.updatedAt
			}));
		} catch (error) {
			console.error('❌ Error listing agent tasks:', error);
			throw new Error(`Failed to list agent tasks: ${error}`);
		}
	}

	/**
	 * List agent tasks by agent ID
	 */
	async listAgentTasksByAgent(agentId: string): Promise<AgentTask[]> {
		await this.init();

		try {
			const results = await db.select().from(agentTasks).where(eq(agentTasks.agentId, agentId)).orderBy(desc(agentTasks.createdAt));

			return results.map((dbTask) => ({
				id: dbTask.id,
				agentId: dbTask.agentId,
				type: this.mapDbTypeToAgentType(dbTask.type),
				payload: dbTask.payload || {},
				status: dbTask.status as 'pending' | 'running' | 'completed' | 'failed',
				result: dbTask.result || undefined,
				error: dbTask.error || undefined,
				createdAt: dbTask.createdAt,
				updatedAt: dbTask.updatedAt
			}));
		} catch (error) {
			console.error('❌ Error listing agent tasks by agent:', error);
			throw new Error(`Failed to list agent tasks by agent: ${error}`);
		}
	}

	/**
	 * Update agent task status
	 */
	async updateAgentTaskStatus(id: string, status: string, result?: any, error?: string): Promise<void> {
		await this.init();

		try {
			const dbStatus = this.mapTaskStatus(status);
			const updateData: any = {
				status: dbStatus,
				updatedAt: new Date().toISOString(),
				error: error || null,
				result: result || null
			};

			// Set timing fields based on status
			if (dbStatus === 'running' && updateData.startedAt === null) {
				updateData.startedAt = new Date().toISOString();
			} else if (dbStatus === 'completed' || dbStatus === 'failed') {
				updateData.completedAt = new Date().toISOString();
			}

			await db.update(agentTasks).set(updateData).where(eq(agentTasks.id, id));

			console.log(`✅ Updated agent task ${id} status to ${status}`);
		} catch (error) {
			console.error('❌ Error updating agent task status:', error);
			throw new Error(`Failed to update agent task status: ${error}`);
		}
	}

	/**
	 * Delete an agent task
	 */
	async deleteAgentTask(id: string): Promise<void> {
		await this.init();

		try {
			await db.delete(agentTasks).where(eq(agentTasks.id, id));

			console.log(`✅ Deleted agent task: ${id}`);
		} catch (error) {
			console.error('❌ Error deleting agent task:', error);
			throw new Error(`Failed to delete agent task: ${error}`);
		}
	}

	/**
	 * Get agent tasks by status
	 */
	async getAgentTasksByStatus(status: string): Promise<AgentTask[]> {
		await this.init();

		try {
			const dbStatus = this.mapTaskStatus(status);
			const results = await db.select().from(agentTasks).where(eq(agentTasks.status, dbStatus)).orderBy(desc(agentTasks.createdAt));

			return results.map((dbTask) => ({
				id: dbTask.id,
				agentId: dbTask.agentId,
				type: this.mapDbTypeToAgentType(dbTask.type),
				payload: dbTask.payload || {},
				status: dbTask.status as 'pending' | 'running' | 'completed' | 'failed',
				result: dbTask.result || undefined,
				error: dbTask.error || undefined,
				createdAt: dbTask.createdAt,
				updatedAt: dbTask.updatedAt
			}));
		} catch (error) {
			console.error('❌ Error getting agent tasks by status:', error);
			throw new Error(`Failed to get agent tasks by status: ${error}`);
		}
	}

	/**
	 * Get pending agent tasks for a specific agent
	 */
	async getPendingAgentTasks(agentId: string): Promise<AgentTask[]> {
		await this.init();

		try {
			const results = await db
				.select()
				.from(agentTasks)
				.where(and(eq(agentTasks.agentId, agentId), eq(agentTasks.status, 'pending')))
				.orderBy(desc(agentTasks.createdAt));

			return results.map((dbTask) => ({
				id: dbTask.id,
				agentId: dbTask.agentId,
				type: this.mapDbTypeToAgentType(dbTask.type),
				payload: dbTask.payload || {},
				status: dbTask.status as 'pending' | 'running' | 'completed' | 'failed',
				result: dbTask.result || undefined,
				error: dbTask.error || undefined,
				createdAt: dbTask.createdAt,
				updatedAt: dbTask.updatedAt
			}));
		} catch (error) {
			console.error('❌ Error getting pending agent tasks:', error);
			throw new Error(`Failed to get pending agent tasks: ${error}`);
		}
	}
}

// Export singleton instance
export const databaseAgentTasksService = DatabaseAgentTasksService.getInstance();
