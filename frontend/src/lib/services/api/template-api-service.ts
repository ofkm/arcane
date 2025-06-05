import BaseAPIService from './api-service';
import type { TemplateRegistry, Template } from '$lib/types/template.type';

export default class TemplateRegistryAPIService extends BaseAPIService {
	async getRegistries(): Promise<TemplateRegistry[]> {
		return this.handleResponse(this.api.get('/template-registries'));
	}

	async addRegistry(registry: Omit<TemplateRegistry, 'id'>): Promise<TemplateRegistry> {
		return this.handleResponse(this.api.post('/template-registries', registry));
	}

	async updateRegistry(id: string, registry: Partial<TemplateRegistry>): Promise<TemplateRegistry> {
		return this.handleResponse(this.api.put(`/template-registries/${id}`, registry));
	}

	async deleteRegistry(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/template-registries/${id}`));
	}

	async getTemplates(registryId?: string): Promise<Template[]> {
		const url = registryId ? `/templates?registry=${registryId}` : '/templates';
		return this.handleResponse(this.api.get(url));
	}

	async getTemplate(id: string): Promise<Template> {
		return this.handleResponse(this.api.get(`/templates/${id}`));
	}

	async refreshRegistry(id: string): Promise<void> {
		return this.handleResponse(this.api.post(`/template-registries/${id}/refresh`));
	}
}
