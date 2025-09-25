import BaseAPIService from './api-service';
import type { Environment } from '$lib/types/environment.type';
import type { CreateEnvironmentDTO, UpdateEnvironmentDTO } from '$lib/types/environment.type';
import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';

export default class EnvironmentManagementService extends BaseAPIService {
	async create(dto: CreateEnvironmentDTO): Promise<Environment> {
		const res = await this.api.post('/environments', dto);
		return res.data.data as Environment;
	}

	async getEnvironments(options: SearchPaginationSortRequest): Promise<Paginated<Environment>> {
		const res = await this.api.get('/environments', { params: options });
		return res.data;
	}

	async get(environmentId: string): Promise<Environment> {
		const res = await this.api.get(`/environments/${environmentId}`);
		return res.data.data as Environment;
	}

	async update(environmentId: string, dto: UpdateEnvironmentDTO): Promise<Environment> {
		const res = await this.api.put(`/environments/${environmentId}`, dto);
		return res.data.data as Environment;
	}

	async delete(environmentId: string): Promise<void> {
		await this.api.delete(`/environments/${environmentId}`);
	}

	async testConnection(environmentId: string): Promise<{ status: 'online' | 'offline'; message?: string }> {
		const res = await this.api.post(`/environments/${environmentId}/test`);
		return res.data.data as { status: 'online' | 'offline'; message?: string };
	}
}

export const environmentManagementService = new EnvironmentManagementService();
