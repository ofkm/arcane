import BaseAPIService from './api-service';
import type { Agent, AgentTask } from '$lib/types/agent.type';

export interface CreateTaskRequest {
	type: string;
	payload: any;
}

export interface UpdateTaskStatusRequest {
	status: string;
	result?: any;
	error?: string;
}

export interface AgentMetrics {
	containerCount?: number;
	imageCount?: number;
	stackCount?: number;
	networkCount?: number;
	volumeCount?: number;
}

export interface DockerInfo {
	version?: string;
	containers?: number;
	images?: number;
}

export default class AgentAPIService extends BaseAPIService {
	// ===== AGENT MANAGEMENT =====

	/**
	 * Register a new agent
	 */
	async register(agent: Agent): Promise<Agent> {
		return this.handleResponse(this.api.post('/agents/register', agent));
	}

	/**
	 * Get agent by ID
	 */
	async get(agentId: string): Promise<Agent> {
		return this.handleResponse(this.api.get(`/agents/${agentId}`));
	}

	/**
	 * Update agent information
	 */
	async update(agentId: string, updates: Partial<Agent>): Promise<Agent> {
		return this.handleResponse(this.api.put(`/agents/${agentId}`, updates));
	}

	/**
	 * List all agents
	 */
	async list(): Promise<Agent[]> {
		return this.handleResponse(this.api.get('/agents'));
	}

	/**
	 * Delete an agent
	 */
	async delete(agentId: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/agents/${agentId}`));
	}

	/**
	 * Update agent heartbeat
	 */
	async heartbeat(agentId: string): Promise<void> {
		return this.handleResponse(this.api.post(`/agents/${agentId}/heartbeat`));
	}

	/**
	 * Update agent metrics
	 */
	async updateMetrics(agentId: string, metrics: AgentMetrics): Promise<void> {
		return this.handleResponse(this.api.put(`/agents/${agentId}/metrics`, metrics));
	}

	/**
	 * Update agent Docker information
	 */
	async updateDockerInfo(agentId: string, dockerInfo: DockerInfo): Promise<void> {
		return this.handleResponse(this.api.put(`/agents/${agentId}/docker-info`, dockerInfo));
	}

	// ===== TASK MANAGEMENT =====

	/**
	 * Create a new task for an agent
	 */
	async createTask(agentId: string, taskData: CreateTaskRequest): Promise<AgentTask> {
		return this.handleResponse(this.api.post(`/agents/${agentId}/tasks`, taskData));
	}

	/**
	 * Get a specific task by ID
	 */
	async getTask(taskId: string): Promise<AgentTask> {
		return this.handleResponse(this.api.get(`/tasks/${taskId}`));
	}

	/**
	 * Update task status
	 */
	async updateTaskStatus(taskId: string, statusData: UpdateTaskStatusRequest): Promise<void> {
		return this.handleResponse(this.api.put(`/tasks/${taskId}/status`, statusData));
	}

	/**
	 * List tasks for a specific agent
	 */
	async listTasks(agentId: string): Promise<AgentTask[]> {
		return this.handleResponse(this.api.get(`/agents/${agentId}/tasks`));
	}

	/**
	 * List all tasks across all agents
	 */
	async listAllTasks(): Promise<AgentTask[]> {
		return this.handleResponse(this.api.get('/tasks'));
	}

	/**
	 * Get pending tasks for an agent
	 */
	async getPendingTasks(agentId: string): Promise<AgentTask[]> {
		return this.handleResponse(this.api.get(`/agents/${agentId}/tasks/pending`));
	}

	/**
	 * Cancel a task
	 */
	async cancelTask(taskId: string): Promise<void> {
		return this.handleResponse(this.api.post(`/tasks/${taskId}/cancel`));
	}

	/**
	 * Delete a task
	 */
	async deleteTask(taskId: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/tasks/${taskId}`));
	}

	/**
	 * Get task logs
	 */
	async getTaskLogs(taskId: string): Promise<string> {
		return this.handleResponse(this.api.get(`/tasks/${taskId}/logs`));
	}

	// ===== AGENT STATISTICS =====

	/**
	 * Get agent statistics
	 */
	async getAgentStats(agentId: string): Promise<{
		containerCount: number;
		imageCount: number;
		stackCount: number;
		networkCount: number;
		volumeCount: number;
		cpuUsage?: number;
		memoryUsage?: number;
		diskUsage?: number;
	}> {
		return this.handleResponse(this.api.get(`/agents/${agentId}/stats`));
	}

	/**
	 * Get overall system statistics
	 */
	async getSystemStats(): Promise<{
		totalAgents: number;
		onlineAgents: number;
		offlineAgents: number;
		totalTasks: number;
		pendingTasks: number;
		runningTasks: number;
		completedTasks: number;
		failedTasks: number;
	}> {
		return this.handleResponse(this.api.get('/agents/stats'));
	}

	// ===== DOCKER OPERATIONS =====

	/**
	 * Execute Docker command on agent
	 */
	async executeDockerCommand(agentId: string, command: string, args: string[] = []): Promise<AgentTask> {
		return this.createTask(agentId, {
			type: 'docker_command',
			payload: { command, args }
		});
	}

	/**
	 * Pull Docker image on agent
	 */
	async pullImage(agentId: string, imageName: string): Promise<AgentTask> {
		return this.createTask(agentId, {
			type: 'image_pull',
			payload: { imageName }
		});
	}

	/**
	 * Deploy stack on agent
	 */
	async deployStack(agentId: string, stackId: string, composeContent: string, envContent?: string): Promise<AgentTask> {
		return this.createTask(agentId, {
			type: 'stack_deploy',
			payload: { stackId, composeContent, envContent }
		});
	}

	/**
	 * Health check agent
	 */
	async healthCheck(agentId: string): Promise<AgentTask> {
		return this.createTask(agentId, {
			type: 'health_check',
			payload: {}
		});
	}

	/**
	 * Upgrade agent
	 */
	async upgradeAgent(agentId: string, version = 'latest'): Promise<AgentTask> {
		return this.createTask(agentId, {
			type: 'agent_upgrade',
			payload: { version }
		});
	}

	// ===== REAL-TIME OPERATIONS =====

	/**
	 * Process agent message (for WebSocket communication)
	 */
	async processMessage(agentId: string, message: any): Promise<void> {
		return this.handleResponse(this.api.post(`/agents/${agentId}/messages`, message));
	}

	/**
	 * Get agent logs
	 */
	async getAgentLogs(
		agentId: string,
		options?: {
			tail?: number;
			since?: string;
			follow?: boolean;
		}
	): Promise<string> {
		const params = new URLSearchParams();
		if (options?.tail) params.append('tail', options.tail.toString());
		if (options?.since) params.append('since', options.since);
		if (options?.follow) params.append('follow', options.follow.toString());

		const query = params.toString() ? `?${params.toString()}` : '';
		return this.handleResponse(this.api.get(`/agents/${agentId}/logs${query}`));
	}

	// ===== AGENT CONFIGURATION =====

	/**
	 * Get agent configuration
	 */
	async getAgentConfig(agentId: string): Promise<any> {
		return this.handleResponse(this.api.get(`/agents/${agentId}/config`));
	}

	/**
	 * Update agent configuration
	 */
	async updateAgentConfig(agentId: string, config: any): Promise<void> {
		return this.handleResponse(this.api.put(`/agents/${agentId}/config`, config));
	}

	// ===== BULK OPERATIONS =====

	/**
	 * Bulk update multiple agents
	 */
	async bulkUpdate(updates: Array<{ agentId: string; data: Partial<Agent> }>): Promise<Agent[]> {
		return this.handleResponse(this.api.put('/agents/bulk', { updates }));
	}

	/**
	 * Bulk delete multiple agents
	 */
	async bulkDelete(agentIds: string[]): Promise<void> {
		return this.handleResponse(this.api.delete('/agents/bulk', { data: { agentIds } }));
	}

	/**
	 * Send task to multiple agents
	 */
	async bulkCreateTasks(agentIds: string[], taskData: CreateTaskRequest): Promise<AgentTask[]> {
		return this.handleResponse(
			this.api.post('/agents/bulk/tasks', {
				agentIds,
				taskData
			})
		);
	}
}
