import BaseAPIService from './api-service';
import type { TemplateRegistry, Template, RemoteRegistry } from '$lib/types/template.type';

export default class TemplateAPIService extends BaseAPIService {
	async loadAll(): Promise<Template[]> {
		const response = await this.api.get('/templates');
		return response.data?.data ?? [];
	}

	async getTemplateContent(id: string): Promise<{
		content: string;
		envContent: string;
		template: Template;
	}> {
		const encodedId = encodeURIComponent(id);
		const response = await this.api.get(`/templates/${encodedId}/content`);
		const data = response.data?.data ?? {};
		return {
			content: data.content,
			envContent: data.envContent,
			template: data.template
		};
	}

	async download(id: string): Promise<Template> {
		const response = await this.api.post(`/templates/${encodeURIComponent(id)}/download`);
		return response.data?.data;
	}

	async getEnvTemplate(): Promise<string> {
		const response = await this.api.get('/templates/env/default');
		return response.data?.data?.content ?? response.data?.content;
	}

	async saveEnvTemplate(content: string): Promise<void> {
		await this.api.post('/templates/env/default', { content });
	}

	async getRegistries(): Promise<TemplateRegistry[]> {
		const response = await this.api.get('/templates/registries');
		const out = response.data?.data ?? response.data?.registries ?? response.data;
		return Array.isArray(out) ? out : [];
	}

	async addRegistry(registry: { name: string; url: string; description?: string; enabled: boolean }): Promise<TemplateRegistry> {
		const response = await this.api.post('/templates/registries', registry);
		return response.data?.data ?? response.data;
	}

	async updateRegistry(
		id: string,
		registry: {
			name: string;
			url: string;
			description?: string;
			enabled: boolean;
		}
	): Promise<void> {
		await this.api.put(`/templates/registries/${id}`, registry);
	}

	async fetchRegistry(url: string): Promise<RemoteRegistry> {
		const response = await this.api.get(`/templates/fetch?url=${encodeURIComponent(url)}`);
		const manifest = response.data?.data ?? response.data;
		if (!manifest || typeof manifest !== 'object' || !manifest.name || !Array.isArray(manifest.templates)) {
			throw new Error('Invalid registry format: missing required fields (name, templates)');
		}
		return manifest;
	}

	async deleteRegistry(id: string): Promise<void> {
		await this.api.delete(`/templates/registries/${id}`);
	}
}
