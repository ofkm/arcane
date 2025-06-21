import BaseAPIService from './api-service';
import type { Environment } from '$lib/stores/environment.store';
import type { CreateEnvironmentDTO, UpdateEnvironmentDTO, EnvironmentResponse, EnvironmentsListResponse } from '$lib/dto/environment-dto';

export default class EnvironmentManagementAPIService extends BaseAPIService {
	async create(dto: CreateEnvironmentDTO): Promise<Environment> {
		const response = await this.handleResponse<EnvironmentResponse>(this.api.post('/environments', dto));
		return response.environment;
	}

	async list(): Promise<Environment[]> {
		const response = await this.handleResponse<EnvironmentsListResponse>(this.api.get('/environments'));
		return response.environments;
	}

	async get(environmentId: string): Promise<Environment> {
		const response = await this.handleResponse<EnvironmentResponse>(this.api.get(`/environments/${environmentId}`));
		return response.environment;
	}

	async update(environmentId: string, dto: UpdateEnvironmentDTO): Promise<Environment> {
		const response = await this.handleResponse<EnvironmentResponse>(this.api.put(`/environments/${environmentId}`, dto));
		return response.environment;
	}

	async delete(environmentId: string): Promise<void> {
		await this.handleResponse(this.api.delete(`/environments/${environmentId}`));
	}

	async testConnection(environmentId: string): Promise<{ status: 'online' | 'offline'; message?: string }> {
		const response = await this.handleResponse<{ status: 'online' | 'offline'; message?: string }>(this.api.post(`/environments/${environmentId}/test`));
		return response;
	}
}
