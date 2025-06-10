import BaseAPIService from './api-service';
import type { Deployment } from '$lib/types/deployment.type';

export interface CreateDeploymentRequest {
	name: string;
	type: 'stack' | 'container' | 'image';
	status: 'pending' | 'running' | 'stopped' | 'failed' | 'completed';
	agentId: string;
	taskId?: string;
	metadata?: Record<string, any>;
}

export interface UpdateDeploymentRequest {
	name?: string;
	status?: 'pending' | 'running' | 'stopped' | 'failed' | 'completed';
	error?: string;
	metadata?: Record<string, any>;
}

export interface CreateStackDeploymentRequest {
	agentId: string;
	stackName: string;
	composeContent: string;
	envContent?: string;
	taskId?: string;
}

export interface CreateContainerDeploymentRequest {
	agentId: string;
	containerName: string;
	imageName: string;
	ports?: string[];
	volumes?: string[];
	taskId?: string;
}

export interface CreateImageDeploymentRequest {
	agentId: string;
	imageName: string;
	taskId?: string;
}

export default class DeploymentAPIService extends BaseAPIService {
	/**
	 * Create a new deployment
	 */
	async create(deployment: CreateDeploymentRequest): Promise<Deployment> {
		return this.handleResponse(this.api.post('/deployments', deployment));
	}

	/**
	 * Get a deployment by ID
	 */
	async get(deploymentId: string): Promise<Deployment> {
		return this.handleResponse(this.api.get(`/deployments/${deploymentId}`));
	}

	/**
	 * List deployments, optionally filtered by agent
	 */
	async list(agentId?: string): Promise<Deployment[]> {
		const params = agentId ? `?agentId=${encodeURIComponent(agentId)}` : '';
		return this.handleResponse(this.api.get(`/deployments${params}`));
	}

	/**
	 * Update a deployment
	 */
	async update(deploymentId: string, updates: UpdateDeploymentRequest): Promise<Deployment> {
		return this.handleResponse(this.api.put(`/deployments/${deploymentId}`, updates));
	}

	/**
	 * Delete a deployment
	 */
	async delete(deploymentId: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/deployments/${deploymentId}`));
	}

	/**
	 * Update deployment status
	 */
	async updateStatus(deploymentId: string, status: string, error?: string): Promise<void> {
		return this.handleResponse(
			this.api.put(`/deployments/${deploymentId}/status`, {
				status,
				error
			})
		);
	}

	/**
	 * Get deployment by task ID
	 */
	async getByTaskId(taskId: string): Promise<Deployment | null> {
		try {
			return this.handleResponse(this.api.get(`/deployments/by-task/${taskId}`));
		} catch (error: unknown) {
			// Return null if not found instead of throwing
			if (
				typeof error === 'object' &&
				error !== null &&
				'response' in error &&
				typeof (error as any).response === 'object' &&
				(error as any).response?.status === 404
			) {
				return null;
			}
			throw error;
		}
	}

	/**
	 * Create a stack deployment
	 */
	async createStackDeployment(data: CreateStackDeploymentRequest): Promise<Deployment> {
		return this.handleResponse(this.api.post('/deployments/stack', data));
	}

	/**
	 * Create a container deployment
	 */
	async createContainerDeployment(data: CreateContainerDeploymentRequest): Promise<Deployment> {
		return this.handleResponse(this.api.post('/deployments/container', data));
	}

	/**
	 * Create an image deployment
	 */
	async createImageDeployment(data: CreateImageDeploymentRequest): Promise<Deployment> {
		return this.handleResponse(this.api.post('/deployments/image', data));
	}

	/**
	 * Get deployments by agent
	 */
	async getByAgent(agentId: string): Promise<Deployment[]> {
		return this.handleResponse(this.api.get(`/agents/${agentId}/deployments`));
	}

	/**
	 * Get deployment logs
	 */
	async getLogs(deploymentId: string): Promise<string> {
		return this.handleResponse(this.api.get(`/deployments/${deploymentId}/logs`));
	}

	/**
	 * Get deployment statistics
	 */
	async getStats(): Promise<{
		total: number;
		pending: number;
		running: number;
		completed: number;
		failed: number;
		byAgent: Record<string, number>;
		byType: Record<string, number>;
	}> {
		return this.handleResponse(this.api.get('/deployments/stats'));
	}
}
