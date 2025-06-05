import BaseAPIService from './api-service';
import type { TemplateRegistry, Template } from '$lib/types/template.type';

export default class TemplateAPIService extends BaseAPIService {
	async loadAll(): Promise<Template[]> {
		return this.handleResponse(this.api.get('/templates'));
	}

	async getById(id: string): Promise<Template> {
		return this.handleResponse(this.api.get(`/templates/${id}`));
	}

	async getByName(name: string): Promise<Template> {
		return this.handleResponse(this.api.get(`/templates/name/${encodeURIComponent(name)}`));
	}

	async search(query: string, category?: string): Promise<Template[]> {
		return this.handleResponse(
			this.api.get('/templates/search', {
				params: { query, category }
			})
		);
	}

	async getCategories(): Promise<string[]> {
		return this.handleResponse(this.api.get('/templates/categories'));
	}

	async getEnvTemplate(): Promise<string> {
		const response = await this.api.get('/templates/env-template');
		return response.data.template || '';
	}

	async create(template: Omit<Template, 'id'>): Promise<Template> {
		return this.handleResponse(this.api.post('/templates', template));
	}

	async update(id: string, template: Partial<Template>): Promise<Template> {
		return this.handleResponse(this.api.put(`/templates/${id}`, template));
	}

	async delete(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/templates/${id}`));
	}

	async refresh(): Promise<{ updated: number; added: number; removed: number }> {
		return this.handleResponse(this.api.post('/templates/refresh'));
	}

	async validateTemplate(template: Partial<Template>): Promise<{
		valid: boolean;
		errors: string[];
		warnings: string[];
	}> {
		return this.handleResponse(this.api.post('/templates/validate', template));
	}

	async getTemplateByRegistry(registryId: string): Promise<Template[]> {
		return this.handleResponse(this.api.get(`/templates/registry/${registryId}`));
	}

	async importFromUrl(url: string): Promise<Template> {
		return this.handleResponse(this.api.post('/templates/import', { url }));
	}

	async exportTemplate(id: string): Promise<Blob> {
		const response = await this.api.get(`/templates/${id}/export`, {
			responseType: 'blob'
		});
		return response.data;
	}

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
