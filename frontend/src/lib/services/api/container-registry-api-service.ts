import BaseAPIService from './api-service';
import type { ContainerRegistryCreateDto, ContainerRegistryUpdateDto } from '$lib/dto/container-registry-dto';
import type { ContainerRegistry } from '$lib/models/container-registry';

export default class ContainerRegistryAPIService extends BaseAPIService {
	async getAllRegistries(): Promise<ContainerRegistry[]> {
		return this.handleResponse(this.api.get(`/container-registries`));
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
