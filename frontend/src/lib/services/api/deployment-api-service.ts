import BaseAPIService from './api-service';
import type { DeploymentStatus, DeploymentConfig } from '$lib/types/deployment.type';

export default class DeploymentAPIService extends BaseAPIService {
	async deployStack(config: DeploymentConfig): Promise<DeploymentStatus> {
		return this.handleResponse(this.api.post('/deployments', config));
	}

	async getDeploymentStatus(id: string): Promise<DeploymentStatus> {
		return this.handleResponse(this.api.get(`/deployments/${id}`));
	}

	async getDeployments(): Promise<DeploymentStatus[]> {
		return this.handleResponse(this.api.get('/deployments'));
	}

	async cancelDeployment(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/deployments/${id}`));
	}

	async getDeploymentLogs(id: string): Promise<string[]> {
		return this.handleResponse(this.api.get(`/deployments/${id}/logs`));
	}
}
