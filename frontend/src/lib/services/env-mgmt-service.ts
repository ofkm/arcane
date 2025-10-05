import BaseAPIService from './api-service';
import type { Environment } from '$lib/types/environment.type';
import type { CreateEnvironmentDTO, UpdateEnvironmentDTO } from '$lib/types/environment.type';
import type { Paginated, PaginationResponse, SearchPaginationSortRequest } from '$lib/types/pagination.type';
import { transformPaginationParams } from '$lib/utils/params.util';

export default class EnvironmentManagementService extends BaseAPIService {
	async create(dto: CreateEnvironmentDTO): Promise<Environment> {
		return this.handleResponse<Environment>(this.api.post('/environments', dto));
	}

	async getEnvironments(options: SearchPaginationSortRequest): Promise<Paginated<Environment>> {
		const params = transformPaginationParams(options);
		const response = await this.handleResponse<{
			items?: Environment[];
			pagination: PaginationResponse;
		}>(this.api.get('/environments', { params }));

		return {
			data: Array.isArray(response.items) ? response.items : [],
			pagination: response.pagination
		};
	}

	async get(environmentId: string): Promise<Environment> {
		return this.handleResponse<Environment>(this.api.get(`/environments/${environmentId}`));
	}

	async update(environmentId: string, dto: UpdateEnvironmentDTO): Promise<Environment> {
		return this.handleResponse<Environment>(this.api.put(`/environments/${environmentId}`, dto));
	}

	async delete(environmentId: string): Promise<void> {
		await this.api.delete(`/environments/${environmentId}`);
	}

	async testConnection(environmentId: string): Promise<{ status: 'online' | 'offline'; message?: string }> {
		return this.handleResponse<{ status: 'online' | 'offline'; message?: string }>(
			this.api.post(`/environments/${environmentId}/test`)
		);
	}
}

export const environmentManagementService = new EnvironmentManagementService();
