import BaseAPIService from './api-service';
import { environmentStore } from '$lib/stores/environment.store.svelte';
import type { ContainerRegistryCreateDto, ContainerRegistryUpdateDto } from '$lib/types/container-registry.type';
import type { ContainerRegistry } from '$lib/types/container-registry.type';
import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
import { transformPaginationParams } from '$lib/utils/params.util';

export default class ContainerRegistryService extends BaseAPIService {
	async getRegistries(options?: SearchPaginationSortRequest): Promise<Paginated<ContainerRegistry>> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		const params = transformPaginationParams(options);
		const res = await this.api.get(`/environments/${envId}/container-registries`, { params });
		return res.data;
	}

	async getRegistry(id: string): Promise<ContainerRegistry> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/container-registries/${id}`));
	}

	async createRegistry(registry: ContainerRegistryCreateDto): Promise<ContainerRegistry> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/container-registries`, registry));
	}

	async updateRegistry(id: string, registry: ContainerRegistryUpdateDto): Promise<ContainerRegistry> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.put(`/environments/${envId}/container-registries/${id}`, registry));
	}

	async deleteRegistry(id: string): Promise<void> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.delete(`/environments/${envId}/container-registries/${id}`));
	}

	async testRegistry(id: string): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/container-registries/${id}/test`));
	}
}

export const containerRegistryService = new ContainerRegistryService();
