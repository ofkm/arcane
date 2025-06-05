import BaseAPIService from './api-service';
import type { AgentStack, StackStatus } from '$lib/types/agent.type';

export interface DeployStackRequest {
	name: string;
	composeContent: string;
	envContent?: string;
	description?: string;
}

export interface UpdateStackRequest {
	composeContent?: string;
	envContent?: string;
	description?: string;
}

export interface StackLogsOptions {
	tail?: number;
	since?: string;
	follow?: boolean;
}

export default class AgentStackAPIService extends BaseAPIService {
	/**
	 * List all stacks across all agents
	 */
	async list(): Promise<AgentStack[]> {
		return this.handleResponse(this.api.get('/agent-stacks'));
	}

	/**
	 * List stacks for a specific agent
	 */
	async listByAgent(agentId: string): Promise<AgentStack[]> {
		return this.handleResponse(this.api.get(`/agents/${agentId}/stacks`));
	}

	/**
	 * Get a specific stack by ID
	 */
	async get(stackId: string): Promise<AgentStack> {
		return this.handleResponse(this.api.get(`/agent-stacks/${stackId}`));
	}

	/**
	 * Deploy a new stack to an agent
	 */
	async deploy(agentId: string, stackData: DeployStackRequest): Promise<AgentStack> {
		return this.handleResponse(this.api.post(`/agents/${agentId}/stacks`, stackData));
	}

	/**
	 * Update a stack configuration
	 */
	async update(stackId: string, updates: UpdateStackRequest): Promise<AgentStack> {
		return this.handleResponse(this.api.put(`/agent-stacks/${stackId}`, updates));
	}

	/**
	 * Start a stack
	 */
	async start(stackId: string): Promise<void> {
		return this.handleResponse(this.api.post(`/agent-stacks/${stackId}/start`));
	}

	/**
	 * Stop a stack
	 */
	async stop(stackId: string): Promise<void> {
		return this.handleResponse(this.api.post(`/agent-stacks/${stackId}/stop`));
	}

	/**
	 * Restart a stack
	 */
	async restart(stackId: string): Promise<void> {
		return this.handleResponse(this.api.post(`/agent-stacks/${stackId}/restart`));
	}

	/**
	 * Remove/delete a stack
	 */
	async remove(stackId: string, removeVolumes = false): Promise<void> {
		return this.handleResponse(this.api.delete(`/agent-stacks/${stackId}?removeVolumes=${removeVolumes}`));
	}

	/**
	 * Get stack logs
	 */
	async getLogs(stackId: string, options?: StackLogsOptions): Promise<string> {
		const params = new URLSearchParams();
		if (options?.tail) params.append('tail', options.tail.toString());
		if (options?.since) params.append('since', options.since);
		if (options?.follow) params.append('follow', options.follow.toString());

		const query = params.toString() ? `?${params.toString()}` : '';
		return this.handleResponse(this.api.get(`/agent-stacks/${stackId}/logs${query}`));
	}

	/**
	 * Get stack status and health
	 */
	async getStatus(stackId: string): Promise<StackStatus> {
		return this.handleResponse(this.api.get(`/agent-stacks/${stackId}/status`));
	}

	/**
	 * Pull latest images for a stack
	 */
	async pullImages(stackId: string): Promise<void> {
		return this.handleResponse(this.api.post(`/agent-stacks/${stackId}/pull`));
	}

	/**
	 * Get stack resource usage
	 */
	async getResources(stackId: string): Promise<{
		cpuUsage: number;
		memoryUsage: number;
		networkIO: { rx: number; tx: number };
		blockIO: { read: number; write: number };
		containers: Array<{
			name: string;
			cpuUsage: number;
			memoryUsage: number;
			status: string;
		}>;
	}> {
		return this.handleResponse(this.api.get(`/agent-stacks/${stackId}/resources`));
	}

	/**
	 * Scale a service within a stack
	 */
	async scaleService(stackId: string, serviceName: string, replicas: number): Promise<void> {
		return this.handleResponse(
			this.api.post(`/agent-stacks/${stackId}/services/${serviceName}/scale`, {
				replicas
			})
		);
	}

	/**
	 * Get stack services
	 */
	async getServices(stackId: string): Promise<
		Array<{
			name: string;
			image: string;
			status: string;
			replicas: number;
			ports: string[];
		}>
	> {
		return this.handleResponse(this.api.get(`/agent-stacks/${stackId}/services`));
	}

	/**
	 * Get service logs
	 */
	async getServiceLogs(stackId: string, serviceName: string, options?: StackLogsOptions): Promise<string> {
		const params = new URLSearchParams();
		if (options?.tail) params.append('tail', options.tail.toString());
		if (options?.since) params.append('since', options.since);
		if (options?.follow) params.append('follow', options.follow.toString());

		const query = params.toString() ? `?${params.toString()}` : '';
		return this.handleResponse(this.api.get(`/agent-stacks/${stackId}/services/${serviceName}/logs${query}`));
	}

	/**
	 * Update stack environment variables
	 */
	async updateEnvironment(stackId: string, envContent: string): Promise<void> {
		return this.handleResponse(
			this.api.put(`/agent-stacks/${stackId}/environment`, {
				envContent
			})
		);
	}

	/**
	 * Get stack environment variables
	 */
	async getEnvironment(stackId: string): Promise<string> {
		return this.handleResponse(this.api.get(`/agent-stacks/${stackId}/environment`));
	}

	/**
	 * Validate stack compose file
	 */
	async validateCompose(composeContent: string): Promise<{
		valid: boolean;
		errors?: string[];
		warnings?: string[];
	}> {
		return this.handleResponse(
			this.api.post('/agent-stacks/validate', {
				composeContent
			})
		);
	}
}
