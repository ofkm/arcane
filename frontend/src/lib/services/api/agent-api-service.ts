import BaseAPIService from './api-service';
import type { Agent, AgentTask, AgentStats, AgentToken, AgentResource } from '$lib/types/agent.type';
import type { CreateAgentDTO, UpdateAgentDTO, CreateTaskDTO, UpdateTaskStatusDTO, UpdateMetricsDTO, UpdateDockerInfoDTO, HeartbeatDTO } from '$lib/dto/agent-dto';
import type { AgentResponse, AgentsListResponse, TaskResponse, TasksListResponse, AgentStatsResponse, HeartbeatResponse, AgentTokensListResponse, AgentTokenResponse, AgentResourceResponse } from '$lib/types/api-response.type';

export default class AgentAPIService extends BaseAPIService {
	async register(dto: CreateAgentDTO): Promise<Agent> {
		const response = await this.handleResponse<AgentResponse>(this.api.post('/agents/register', dto));
		return response.agent!;
	}

	async get(agentId: string): Promise<Agent> {
		const response = await this.handleResponse<AgentResponse>(this.api.get(`/agents/${agentId}`));
		return response.agent!;
	}

	async list(): Promise<Agent[]> {
		const response = await this.handleResponse<AgentsListResponse>(this.api.get('/agents'));
		return response.agents;
	}

	async update(agentId: string, dto: UpdateAgentDTO): Promise<Agent> {
		const response = await this.handleResponse<AgentResponse>(this.api.put(`/agents/${agentId}`, dto));
		return response.agent!;
	}

	async delete(agentId: string): Promise<void> {
		await this.handleResponse(this.api.delete(`/agents/${agentId}`));
	}

	async heartbeat(dto: HeartbeatDTO): Promise<void> {
		await this.handleResponse<HeartbeatResponse>(this.api.post(`/agents/${dto.agent_id}/heartbeat`, dto));
	}

	async createTask(agentId: string, dto: CreateTaskDTO): Promise<AgentTask> {
		const response = await this.handleResponse<TaskResponse>(this.api.post(`/agents/${agentId}/tasks`, dto));
		return response.task!;
	}

	async getTask(taskId: string): Promise<AgentTask> {
		const response = await this.handleResponse<TaskResponse>(this.api.get(`/tasks/${taskId}`));
		return response.task!;
	}

	async getTasks(agentId: string): Promise<AgentTask[]> {
		const response = await this.handleResponse<TasksListResponse>(this.api.get(`/agents/${agentId}/tasks`));
		return response.tasks;
	}

	async listAllTasks(): Promise<AgentTask[]> {
		const response = await this.handleResponse<TasksListResponse>(this.api.get('/tasks'));
		return response.tasks;
	}

	async getPendingTasks(agentId: string): Promise<AgentTask[]> {
		const response = await this.handleResponse<TasksListResponse>(this.api.get(`/agents/${agentId}/tasks/pending`));
		return response.tasks;
	}

	async updateTaskStatus(taskId: string, dto: UpdateTaskStatusDTO): Promise<void> {
		await this.handleResponse(this.api.put(`/tasks/${taskId}/status`, dto));
	}

	async cancelTask(taskId: string): Promise<void> {
		await this.handleResponse(this.api.post(`/tasks/${taskId}/cancel`));
	}

	async deleteTask(taskId: string): Promise<void> {
		await this.handleResponse(this.api.delete(`/tasks/${taskId}`));
	}

	async getStats(): Promise<AgentStats> {
		const response = await this.handleResponse<AgentStatsResponse>(this.api.get('/agents/stats'));
		return response.stats!;
	}

	async updateMetrics(agentId: string, dto: UpdateMetricsDTO): Promise<void> {
		await this.handleResponse(this.api.post(`/agents/${agentId}/metrics`, dto));
	}

	async updateDockerInfo(agentId: string, dto: UpdateDockerInfoDTO): Promise<void> {
		await this.handleResponse(this.api.post(`/agents/${agentId}/docker-info`, dto));
	}

	async getAgentTokens(agentId: string): Promise<AgentToken[]> {
		const response = await this.handleResponse<AgentTokensListResponse>(this.api.get(`/agents/${agentId}/tokens`));
		return response.tokens;
	}

	async createAgentToken(agentId: string, tokenData: { name: string; permissions: string[] }): Promise<{ token: AgentToken; value: string }> {
		const response = await this.handleResponse<AgentTokenResponse>(this.api.post(`/agents/${agentId}/tokens`, tokenData));
		return { token: response.token!, value: response.value! };
	}

	async deleteAgentToken(agentId: string, tokenId: string): Promise<void> {
		await this.handleResponse(this.api.delete(`/agents/${agentId}/tokens/${tokenId}`));
	}

	async getAgentResources(agentId: string): Promise<Record<string, AgentResource>> {
		const response = await this.handleResponse<AgentResourceResponse>(this.api.get(`/agents/${agentId}/resources`));
		return response.resources || {};
	}

	async getAgentResource(agentId: string, resourceType: string): Promise<AgentResource> {
		const response = await this.handleResponse<AgentResourceResponse>(this.api.get(`/agents/${agentId}/resources/${resourceType}`));
		return response.resource!;
	}

	async syncAgentResources(agentId: string): Promise<void> {
		await this.handleResponse<AgentResourceResponse>(this.api.post(`/agents/${agentId}/resources/sync`));
	}

	async getAgentContainers(agentId: string): Promise<any[]> {
		const response = await this.handleResponse<AgentResourceResponse>(this.api.get(`/agents/${agentId}/containers`));
		return response.containers || [];
	}

	async getAgentImages(agentId: string): Promise<any[]> {
		const response = await this.handleResponse<AgentResourceResponse>(this.api.get(`/agents/${agentId}/images`));
		return response.images || [];
	}

	async getAgentNetworks(agentId: string): Promise<any[]> {
		const response = await this.handleResponse<AgentResourceResponse>(this.api.get(`/agents/${agentId}/networks`));
		return response.networks || [];
	}

	async getAgentVolumes(agentId: string): Promise<any[]> {
		const response = await this.handleResponse<AgentResourceResponse>(this.api.get(`/agents/${agentId}/volumes`));
		return response.volumes || [];
	}
}
