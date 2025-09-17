import BaseAPIService from './api-service';
import { get } from 'svelte/store';
import { environmentStore, LOCAL_DOCKER_ENVIRONMENT_ID } from '$lib/stores/environment.store';
import type { ContainerCreateOptions, NetworkCreateOptions, VolumeCreateOptions, ContainerStats } from 'dockerode';
import type { Project, ProjectStatusCounts } from '$lib/types/project.type';
import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
import { browser } from '$app/environment';
import type { ContainerStatusCounts, ContainerSummaryDto } from '$lib/types/container.type';
import type { ImageSummaryDto, ImageUpdateInfoDto, ImageUsageCounts } from '$lib/types/image.type';
import type { NetworkSummaryDto, NetworkUsageCounts } from '$lib/types/network.type';
import type { VolumeSummaryDto, VolumeDetailDto, VolumeUsageDto, VolumeUsageCounts } from '$lib/types/volume.type';
import type { ImageUpdateSummary, ImageVersions, VersionComparison, CompareVersionRequest } from '$lib/types/image.type';
import type { AutoUpdateCheck, AutoUpdateResult, AutoUpdateRecord, AutoUpdateStatus } from '$lib/types/auto-update.type';

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

	async getContainers(options?: SearchPaginationSortRequest): Promise<Paginated<ContainerSummaryDto>> {
		const envId = await this.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/containers`, { params: options });
		return res.data;
	}

	async getContainerStatusCounts(): Promise<ContainerStatusCounts> {
		const envId = await this.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/containers/counts`);
		return res.data.data;
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

	async deleteContainer(containerId: string, opts?: { force?: boolean; volumes?: boolean }): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		const params: Record<string, string> = {};
		if (opts?.force !== undefined) params.force = String(!!opts.force);
		if (opts?.volumes !== undefined) params.volumes = String(!!opts.volumes);

		return this.handleResponse(this.api.delete(`/environments/${envId}/containers/${containerId}`, { params }));
	}

	async pullContainerImage(containerId: string): Promise<Project> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers/${containerId}/pull`));
	}

	async getImages(options?: SearchPaginationSortRequest): Promise<Paginated<ImageSummaryDto>> {
		const envId = await this.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/images`, { params: options });
		return res.data;
	}

	async getImageUsageCounts(): Promise<ImageUsageCounts> {
		const envId = await this.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/images/counts`);
		return res.data.data;
	}

	async getImage(imageId: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/images/${imageId}`));
	}

	async pullImage(imageName: string, tag: string = 'latest', auth?: any): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/images/pull`, { imageName, tag, auth }));
	}

	async deleteImage(imageId: string, options?: { force?: boolean; noprune?: boolean }): Promise<void> {
		const envId = await this.getCurrentEnvironmentId();
		await this.handleResponse(this.api.delete(`/environments/${envId}/images/${imageId}`, { params: options }));
	}

	async pruneImages(dangling?: boolean): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		const body = dangling !== undefined ? { dangling: !!dangling } : {};
		return this.handleResponse(this.api.post(`/environments/${envId}/images/prune`, body));
	}

	async inspectImage(imageId: string): Promise<any> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/images/${imageId}/inspect`));
	}

	async getNetworks(options?: SearchPaginationSortRequest): Promise<Paginated<NetworkSummaryDto>> {
		const envId = await this.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/networks`, { params: options });
		return res.data;
	}

	async getNetworkUsageCounts(): Promise<NetworkUsageCounts> {
		const envId = await this.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/networks/counts`);
		return res.data.data;
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

	async getVolumes(options?: SearchPaginationSortRequest): Promise<Paginated<VolumeSummaryDto>> {
		const envId = await this.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/volumes`, { params: options });
		return res.data;
	}

	async getVolume(volumeName: string): Promise<VolumeDetailDto> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/volumes/${volumeName}`)) as Promise<VolumeDetailDto>;
	}

	async getVolumeUsage(volumeName: string): Promise<VolumeUsageDto> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/volumes/${volumeName}/usage`)) as Promise<VolumeUsageDto>;
	}

	async getVolumeUsageCounts(): Promise<VolumeUsageCounts> {
		const envId = await this.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/volumes/counts`);
		return res.data.data;
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
		const [containers, images, networks, volumes] = await Promise.all([
			this.getContainers(),
			this.getImages(),
			this.getNetworks(),
			this.getVolumes()
		]);

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

	async checkImageUpdate(imageRef: string): Promise<ImageUpdateInfoDto> {
		const envId = await this.getCurrentEnvironmentId();
		const res = await this.api.get(`/environments/${envId}/image-updates/check`, { params: { imageRef } });
		return this.handleResponse(res.data);
	}

	async checkImageUpdateByID(imageId: string): Promise<ImageUpdateInfoDto> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/image-updates/check/${imageId}`));
	}

	async checkAllImages(): Promise<Record<string, ImageUpdateInfoDto>> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/image-updates/check-all`));
	}

	async getUpdateSummary(): Promise<ImageUpdateSummary> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/image-updates/summary`));
	}

	async getImageVersions(imageRef: string, limit = 20): Promise<ImageVersions> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(
			this.api.get(`/environments/${envId}/image-updates/versions`, {
				params: { imageRef, limit }
			})
		);
	}

	async compareVersions(request: CompareVersionRequest): Promise<VersionComparison> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/image-updates/compare`, request));
	}

	async runAutoUpdate(options?: AutoUpdateCheck): Promise<AutoUpdateResult> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/updater/run`, options));
	}

	async getAutoUpdateStatus(): Promise<AutoUpdateStatus> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/updater/status`));
	}

	async getAutoUpdateHistory(limit?: number): Promise<AutoUpdateRecord[]> {
		const envId = await this.getCurrentEnvironmentId();
		const params = limit ? { limit } : undefined;
		return this.handleResponse(this.api.get(`/environments/${envId}/updater/history`, { params }));
	}

	// New Project Api Handlers

	async getProjects(options?: SearchPaginationSortRequest): Promise<Paginated<Project>> {
		const envId = await this.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/projects`, { params: options });
		return res.data;
	}

	async deployProject(projectId: string): Promise<Project> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/projects/${projectId}/up`));
	}

	async downProject(projectName: string): Promise<Project> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/projects/${projectName}/down`));
	}

	async createProject(projectName: string, composeContent: string, envContent?: string): Promise<Project> {
		const envId = await this.getCurrentEnvironmentId();
		const payload = {
			name: projectName,
			composeContent,
			envContent
		};
		return this.handleResponse(this.api.post(`/environments/${envId}/projects`, payload));
	}

	async getProject(projectId: string): Promise<Project> {
		const envId = await this.getCurrentEnvironmentId();
		const response = await this.handleResponse<{ project?: Project; success?: boolean }>(
			this.api.get(`/environments/${envId}/projects/${projectId}`)
		);

		return response.project ? response.project : (response as Project);
	}

	async getProjectStatusCounts(): Promise<ProjectStatusCounts> {
		const envId = await this.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/projects/counts`);
		return res.data.data;
	}

	async updateProject(projectName: string, composeContent: string, envContent?: string): Promise<Project> {
		const envId = await this.getCurrentEnvironmentId();
		const payload = {
			composeContent,
			envContent
		};
		return this.handleResponse(this.api.put(`/environments/${envId}/projects/${projectName}`, payload));
	}

	async restartProject(projectId: string): Promise<Project> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/projects/${projectId}/restart`));
	}

	async redeployProject(projectName: string): Promise<Project> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/projects/${projectName}/redeploy`));
	}

	async pullProjectImages(projectName: string): Promise<Project> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/projects/${projectName}/pull`));
	}

	async destroyProject(projectName: string, removeVolumes = false, removeFiles = false): Promise<void> {
		const envId = await this.getCurrentEnvironmentId();
		await this.handleResponse(
			this.api.delete(`/environments/${envId}/projects/${projectName}/destroy`, {
				data: {
					removeVolumes,
					removeFiles
				}
			})
		);
	}

	//End New Project Api Handlers
}

export const environmentAPI = new EnvironmentAPIService();
