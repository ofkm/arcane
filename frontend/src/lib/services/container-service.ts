import BaseAPIService from './api-service';
import { environmentStore } from '$lib/stores/environment.store';
import type { ContainerStatusCounts, ContainerSummaryDto } from '$lib/types/container.type';
import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';

// Would like to get rid of dockerode
import type { ContainerCreateOptions, ContainerStats } from 'dockerode';

export class ContainerService extends BaseAPIService {
	async getContainers(options?: SearchPaginationSortRequest): Promise<Paginated<ContainerSummaryDto>> {
		const envId = await environmentStore.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/containers`, { params: options });
		return res.data;
	}

	async getContainerStatusCounts(): Promise<ContainerStatusCounts> {
		const envId = await environmentStore.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/containers/counts`);
		return res.data.data;
	}

	async getContainer(containerId: string): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/containers/${containerId}`));
	}

	async startContainer(containerId: string): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers/${containerId}/start`));
	}

	async createContainer(options: ContainerCreateOptions): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers`, options));
	}

	async getContainerStats(containerId: string, stream: boolean = false): Promise<ContainerStats> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		const url = `/environments/${envId}/containers/${containerId}/stats${stream ? '?stream=true' : ''}`;
		return this.handleResponse(this.api.get(url)) as Promise<ContainerStats>;
	}

	async stopContainer(containerId: string): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers/${containerId}/stop`));
	}

	async restartContainer(containerId: string): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers/${containerId}/restart`));
	}

	async deleteContainer(containerId: string, opts?: { force?: boolean; volumes?: boolean }): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		const params: Record<string, string> = {};
		if (opts?.force !== undefined) params.force = String(!!opts.force);
		if (opts?.volumes !== undefined) params.volumes = String(!!opts.volumes);

		return this.handleResponse(this.api.delete(`/environments/${envId}/containers/${containerId}`, { params }));
	}
}

export const containerService = new ContainerService();
