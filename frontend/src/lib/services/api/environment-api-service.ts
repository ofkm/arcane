import BaseAPIService from './api-service';
import { get } from 'svelte/store';
import { environmentStore, LOCAL_DOCKER_ENVIRONMENT_ID } from '$lib/stores/environment.store';

export class EnvironmentAPIService extends BaseAPIService {
	private getCurrentEnvironmentId(): string {
		const currentEnvironment = get(environmentStore.selected);
		if (!currentEnvironment) {
			return LOCAL_DOCKER_ENVIRONMENT_ID;
		}
		return currentEnvironment.id;
	}

	async getContainers(): Promise<any[]> {
		const envId = this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ containers?: any[] }>(this.api.get(`/environments/${envId}/containers`));
		return Array.isArray(response.containers) ? response.containers : Array.isArray(response) ? response : [];
	}

	async getImages(): Promise<any[]> {
		const envId = this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ images?: any[] }>(this.api.get(`/environments/${envId}/images`));
		return Array.isArray(response.images) ? response.images : Array.isArray(response) ? response : [];
	}

	async getNetworks(): Promise<any[]> {
		const envId = this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ networks?: any[] }>(this.api.get(`/environments/${envId}/networks`));
		return Array.isArray(response.networks) ? response.networks : Array.isArray(response) ? response : [];
	}

	async getVolumes(): Promise<any[]> {
		const envId = this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ volumes?: any[] }>(this.api.get(`/environments/${envId}/volumes`));
		return Array.isArray(response.volumes) ? response.volumes : Array.isArray(response) ? response : [];
	}

	async getAllResources(): Promise<Record<string, any>> {
		const [containers, images, networks, volumes] = await Promise.all([this.getContainers(), this.getImages(), this.getNetworks(), this.getVolumes()]);

		return {
			containers,
			images,
			networks,
			volumes
		};
	}

	async syncResources(): Promise<void> {
		const envId = this.getCurrentEnvironmentId();
		await this.handleResponse(this.api.post(`/environments/${envId}/sync`));
	}

	async executeDockerCommand(command: string, args: string[] = []): Promise<any> {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/execute`, { command, args }));
	}

	async getStacks(): Promise<any[]> {
		const envId = this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ stacks?: any[] }>(this.api.get(`/environments/${envId}/stacks`));
		return Array.isArray(response.stacks) ? response.stacks : Array.isArray(response) ? response : [];
	}

	async getStack(stackName: string): Promise<any> {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/stacks/${stackName}`));
	}

	async deployStack(stackName: string, composeContent: string, envContent?: string): Promise<any> {
		const envId = this.getCurrentEnvironmentId();
		const payload = {
			name: stackName,
			composeContent,
			envContent
		};

		return this.handleResponse(this.api.post(`/environments/${envId}/stacks`, payload));
	}

	async updateStack(stackName: string, composeContent: string, envContent?: string): Promise<any> {
		const envId = this.getCurrentEnvironmentId();
		const payload = {
			composeContent,
			envContent
		};

		return this.handleResponse(this.api.put(`/environments/${envId}/stacks/${stackName}`, payload));
	}

	async deleteStack(stackName: string): Promise<void> {
		const envId = this.getCurrentEnvironmentId();
		await this.handleResponse(this.api.delete(`/environments/${envId}/stacks/${stackName}`));
	}

	async startStack(stackName: string): Promise<any> {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackName}/start`));
	}

	async stopStack(stackName: string): Promise<any> {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackName}/stop`));
	}

	async restartStack(stackName: string): Promise<any> {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackName}/restart`));
	}

	async getStackLogs(stackName: string): Promise<string> {
		const envId = this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ logs?: string }>(this.api.get(`/environments/${envId}/stacks/${stackName}/logs`));
		return response.logs || '';
	}
}

export const environmentAPI = new EnvironmentAPIService();
