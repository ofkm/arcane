import type { Agent, AgentTask } from '$lib/types/agent.type';
import { nanoid } from 'nanoid';
import { updateDeploymentFromTask } from '$lib/services/deployment-service';
import { agentAPI } from '../api';

// Extract the task type from AgentTask to ensure type safety
type AgentTaskType = AgentTask['type'];

/**
 * Register a new agent or update existing one
 */
export async function registerAgent(agent: Agent): Promise<Agent> {
	try {
		const existing = await getAgent(agent.id);

		if (existing) {
			// Update existing agent
			return await updateAgent(agent.id, {
				...agent,
				status: 'online',
				lastSeen: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		} else {
			// Create new agent
			const newAgent: Agent = {
				...agent,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			return await agentAPI.register(newAgent);
		}
	} catch (error) {
		console.error('Failed to register agent:', error);
		throw error;
	}
}

/**
 * Get agent by ID
 */
export async function getAgent(agentId: string): Promise<Agent | null> {
	try {
		return await agentAPI.get(agentId);
	} catch (error) {
		console.error('Failed to get agent:', error);
		return null;
	}
}

/**
 * Update agent information
 */
export async function updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent> {
	try {
		return await agentAPI.update(agentId, updates);
	} catch (error) {
		console.error('Failed to update agent:', error);
		throw error;
	}
}

/**
 * Update agent heartbeat (called by agents to indicate they're online)
 */
export async function updateAgentHeartbeat(agentId: string): Promise<void> {
	try {
		await agentAPI.heartbeat(agentId);
	} catch (error) {
		console.error('Failed to update agent heartbeat:', error);
		// Don't throw here as this is called frequently by agents
	}
}

/**
 * List all agents
 */
export async function listAgents(): Promise<Agent[]> {
	try {
		return await agentAPI.list();
	} catch (error) {
		console.error('Failed to list agents:', error);
		return [];
	}
}

/**
 * Delete an agent and all its tasks
 */
export async function deleteAgent(agentId: string): Promise<void> {
	try {
		await agentAPI.delete(agentId);
		console.log(`Agent ${agentId} deleted successfully`);
	} catch (error) {
		console.error('Failed to delete agent:', error);
		throw error;
	}
}

/**
 * Send a task to an agent
 */
export async function sendTaskToAgent(
	agentId: string,
	taskType: AgentTaskType,
	payload: any
): Promise<AgentTask> {
	try {
		const agent = await getAgent(agentId);
		if (!agent) {
			throw new Error(`Agent ${agentId} not found`);
		}

		if (agent.status !== 'online') {
			throw new Error(`Agent ${agentId} is not online (status: ${agent.status})`);
		}

		// Create task using the API
		const task = await agentAPI.createTask(agentId, {
			type: taskType,
			payload
		});

		console.log(`📋 Task ${task.id} created for agent ${agentId} (will be picked up on next poll)`);

		return task;
	} catch (error) {
		console.error('Failed to send task to agent:', error);
		throw error;
	}
}

/**
 * Update task status (called when agents complete tasks)
 */
export async function updateTaskStatus(
	taskId: string,
	status: string,
	result?: any,
	error?: string
): Promise<void> {
	try {
		await agentAPI.updateTaskStatus(taskId, {
			status,
			result,
			error
		});

		await updateDeploymentFromTask(taskId, status, result, error);

		console.log(`Task ${taskId} status updated to: ${status}`);
	} catch (dbError) {
		console.error('Error updating task status:', dbError);
		// Don't throw here as agents rely on this endpoint
	}
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string): Promise<AgentTask | null> {
	try {
		return await agentAPI.getTask(taskId);
	} catch (error) {
		console.error('Failed to get task:', error);
		return null;
	}
}

/**
 * List tasks (optionally filtered by agent)
 */
export async function listTasks(agentId?: string): Promise<AgentTask[]> {
	try {
		if (agentId) {
			return await agentAPI.listTasks(agentId);
		} else {
			return await agentAPI.listAllTasks();
		}
	} catch (error) {
		console.error('Failed to list tasks:', error);
		return [];
	}
}

/**
 * Get tasks for a specific agent (alias for listTasks)
 */
export async function getAgentTasks(agentId: string): Promise<AgentTask[]> {
	try {
		return await agentAPI.listTasks(agentId);
	} catch (error) {
		console.error('Failed to get agent tasks:', error);
		return [];
	}
}

/**
 * Get pending tasks for an agent (called by agents)
 */
export async function getPendingTasks(agentId: string): Promise<AgentTask[]> {
	try {
		return await agentAPI.getPendingTasks(agentId);
	} catch (error) {
		console.error('Failed to get pending tasks:', error);
		return [];
	}
}

/**
 * Update agent metrics
 */
export async function updateAgentMetrics(
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
		await agentAPI.updateMetrics(agentId, metrics);
	} catch (error) {
		console.error('Failed to update agent metrics:', error);
		// Don't throw as this is not critical
	}
}

/**
 * Update agent Docker information
 */
export async function updateAgentDockerInfo(
	agentId: string,
	dockerInfo: {
		version?: string;
		containers?: number;
		images?: number;
	}
): Promise<void> {
	try {
		await agentAPI.updateDockerInfo(agentId, dockerInfo);
	} catch (error) {
		console.error('Failed to update agent Docker info:', error);
		// Don't throw as this is not critical
	}
}

// ===== CONVENIENCE HELPER FUNCTIONS =====

/**
 * Send Docker command to agent
 */
export async function sendDockerCommand(
	agentId: string,
	command: string,
	args: string[] = []
): Promise<AgentTask> {
	return sendTaskToAgent(agentId, 'docker_command', {
		command,
		args
	});
}

/**
 * Deploy stack to agent
 */
export async function deployStackToAgent(
	agentId: string,
	stackId: string,
	composeContent: string,
	envContent?: string
): Promise<AgentTask> {
	return sendTaskToAgent(agentId, 'stack_deploy', {
		stackId,
		composeContent,
		envContent
	});
}

/**
 * Pull image on agent
 */
export async function pullImageOnAgent(agentId: string, imageName: string): Promise<AgentTask> {
	return sendTaskToAgent(agentId, 'image_pull', {
		imageName
	});
}

/**
 * Send health check to agent
 */
export async function sendHealthCheck(agentId: string): Promise<AgentTask> {
	return sendTaskToAgent(agentId, 'health_check', {});
}

/**
 * Send upgrade command to agent
 */
export async function upgradeAgent(agentId: string, version?: string): Promise<AgentTask> {
	return sendTaskToAgent(agentId, 'agent_upgrade', {
		version: version || 'latest'
	});
}

/**
 * Process agent message (for WebSocket or other real-time communication)
 */
export async function processAgentMessage(agentId: string, message: any): Promise<void> {
	console.log(`Processing message from agent ${agentId}:`, message);

	try {
		if (message.type === 'task_result') {
			const { task_id, status, result, error } = message.data;
			await updateTaskStatus(task_id, status, result, error);
		} else if (message.type === 'heartbeat') {
			await updateAgentHeartbeat(agentId);
		} else if (message.type === 'metrics') {
			await updateAgentMetrics(agentId, message.data);
		} else if (message.type === 'docker_info') {
			await updateAgentDockerInfo(agentId, message.data);
		}
	} catch (error) {
		console.error('Failed to process agent message:', error);
	}
}

/**
 * Check if agent is online (with timeout consideration)
 */
export function isAgentOnline(agent: Agent, timeoutMinutes = 5): boolean {
	if (agent.status !== 'online') return false;

	const now = new Date();
	const lastSeen = new Date(agent.lastSeen);
	const timeoutMs = timeoutMinutes * 60 * 1000;

	return now.getTime() - lastSeen.getTime() < timeoutMs;
}

/**
 * Get agents that are actually online (considering timeout)
 */
export async function getOnlineAgents(timeoutMinutes = 5): Promise<Agent[]> {
	const allAgents = await listAgents();
	return allAgents.filter((agent) => isAgentOnline(agent, timeoutMinutes));
}

/**
 * Get agent statistics
 */
export async function getAgentStats(): Promise<{
	total: number;
	online: number;
	offline: number;
	totalTasks: number;
	pendingTasks: number;
	runningTasks: number;
	completedTasks: number;
	failedTasks: number;
}> {
	try {
		const [agents, allTasks] = await Promise.all([listAgents(), listTasks()]);

		const onlineAgents = agents.filter((agent) => isAgentOnline(agent));

		const taskStats = allTasks.reduce(
			(acc, task) => {
				acc[task.status]++;
				return acc;
			},
			{ pending: 0, running: 0, completed: 0, failed: 0 } as Record<string, number>
		);

		return {
			total: agents.length,
			online: onlineAgents.length,
			offline: agents.length - onlineAgents.length,
			totalTasks: allTasks.length,
			pendingTasks: taskStats.pending,
			runningTasks: taskStats.running,
			completedTasks: taskStats.completed,
			failedTasks: taskStats.failed
		};
	} catch (error) {
		console.error('Failed to get agent stats:', error);
		return {
			total: 0,
			online: 0,
			offline: 0,
			totalTasks: 0,
			pendingTasks: 0,
			runningTasks: 0,
			completedTasks: 0,
			failedTasks: 0
		};
	}
}
