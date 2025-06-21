import BaseAPIService from './api-service';
import { get } from 'svelte/store';
import { environmentStore, LOCAL_DOCKER_ENVIRONMENT_ID } from '$lib/stores/environment.store';
import type { ContainerCreateOptions, NetworkCreateOptions, VolumeCreateOptions, ContainerStats } from 'dockerode';
import type { Stack, StackService } from '$lib/models/stack.type';

import { browser } from '$app/environment';

export class EnvironmentAPIService extends BaseAPIService {
	private async getCurrentEnvironmentId(): Promise<string> {
		if (browser) {
			await environmentStore.ready;
		}
		const currentEnvironment = get(environmentStore.selected);
		if (!currentEnvironment) {
			return LOCAL_DOCKER_ENVIRONMENT_ID;
		}
		return currentEnvironment.id;
	}

	async getContainers(): Promise<any[]> {
		const envId = await this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ containers?: any[] }>(this.api.get(`/environments/${envId}/containers`));
		return Array.isArray(response.containers) ? response.containers : Array.isArray(response) ? response : [];
	}

	async getContainer(containerId: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/containers/${containerId}`));
	}

	async startContainer(containerId: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers/${containerId}/start`));
	}

	async createContainer(options: ContainerCreateOptions): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers`, options));
	}

	async getContainerStats(containerId: string, stream: boolean = false): Promise<ContainerStats> {
		const envId = await this.getCurrentEnvironmentId();
		const url = `/environments/${envId}/containers/${containerId}/stats${stream ? '?stream=true' : ''}`;
		return this.handleResponse(this.api.get(url)) as Promise<ContainerStats>;
	}

	async stopContainer(containerId: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers/${containerId}/stop`));
	}

	async restartContainer(containerId: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers/${containerId}/restart`));
	}

	async deleteContainer(containerId: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.delete(`/environments/${envId}/containers/${containerId}`));
	}

	async pullContainerImage(containerId: string): Promise<Stack> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers/${containerId}/pull`));
	}

	async getImages(): Promise<any[]> {
		const envId = await this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ images?: any[] }>(this.api.get(`/environments/${envId}/images`));
		return Array.isArray(response.images) ? response.images : Array.isArray(response) ? response : [];
	}

	async getImage(imageId: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/images/${imageId}`));
	}

	async getNetworks(): Promise<any[]> {
		const envId = await this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ networks?: any[] }>(this.api.get(`/environments/${envId}/networks`));
		return Array.isArray(response.networks) ? response.networks : Array.isArray(response) ? response : [];
	}

	async getNetwork(networkId: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/networks/${networkId}`));
	}

	async createNetwork(options: NetworkCreateOptions): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/networks`, options));
	}

	async deleteNetwork(networkId: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.delete(`/environments/${envId}/networks/${networkId}`));
	}

	async getVolumes(): Promise<any[]> {
		const envId = await this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ volumes?: any[] }>(this.api.get(`/environments/${envId}/volumes`));
		return Array.isArray(response.volumes) ? response.volumes : Array.isArray(response) ? response : [];
	}

	async getVolume(volumeName: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/volumes/${volumeName}`));
	}

	async getVolumeUsage(volumeName: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/volumes/${volumeName}/usage`));
	}

	async createVolume(options: VolumeCreateOptions): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/volumes`, options));
	}

	async deleteVolume(volumeName: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.delete(`/environments/${envId}/volumes/${volumeName}`));
	}

	async pruneVolumes(): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/volumes/prune`));
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
		const envId = await this.getCurrentEnvironmentId();
		await this.handleResponse(this.api.post(`/environments/${envId}/sync`));
	}

	async executeDockerCommand(command: string, args: string[] = []): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/execute`, { command, args }));
	}

	async getStacks(): Promise<Stack[]> {
		const envId = await this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ stacks?: Stack[] }>(this.api.get(`/environments/${envId}/stacks`));
		return Array.isArray(response.stacks) ? response.stacks : Array.isArray(response) ? response : [];
	}

	async getStack(stackName: string): Promise<Stack> {
		const envId = await this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ stack?: Stack; success?: boolean }>(this.api.get(`/environments/${envId}/stacks/${stackName}`));

		if (response.stack) {
			return response.stack;
		}

		return response as Stack;
	}

	async deployStack(stackName: string, composeContent: string, envContent?: string): Promise<Stack> {
		const envId = await this.getCurrentEnvironmentId();
		const payload = {
			name: stackName,
			composeContent,
			envContent
		};
		return this.handleResponse(this.api.post(`/environments/${envId}/stacks`, payload));
	}

	async updateStack(stackName: string, composeContent: string, envContent?: string): Promise<Stack> {
		const envId = await this.getCurrentEnvironmentId();
		const payload = {
			composeContent,
			envContent
		};
		return this.handleResponse(this.api.put(`/environments/${envId}/stacks/${stackName}`, payload));
	}

	async deleteStack(stackName: string): Promise<void> {
		const envId = await this.getCurrentEnvironmentId();
		await this.handleResponse(this.api.delete(`/environments/${envId}/stacks/${stackName}`));
	}

	async startStack(stackId: string): Promise<Stack> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/start`));
	}

	async stopStack(stackId: string): Promise<Stack> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/stop`));
	}

	async restartStack(stackId: string): Promise<Stack> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/restart`));
	}

	async getStackLogs(stackId: string): Promise<string> {
		const envId = await this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ logs?: string }>(this.api.get(`/environments/${envId}/stacks/${stackId}/logs`));
		return response.logs || '';
	}

	async deployStackWithOptions(stackId: string, options?: { profiles?: string[]; envOverrides?: Record<string, string> }): Promise<Stack> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/deploy`, options || {}));
	}

	async downStack(stackId: string): Promise<Stack> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/down`));
	}

	async redeployStack(stackId: string): Promise<Stack> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/redeploy`));
	}

	async pullStackImages(stackId: string): Promise<Stack> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/pull`));
	}

	async destroyStack(stackId: string, removeVolumes = false, removeFiles = false): Promise<void> {
		const envId = await this.getCurrentEnvironmentId();
		await this.handleResponse(
			this.api.delete(`/environments/${envId}/stacks/${stackId}/destroy`, {
				data: {
					removeVolumes,
					removeFiles
				}
			})
		);
	}

	async getStackServices(stackName: string): Promise<StackService[]> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/stacks/${stackName}/services`));
	}

	async getStackProfiles(stackName: string): Promise<string[]> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/stacks/${stackName}/profiles`));
	}

	async getStackChanges(stackName: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/stacks/${stackName}/changes`));
	}

	async getStackStats(stackName: string): Promise<ContainerStats[]> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/stacks/${stackName}/stats`)) as Promise<ContainerStats[]>;
	}

	async validateStack(stackName: string): Promise<{ valid: boolean; errors?: string[] }> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/stacks/${stackName}/validate`));
	}

	async convertDockerRun(command: string): Promise<{ composeContent: string }> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/stacks/convert`, { command }));
	}

	async discoverExternalStacks(): Promise<Stack[]> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/stacks/discover-external`));
	}

	async importStack(stackId: string, stackName?: string): Promise<Stack> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(
			this.api.post(`/environments/${envId}/stacks/import`, {
				stackId,
				stackName
			})
		);
	}

	async migrateStack(stackName: string): Promise<Stack> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackName}/migrate`));
	}

	async getStackLogsStream(stackName: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/stacks/${stackName}/logs/stream`));
	}

	async pullImage(imageName: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/images/pull`, { imageName }));
	}

	async deleteImage(imageId: string, options?: { force?: boolean; noprune?: boolean }): Promise<void> {
		const envId = await this.getCurrentEnvironmentId();
		await this.handleResponse(this.api.delete(`/environments/${envId}/images/${imageId}`, { params: options }));
	}

	async pruneImages(): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/images/prune`));
	}
}

export const environmentAPI = new EnvironmentAPIService();
