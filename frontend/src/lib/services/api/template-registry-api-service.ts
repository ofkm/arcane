import BaseAPIService from './api-service';

export interface TemplateRegistry {
	id: string;
	name: string;
	url: string;
	enabled: boolean;
	username?: string;
	password?: string;
	token?: string;
	description?: string;
	createdAt?: string;
	updatedAt?: string;
}

export default class TemplateRegistryAPIService extends BaseAPIService {
	async list(): Promise<TemplateRegistry[]> {
		return this.handleResponse(this.api.get('/template-registries'));
	}

	async get(id: string): Promise<TemplateRegistry> {
		return this.handleResponse(this.api.get(`/template-registries/${id}`));
	}

	async create(
		registry: Omit<TemplateRegistry, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<TemplateRegistry> {
		return this.handleResponse(this.api.post('/template-registries', registry));
	}

	async update(id: string, registry: Partial<TemplateRegistry>): Promise<TemplateRegistry> {
		return this.handleResponse(this.api.put(`/template-registries/${id}`, registry));
	}

	async delete(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/template-registries/${id}`));
	}

	async enable(id: string): Promise<void> {
		return this.handleResponse(this.api.post(`/template-registries/${id}/enable`));
	}

	async disable(id: string): Promise<void> {
		return this.handleResponse(this.api.post(`/template-registries/${id}/disable`));
	}

	async sync(id: string): Promise<{ synced: number; errors: string[] }> {
		return this.handleResponse(this.api.post(`/template-registries/${id}/sync`));
	}

	async test(id: string): Promise<{ success: boolean; message: string }> {
		return this.handleResponse(this.api.post(`/template-registries/${id}/test`));
	}

	async getTemplates(id: string): Promise<any[]> {
		return this.handleResponse(this.api.get(`/template-registries/${id}/templates`));
	}

	async syncAll(): Promise<{ registries: number; templates: number; errors: string[] }> {
		return this.handleResponse(this.api.post('/template-registries/sync-all'));
	}
}
