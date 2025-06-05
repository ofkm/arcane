import BaseAPIService from './api-service';

export interface Deployment {
	id: string;
	agentId?: string;
	stackName: string;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	createdAt: string;
	startedAt?: string;
	completedAt?: string;
	result?: any;
	error?: string;
	logs?: string[];
}

export default class DeploymentAPIService extends BaseAPIService {
	async list(): Promise<Deployment[]> {
		return this.handleResponse(this.api.get('/deployments'));
	}

	async get(id: string): Promise<Deployment> {
		return this.handleResponse(this.api.get(`/deployments/${id}`));
	}

	async getByAgent(agentId: string): Promise<Deployment[]> {
		return this.handleResponse(this.api.get(`/deployments/agent/${agentId}`));
	}

	async getByStack(stackName: string): Promise<Deployment[]> {
		return this.handleResponse(this.api.get(`/deployments/stack/${encodeURIComponent(stackName)}`));
	}

	async create(deployment: Omit<Deployment, 'id' | 'createdAt'>): Promise<Deployment> {
		return this.handleResponse(this.api.post('/deployments', deployment));
	}

	async update(id: string, deployment: Partial<Deployment>): Promise<Deployment> {
		return this.handleResponse(this.api.put(`/deployments/${id}`, deployment));
	}

	async cancel(id: string): Promise<void> {
		return this.handleResponse(this.api.post(`/deployments/${id}/cancel`));
	}

	async delete(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/deployments/${id}`));
	}

	async getLogs(id: string): Promise<string[]> {
		return this.handleResponse(this.api.get(`/deployments/${id}/logs`));
	}

	async getStatus(id: string): Promise<{ status: string; progress?: number }> {
		return this.handleResponse(this.api.get(`/deployments/${id}/status`));
	}
}
