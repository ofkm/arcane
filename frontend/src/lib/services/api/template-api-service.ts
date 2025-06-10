import BaseAPIService from './api-service';
import type { TemplateRegistry, Template } from '$lib/types/template.type';

export default class TemplateAPIService extends BaseAPIService {
	async loadAll(): Promise<Template[]> {
		const response = await this.api.get('/templates');
		return response.data.templates;
	}

	async getById(id: string): Promise<Template> {
		const response = await this.api.get(`/templates/${id}`);
		return response.data.template;
	}

	async getTemplateContent(id: string): Promise<{
		content: string;
		envContent: string;
		template: Template;
	}> {
		const response = await this.api.get(`/templates/${id}/content`);
		return {
			content: response.data.content,
			envContent: response.data.envContent,
			template: response.data.template
		};
	}

	async create(template: {
		name: string;
		description: string;
		content: string;
		envContent?: string;
	}): Promise<Template> {
		const response = await this.api.post('/templates', template);
		return response.data.template;
	}

	async update(
		id: string,
		template: {
			name: string;
			description: string;
			content: string;
			envContent?: string;
		}
	): Promise<void> {
		await this.api.put(`/templates/${id}`, template);
	}

	async delete(id: string): Promise<void> {
		await this.api.delete(`/templates/${id}`);
	}

	// Environment template operations
	async getEnvTemplate(): Promise<string> {
		const response = await this.api.get('/templates/env/default');
		return response.data.content;
	}

	async saveEnvTemplate(content: string): Promise<void> {
		await this.api.post('/templates/env/default', { content });
	}

	// Registry operations
	async getRegistries(): Promise<TemplateRegistry[]> {
		const response = await this.api.get('/templates/registries');
		return response.data.registries;
	}

	async addRegistry(registry: {
		name: string;
		url: string;
		description?: string;
		enabled: boolean;
	}): Promise<TemplateRegistry> {
		const response = await this.api.post('/templates/registries', registry);
		return response.data.registry;
	}

	async updateRegistry(
		id: number,
		registry: {
			name: string;
			url: string;
			description?: string;
			enabled: boolean;
		}
	): Promise<void> {
		await this.api.put(`/templates/registries/${id}`, registry);
	}

	async fetchRegistry(url: string): Promise<any> {
		const response = await this.api.get(`/templates/fetch?url=${encodeURIComponent(url)}`);
		return response.data;
	}

	async deleteRegistry(id: number): Promise<void> {
		await this.api.delete(`/templates/registries/${id}`);
	}

	// Legacy methods for backward compatibility (can be removed if not needed)
	async getByName(name: string): Promise<Template> {
		// This would need to be implemented on backend if needed
		// For now, get all templates and filter by name
		const templates = await this.loadAll();
		const template = templates.find((t) => t.name === name);
		if (!template) {
			throw new Error(`Template with name "${name}" not found`);
		}
		return template;
	}

	async search(query: string, category?: string): Promise<Template[]> {
		// This would need to be implemented on backend if needed
		// For now, get all templates and filter client-side
		const templates = await this.loadAll();
		return templates.filter(
			(template) =>
				template.name.toLowerCase().includes(query.toLowerCase()) ||
				template.description.toLowerCase().includes(query.toLowerCase())
		);
	}

	async getCategories(): Promise<string[]> {
		// This would need to be implemented on backend if needed
		// For now, extract categories from template metadata
		const templates = await this.loadAll();
		const categories = new Set<string>();
		templates.forEach((template) => {
			if (template.metadata?.tags) {
				const tags = Array.isArray(template.metadata.tags)
					? template.metadata.tags
					: JSON.parse(template.metadata.tags || '[]');
				tags.forEach((tag: string) => categories.add(tag));
			}
		});
		return Array.from(categories);
	}

	async refresh(): Promise<{ updated: number; added: number; removed: number }> {
		// This would need to be implemented on backend if needed
		// For now, just reload templates
		await this.loadAll();
		return { updated: 0, added: 0, removed: 0 };
	}

	async validateTemplate(template: Partial<Template>): Promise<{
		valid: boolean;
		errors: string[];
		warnings: string[];
	}> {
		// This would need to be implemented on backend if needed
		// For now, basic client-side validation
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!template.name) errors.push('Template name is required');
		if (!template.content) errors.push('Template content is required');

		return {
			valid: errors.length === 0,
			errors,
			warnings
		};
	}

	async getTemplateByRegistry(registryId: string): Promise<Template[]> {
		// This would need to be implemented on backend if needed
		// For now, get all templates and filter by registry
		const templates = await this.loadAll();
		return templates.filter((template) => template.registryId?.toString() === registryId);
	}

	async importFromUrl(url: string): Promise<Template> {
		// This would need to be implemented on backend if needed
		throw new Error('Import from URL not yet implemented');
	}

	async exportTemplate(id: string): Promise<Blob> {
		// This would need to be implemented on backend if needed
		const template = await this.getById(id);
		const content = JSON.stringify(template, null, 2);
		return new Blob([content], { type: 'application/json' });
	}

	async refreshRegistry(id: string): Promise<void> {
		// This would need to be implemented on backend if needed
		// For now, just reload templates
		await this.loadAll();
	}

	// Alias methods for backward compatibility
	async getTemplates(registryId?: string): Promise<Template[]> {
		if (registryId) {
			return this.getTemplateByRegistry(registryId);
		}
		return this.loadAll();
	}

	async getTemplate(id: string): Promise<Template> {
		return this.getById(id);
	}
}
