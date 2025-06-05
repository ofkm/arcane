import BaseAPIService from './api-service';
import type { Agent } from '$lib/types/agent.type';

export interface AgentWithStatus extends Agent {
	status: 'online' | 'offline' | 'unknown';
}

export interface AgentStack {
	id?: string;
	name: string;
	status?: string;
	services?: any[];
	// Add other stack properties as needed
}

export interface AgentTask {
	id: string;
	agentId: string;
	type: string;
	status: 'pending' | 'running' | 'completed' | 'failed';
	createdAt: string;
	startedAt?: string;
	completedAt?: string;
	result?: any;
	error?: string;
}

export default class AgentAPIService extends BaseAPIService {
	async list(): Promise<Agent[]> {
		return this.handleResponse(this.api.get('/agents'));
	}

	async get(id: string): Promise<Agent> {
		return this.handleResponse(this.api.get(`/agents/${id}`));
	}

	async create(agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
		return this.handleResponse(this.api.post('/agents', agent));
	}

	async update(id: string, agent: Partial<Agent>): Promise<Agent> {
		return this.handleResponse(this.api.put(`/agents/${id}`, agent));
	}

	async delete(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/agents/${id}`));
	}

	async ping(id: string): Promise<{ success: boolean; responseTime: number }> {
		return this.handleResponse(this.api.post(`/agents/${id}/ping`));
	}

	async getStatus(id: string): Promise<{ status: string; lastSeen: string }> {
		return this.handleResponse(this.api.get(`/agents/${id}/status`));
	}

	async listWithStatus(timeout: number = 5 * 60 * 1000): Promise<AgentWithStatus[]> {
		return this.handleResponse(
			this.api.get('/agents/with-status', {
				params: { timeout }
			})
		);
	}

	// Task management
	async getTasks(id: string): Promise<AgentTask[]> {
		return this.handleResponse(this.api.get(`/agents/${id}/tasks`));
	}

	async getTask(agentId: string, taskId: string): Promise<AgentTask> {
		return this.handleResponse(this.api.get(`/agents/${agentId}/tasks/${taskId}`));
	}

	async createTask(
		agentId: string,
		task: {
			type: string;
			data?: any;
			priority?: 'low' | 'normal' | 'high';
		}
	): Promise<AgentTask> {
		return this.handleResponse(this.api.post(`/agents/${agentId}/tasks`, task));
	}

	async cancelTask(agentId: string, taskId: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/agents/${agentId}/tasks/${taskId}`));
	}

	// Stack management on agents
	async getStacks(id: string): Promise<AgentStack[]> {
		return this.handleResponse(this.api.get(`/agents/${id}/stacks`));
	}

	async getStack(agentId: string, stackName: string): Promise<AgentStack> {
		return this.handleResponse(this.api.get(`/agents/${agentId}/stacks/${encodeURIComponent(stackName)}`));
	}

	async deployStack(
		agentId: string,
		deployment: {
			name: string;
			composeContent: string;
			envContent?: string;
			options?: any;
		}
	): Promise<{ success: boolean; deploymentId: string }> {
		return this.handleResponse(this.api.post(`/agents/${agentId}/stacks/deploy`, deployment));
	}

	async updateStack(
		agentId: string,
		stackName: string,
		update: {
			composeContent?: string;
			envContent?: string;
			options?: any;
		}
	): Promise<{ success: boolean }> {
		return this.handleResponse(this.api.put(`/agents/${agentId}/stacks/${encodeURIComponent(stackName)}`, update));
	}

	async removeStack(
		agentId: string,
		stackName: string,
		options?: {
			removeVolumes?: boolean;
			removeNetworks?: boolean;
		}
	): Promise<{ success: boolean }> {
		return this.handleResponse(
			this.api.delete(`/agents/${agentId}/stacks/${encodeURIComponent(stackName)}`, {
				params: options
			})
		);
	}

	async startStack(agentId: string, stackName: string): Promise<{ success: boolean }> {
		return this.handleResponse(this.api.post(`/agents/${agentId}/stacks/${encodeURIComponent(stackName)}/start`));
	}

	async stopStack(agentId: string, stackName: string): Promise<{ success: boolean }> {
		return this.handleResponse(this.api.post(`/agents/${agentId}/stacks/${encodeURIComponent(stackName)}/stop`));
	}

	async restartStack(agentId: string, stackName: string): Promise<{ success: boolean }> {
		return this.handleResponse(this.api.post(`/agents/${agentId}/stacks/${encodeURIComponent(stackName)}/restart`));
	}

	async getStackLogs(
		agentId: string,
		stackName: string,
		options?: {
			tail?: number;
			timestamps?: boolean;
			follow?: boolean;
		}
	): Promise<string[]> {
		return this.handleResponse(
			this.api.get(`/agents/${agentId}/stacks/${encodeURIComponent(stackName)}/logs`, {
				params: options
			})
		);
	}

	async getDeployments(id: string): Promise<any[]> {
		return this.handleResponse(this.api.get(`/agents/${id}/deployments`));
	}

	async getDeployment(id: string, deploymentId: string): Promise<any> {
		return this.handleResponse(this.api.get(`/agents/${id}/deployments/${deploymentId}`));
	}
}
