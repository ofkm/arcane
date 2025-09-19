import BaseAPIService from './api-service';
import type { ContainerRegistryCreateDto, ContainerRegistryUpdateDto } from '$lib/types/container-registry.type';
import type { ContainerRegistry } from '$lib/types/container-registry.type';
import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';

export default class ContainerRegistryAPIService extends BaseAPIService {
	async getRegistries(options?: SearchPaginationSortRequest): Promise<Paginated<ContainerRegistry>> {
		const res = await this.api.get('/container-registries', { params: options });
		return res.data;
	}

	async getRegistry(id: string): Promise<ContainerRegistry> {
		return this.handleResponse(this.api.get(`/container-registries/${id}`));
	}

	async createRegistry(registry: ContainerRegistryCreateDto): Promise<ContainerRegistry> {
		return this.handleResponse(this.api.post(`/container-registries`, registry));
	}

	async updateRegistry(id: string, registry: ContainerRegistryUpdateDto): Promise<ContainerRegistry> {
		return this.handleResponse(this.api.put(`/container-registries/${id}`, registry));
	}

	async deleteRegistry(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/container-registries/${id}`));
	}

	async testRegistry(id: string): Promise<any> {
		return this.handleResponse(this.api.post(`/container-registries/${id}/test`));
	}
}
