import BaseAPIService from './api-service';

export default class TemplateAPIService extends BaseAPIService {
	/**
	 * Get all templates (local and remote)
	 */
	async getAll() {
		const res = await this.api.get('/templates');
		return res.data;
	}

	/**
	 * Get only local templates
	 */
	async getLocal() {
		const res = await this.api.get('/templates?type=local');
		return res.data;
	}

	/**
	 * Get only remote templates
	 */
	async getRemote() {
		const res = await this.api.get('/templates?type=remote');
		return res.data;
	}

	/**
	 * Get template content by ID
	 */
	async getContent(id: string) {
		const res = await this.api.get(`/templates/${encodeURIComponent(id)}/content`);
		return res.data;
	}

	/**
	 * Download and save a remote template locally
	 */
	async download(id: string, localName?: string) {
		const res = await this.api.post(`/templates/${encodeURIComponent(id)}/download`, {
			localName
		});
		return res.data;
	}

	/**
	 * Create a new local template
	 */
	async create(name: string, content: string, description?: string, envContent?: string) {
		const res = await this.api.post('/templates', {
			name,
			content,
			description,
			envContent
		});
		return res.data;
	}

	/**
	 * Update an existing local template
	 */
	async update(id: string, name: string, content: string, description?: string, envContent?: string) {
		const res = await this.api.put(`/templates/${encodeURIComponent(id)}`, {
			name,
			content,
			description,
			envContent
		});
		return res.data;
	}

	/**
	 * Delete a local template
	 */
	async delete(id: string) {
		const res = await this.api.delete(`/templates/${encodeURIComponent(id)}`);
		return res.data;
	}

	/**
	 * Get template statistics
	 */
	async getStats() {
		const res = await this.api.get('/templates/stats');
		return res.data;
	}
}
