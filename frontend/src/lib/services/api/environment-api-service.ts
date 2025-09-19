import BaseAPIService from './api-service';
import { get } from 'svelte/store';
import { environmentStore, LOCAL_DOCKER_ENVIRONMENT_ID } from '$lib/stores/environment.store';
import type { ContainerCreateOptions, NetworkCreateOptions, VolumeCreateOptions, ContainerStats } from 'dockerode';
import type { Project, ProjectStatusCounts } from '$lib/types/project.type';
import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
import type { ContainerStatusCounts, ContainerSummaryDto } from '$lib/types/container.type';
import type { ImageSummaryDto, ImageUpdateInfoDto, ImageUsageCounts } from '$lib/types/image.type';
import type { NetworkSummaryDto, NetworkUsageCounts } from '$lib/types/network.type';
import type { VolumeSummaryDto, VolumeDetailDto, VolumeUsageDto, VolumeUsageCounts } from '$lib/types/volume.type';
import type { AutoUpdateCheck, AutoUpdateResult } from '$lib/types/auto-update.type';

export class EnvironmentAPIService extends BaseAPIService {
	private async getCurrentEnvironmentId(): Promise<string> {
		await environmentStore.ready;

		const currentEnvironment = get(environmentStore.selected);
		if (!currentEnvironment) {
			return LOCAL_DOCKER_ENVIRONMENT_ID;
		}
		return currentEnvironment.id;
	}

	// Container Api Calls

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

	// End Container Api Calls

	// Image Api Calls

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

	// End Image Api Calls

	// Network Api Calls

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

	// End Network Api Calls

	// Volume Api Calls

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

	// End Volume Api Calls

	// Image Updater Api Calls

	async checkImageUpdateByID(imageId: string): Promise<ImageUpdateInfoDto> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/image-updates/check/${imageId}`));
	}

	async checkAllImages(): Promise<Record<string, ImageUpdateInfoDto>> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/image-updates/check-all`));
	}

	async runAutoUpdate(options?: AutoUpdateCheck): Promise<AutoUpdateResult> {
		const envId = await this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/updater/run`, options));
	}

	// End Image Updater Api Calls

	// Project Api Calls

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

	private isDownloadingStatus(status?: string): boolean {
		if (!status) return false;
		const s = status.toLowerCase();
		return (
			s.includes('downloading') ||
			s.includes('extracting') ||
			s.includes('pull complete') ||
			s.includes('download complete') ||
			s.includes('pulling fs layer')
		);
	}

	private async streamProjectPull(projectId: string, onLine?: (data: any) => void): Promise<boolean> {
		const envId = await this.getCurrentEnvironmentId();
		const url = `/api/environments/${envId}/projects/${projectId}/pull`;

		const res = await fetch(url, { method: 'POST' });
		if (!res.ok || !res.body) {
			throw new Error(`Failed to start project image pull (${res.status})`);
		}

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let pulled = false;

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) continue;
				try {
					const obj = JSON.parse(trimmed);

					// Detect if any actual download happened
					if (!pulled) {
						const status = obj?.status as string | undefined;
						const total = obj?.progressDetail?.total as number | undefined;
						if (this.isDownloadingStatus(status) || (typeof total === 'number' && total > 0)) {
							pulled = true;
						}
					}

					onLine?.(obj);
				} catch {
					// ignore malformed line
				}
			}
		}
		return pulled;
	}

	pullProjectImages(projectId: string): Promise<void>;
	pullProjectImages(projectId: string, onLine: (data: any) => void): Promise<void>;
	async pullProjectImages(projectId: string, onLine?: (data: any) => void): Promise<void> {
		await this.streamProjectPull(projectId, onLine);
	}

	async deployProjectMaybePull(
		projectId: string,
		onPullLine?: (data: any) => void
	): Promise<{ pulled: boolean; project: Project }> {
		const pulled = await this.streamProjectPull(projectId, onPullLine);
		const project = await this.deployProject(projectId);
		return { pulled, project };
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

	//End New Project Api Calls
}

export const environmentAPI = new EnvironmentAPIService();
