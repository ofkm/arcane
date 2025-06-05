import { eq, desc, and, asc, or, lt } from 'drizzle-orm';
import { agentsTable, agentTasksTable } from '../../../db/schema';
import type { Agent, AgentTask } from '$lib/types/agent.type';
import { db } from '../../../db';

/**
 * Convert database agent to Agent type
 */
// Helper function to safely convert timestamp
const safeTimestamp = (timestamp: any, fallback: Date = new Date()): string => {
	if (!timestamp || timestamp === null || timestamp === undefined) {
		return fallback.toISOString();
	}

	// If it's already a string (ISO format), return it
	if (typeof timestamp === 'string') {
		const date = new Date(timestamp);
		return isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
	}

	// If it's a number, treat as Unix timestamp in seconds
	if (typeof timestamp === 'number' && !isNaN(timestamp)) {
		// Check if it's in milliseconds (greater than year 2000 in seconds)
		const date = timestamp > 946684800 ? new Date(timestamp * 1000) : new Date(timestamp);
		return isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
	}

	return fallback.toISOString();
};

function dbAgentToAgent(dbAgent: any): Agent {
	return {
		id: dbAgent.id,
		hostname: dbAgent.hostname,
		platform: dbAgent.platform,
		version: dbAgent.version,
		capabilities: Array.isArray(dbAgent.capabilities) ? dbAgent.capabilities : JSON.parse(dbAgent.capabilities || '[]'),
		status: dbAgent.status,
		lastSeen: safeTimestamp(dbAgent.lastSeen),
		registeredAt: safeTimestamp(dbAgent.registeredAt),
		metrics: {
			containerCount: dbAgent.containerCount,
			imageCount: dbAgent.imageCount,
			stackCount: dbAgent.stackCount,
			networkCount: dbAgent.networkCount,
			volumeCount: dbAgent.volumeCount
		},
		dockerInfo: dbAgent.dockerVersion
			? {
					version: dbAgent.dockerVersion,
					containers: dbAgent.dockerContainers || 0,
					images: dbAgent.dockerImages || 0
				}
			: undefined,
		metadata: dbAgent.metadata ? (typeof dbAgent.metadata === 'string' ? JSON.parse(dbAgent.metadata) : dbAgent.metadata) : undefined,
		createdAt: safeTimestamp(dbAgent.createdAt),
		updatedAt: dbAgent.updatedAt ? safeTimestamp(dbAgent.updatedAt) : undefined
	};
}

/**
 * Convert database task to AgentTask type
 */
function dbTaskToAgentTask(dbTask: any): AgentTask {
	// Helper function to safely convert timestamp
	const safeTimestamp = (timestamp: any, fallback: Date = new Date()): string => {
		if (!timestamp || timestamp === null || timestamp === undefined) {
			return fallback.toISOString();
		}

		// If it's already a string (ISO format), return it
		if (typeof timestamp === 'string') {
			const date = new Date(timestamp);
			return isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
		}

		// If it's a number, treat as Unix timestamp in seconds
		if (typeof timestamp === 'number' && !isNaN(timestamp)) {
			// Check if it's in milliseconds (greater than year 2000 in seconds)
			const date = timestamp > 946684800 ? new Date(timestamp * 1000) : new Date(timestamp);
			return isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
		}

		return fallback.toISOString();
	};

	return {
		id: dbTask.id,
		agentId: dbTask.agentId,
		type: dbTask.type,
		payload: typeof dbTask.payload === 'string' ? JSON.parse(dbTask.payload) : dbTask.payload,
		status: dbTask.status,
		result: dbTask.result ? (typeof dbTask.result === 'string' ? JSON.parse(dbTask.result) : dbTask.result) : undefined,
		error: dbTask.error,
		createdAt: safeTimestamp(dbTask.createdAt),
		updatedAt: dbTask.updatedAt ? safeTimestamp(dbTask.updatedAt) : undefined
	};
}

/**
 * Convert Agent to database format
 */
function agentToDbAgent(agent: Agent): any {
	return {
		id: agent.id,
		hostname: agent.hostname,
		platform: agent.platform,
		version: agent.version,
		capabilities: JSON.stringify(agent.capabilities),
		status: agent.status,
		lastSeen: new Date(agent.lastSeen), // Use Date object
		registeredAt: new Date(agent.registeredAt), // Use Date object
		containerCount: agent.metrics?.containerCount,
		imageCount: agent.metrics?.imageCount,
		stackCount: agent.metrics?.stackCount,
		networkCount: agent.metrics?.networkCount,
		volumeCount: agent.metrics?.volumeCount,
		dockerVersion: agent.dockerInfo?.version,
		dockerContainers: agent.dockerInfo?.containers,
		dockerImages: agent.dockerInfo?.images,
		metadata: agent.metadata ? JSON.stringify(agent.metadata) : null,
		updatedAt: new Date() // Use Date object
	};
}

/**
 * Convert AgentTask to database format
 */
function agentTaskToDbTask(task: AgentTask): any {
	return {
		id: task.id,
		agentId: task.agentId,
		type: task.type,
		payload: JSON.stringify(task.payload),
		status: task.status,
		result: task.result ? JSON.stringify(task.result) : null,
		error: task.error,
		startedAt: task.status === 'running' ? new Date() : null, // Use Date object
		completedAt: task.status === 'completed' || task.status === 'failed' ? new Date() : null, // Use Date object
		updatedAt: new Date() // Use Date object
	};
}

// ===== AGENT OPERATIONS =====

/**
 * Register or update an agent in the database
 */
export async function registerAgentInDb(agent: Agent): Promise<Agent> {
	try {
		const agentData = agentToDbAgent(agent);

		// Check if agent exists
		const existing = await getAgentByIdFromDb(agent.id);

		if (existing) {
			// Update existing agent
			await db
				.update(agentsTable)
				.set({
					...agentData,
					updatedAt: new Date() // Use Date object
				})
				.where(eq(agentsTable.id, agent.id));
		} else {
			// Insert new agent
			await db.insert(agentsTable).values({
				...agentData,
				createdAt: new Date(), // Use Date object
				updatedAt: new Date() // Use Date object
			});
		}

		return agent;
	} catch (error) {
		console.error('Failed to register agent in database:', error);
		throw error;
	}
}

/**
 * Get agent by ID from database
 */
export async function getAgentByIdFromDb(agentId: string): Promise<Agent | null> {
	try {
		const result = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId)).limit(1);

		if (result.length === 0) {
			return null;
		}

		return dbAgentToAgent(result[0]);
	} catch (error) {
		console.error('Failed to get agent from database:', error);
		throw error;
	}
}

/**
 * Update agent in database
 */
export async function updateAgentInDb(agentId: string, updates: Partial<Agent>): Promise<Agent> {
	try {
		const existing = await getAgentByIdFromDb(agentId);
		if (!existing) {
			throw new Error('Agent not found');
		}

		const updated: Agent = {
			...existing,
			...updates,
			updatedAt: new Date().toISOString()
		};

		const agentData = agentToDbAgent(updated);

		await db.update(agentsTable).set(agentData).where(eq(agentsTable.id, agentId));

		return updated;
	} catch (error) {
		console.error('Failed to update agent in database:', error);
		throw error;
	}
}

/**
 * Update agent heartbeat (status and lastSeen)
 */
export async function updateAgentHeartbeatInDb(agentId: string): Promise<void> {
	try {
		await db
			.update(agentsTable)
			.set({
				status: 'online',
				lastSeen: new Date(), // Use Date object
				updatedAt: new Date() // Use Date object
			})
			.where(eq(agentsTable.id, agentId));
	} catch (error) {
		console.error('Failed to update agent heartbeat in database:', error);
		throw error;
	}
}

/**
 * List all agents from database
 */
export async function listAgentsFromDb(): Promise<Agent[]> {
	try {
		const result = await db.select().from(agentsTable).orderBy(desc(agentsTable.lastSeen));
		return result.map(dbAgentToAgent);
	} catch (error) {
		console.error('Failed to list agents from database:', error);
		throw error;
	}
}

/**
 * Delete agent from database
 */
export async function deleteAgentFromDb(agentId: string): Promise<void> {
	try {
		// Delete all tasks for this agent first
		await db.delete(agentTasksTable).where(eq(agentTasksTable.agentId, agentId));

		// Delete the agent
		await db.delete(agentsTable).where(eq(agentsTable.id, agentId));
	} catch (error) {
		console.error('Failed to delete agent from database:', error);
		throw error;
	}
}

// ===== TASK OPERATIONS =====

/**
 * Create a new task in database
 */
export async function createTaskInDb(task: Omit<AgentTask, 'createdAt' | 'updatedAt'>): Promise<AgentTask> {
	try {
		const taskData = {
			...agentTaskToDbTask(task as AgentTask),
			createdAt: new Date(), // Use Date object
			updatedAt: new Date() // Use Date object
		};

		await db.insert(agentTasksTable).values(taskData);

		return {
			...task,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
	} catch (error) {
		console.error('Failed to create task in database:', error);
		throw error;
	}
}

/**
 * Get task by ID from database
 */
export async function getTaskByIdFromDb(taskId: string): Promise<AgentTask | null> {
	try {
		const result = await db.select().from(agentTasksTable).where(eq(agentTasksTable.id, taskId)).limit(1);

		if (result.length === 0) {
			return null;
		}

		return dbTaskToAgentTask(result[0]);
	} catch (error) {
		console.error('Failed to get task from database:', error);
		throw error;
	}
}

/**
 * Update task status in database
 */
export async function updateTaskStatusInDb(taskId: string, status: string, result?: any, error?: string): Promise<void> {
	try {
		const updateData: any = {
			status,
			updatedAt: new Date() // Use Date object
		};

		if (result !== undefined) {
			updateData.result = JSON.stringify(result);
		}

		if (error !== undefined) {
			updateData.error = error;
		}

		// Set timing fields based on status
		if (status === 'running') {
			updateData.startedAt = new Date(); // Use Date object
		} else if (status === 'completed' || status === 'failed') {
			updateData.completedAt = new Date(); // Use Date object
		}

		await db.update(agentTasksTable).set(updateData).where(eq(agentTasksTable.id, taskId));
	} catch (error) {
		console.error('Failed to update task status in database:', error);
		throw error;
	}
}

/**
 * List tasks from database (optionally filtered by agent)
 */
export async function listTasksFromDb(agentId?: string): Promise<AgentTask[]> {
	try {
		const baseQuery = db.select().from(agentTasksTable);

		const result = agentId ? await baseQuery.where(eq(agentTasksTable.agentId, agentId)).orderBy(desc(agentTasksTable.createdAt)) : await baseQuery.orderBy(desc(agentTasksTable.createdAt));

		return result.map(dbTaskToAgentTask);
	} catch (error) {
		console.error('Failed to list tasks from database:', error);
		throw error;
	}
}

/**
 * Get pending tasks for an agent
 */
export async function getPendingTasksFromDb(agentId: string): Promise<AgentTask[]> {
	try {
		const result = await db
			.select()
			.from(agentTasksTable)
			.where(and(eq(agentTasksTable.agentId, agentId), eq(agentTasksTable.status, 'pending')))
			.orderBy(asc(agentTasksTable.createdAt));

		return result.map(dbTaskToAgentTask);
	} catch (error) {
		console.error('Failed to get pending tasks from database:', error);
		throw error;
	}
}

/**
 * Delete task from database
 */
export async function deleteTaskFromDb(taskId: string): Promise<void> {
	try {
		await db.delete(agentTasksTable).where(eq(agentTasksTable.id, taskId));
	} catch (error) {
		console.error('Failed to delete task from database:', error);
		throw error;
	}
}

/**
 * Delete old completed/failed tasks (cleanup)
 */
export async function cleanupOldTasksFromDb(olderThanDays = 30): Promise<number> {
	try {
		const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

		// Delete completed and failed tasks older than cutoff date
		const result = await db.delete(agentTasksTable).where(
			and(
				// Only delete completed or failed tasks
				or(eq(agentTasksTable.status, 'completed'), eq(agentTasksTable.status, 'failed')),
				// Only delete tasks completed before cutoff date
				lt(agentTasksTable.completedAt, cutoffDate)
			)
		);

		const deletedCount = result.rowsAffected || 0;
		console.log(`Cleaned up ${deletedCount} old tasks older than ${olderThanDays} days`);
		return deletedCount;
	} catch (error) {
		console.error('Failed to cleanup old tasks from database:', error);
		throw error;
	}
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Get agent tasks (alias for listTasksFromDb with agentId)
 */
export async function getAgentTasksFromDb(agentId: string): Promise<AgentTask[]> {
	return listTasksFromDb(agentId);
}

/**
 * Get agent with its recent tasks
 */
export async function getAgentWithTasksFromDb(agentId: string, taskLimit = 10): Promise<{ agent: Agent | null; tasks: AgentTask[] }> {
	try {
		const [agent, tasks] = await Promise.all([
			getAgentByIdFromDb(agentId),
			db
				.select()
				.from(agentTasksTable)
				.where(eq(agentTasksTable.agentId, agentId))
				.orderBy(desc(agentTasksTable.createdAt))
				.limit(taskLimit)
				.then((result) => result.map(dbTaskToAgentTask))
		]);

		return { agent, tasks };
	} catch (error) {
		console.error('Failed to get agent with tasks from database:', error);
		throw error;
	}
}

/**
 * Update agent metrics
 */
export async function updateAgentMetricsInDb(
	agentId: string,
	metrics: {
		containerCount?: number;
		imageCount?: number;
		stackCount?: number;
		networkCount?: number;
		volumeCount?: number;
	}
): Promise<void> {
	try {
		await db
			.update(agentsTable)
			.set({
				containerCount: metrics.containerCount,
				imageCount: metrics.imageCount,
				stackCount: metrics.stackCount,
				networkCount: metrics.networkCount,
				volumeCount: metrics.volumeCount,
				updatedAt: new Date() // Use Date object
			})
			.where(eq(agentsTable.id, agentId));
	} catch (error) {
		console.error('Failed to update agent metrics in database:', error);
		throw error;
	}
}

/**
 * Update agent Docker info
 */
export async function updateAgentDockerInfoInDb(
	agentId: string,
	dockerInfo: {
		version?: string;
		containers?: number;
		images?: number;
	}
): Promise<void> {
	try {
		await db
			.update(agentsTable)
			.set({
				dockerVersion: dockerInfo.version,
				dockerContainers: dockerInfo.containers,
				dockerImages: dockerInfo.images,
				updatedAt: new Date() // Use Date object
			})
			.where(eq(agentsTable.id, agentId));
	} catch (error) {
		console.error('Failed to update agent Docker info in database:', error);
		throw error;
	}
}
