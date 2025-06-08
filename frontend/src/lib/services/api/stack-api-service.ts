import BaseAPIService from './api-service';

export default class StackAPIService extends BaseAPIService {
	async list() {
		const res = await this.api.get('/stacks');
		return res.data;
	}

	async get(id: string) {
		const res = await this.api.get(`/stacks/${id}`);
		return res.data;
	}

	async discoverExternal() {
		const res = await this.api.get('/stacks/discover-external');
		return res.data;
	}

	async create(data: { name: string; composeContent: string; envContent?: string; agentId?: string }) {
		const response = await this.api.post('/stacks', {
			name: data.name,
			composeContent: data.composeContent,
			envContent: data.envContent || '',
			agentId: data.agentId
		});
		return response.data;
	}

	async save(id: string, name: string, content: string, envContent?: string) {
		const res = await this.api.put(`/stacks/${id}`, {
			name,
			composeContent: content,
			envContent
		});
		return res.data;
	}

	async deploy(id: string, options?: { profiles?: string[]; envOverrides?: Record<string, string> }) {
		const res = await this.api.post(`/stacks/${id}/deploy`, options || {});
		return res.data;
	}

	async down(id: string) {
		const res = await this.api.post(`/stacks/${id}/down`);
		return res.data;
	}

	async restart(id: string) {
		const res = await this.api.post(`/stacks/${id}/restart`);
		return res.data;
	}

	async redeploy(id: string) {
		const res = await this.api.post(`/stacks/${id}/redeploy`);
		return res.data;
	}

	async pull(id: string) {
		const res = await this.api.post(`/stacks/${id}/pull`);
		return res.data;
	}

	async destroy(id: string, removeVolumes = false, removeFiles = false) {
		const res = await this.api.delete(`/stacks/${id}/destroy`, {
			data: {
				removeVolumes,
				removeFiles
			}
		});
		return res.data;
	}

	async import(id: string, name: string) {
		const res = await this.api.post('/stacks/import', {
			stackId: id,
			stackName: name || undefined
		});
		return res.data;
	}

	async migrate(id: string) {
		const res = await this.api.post(`/stacks/${id}/migrate`);
		return res.data;
	}

	async validate(id: string) {
		const res = await this.api.get(`/stacks/${id}/validate`);
		return res.data;
	}

	async getLogs(id: string, options?: { tail?: number; timestamps?: boolean; follow?: boolean }) {
		const params = new URLSearchParams();
		if (options?.tail) params.append('tail', options.tail.toString());
		if (options?.timestamps !== undefined) params.append('timestamps', options.timestamps.toString());
		if (options?.follow !== undefined) params.append('follow', options.follow.toString());

		const url = `/stacks/${id}/logs${params.toString() ? '?' + params.toString() : ''}`;
		const res = await this.api.get(url);
		return res.data;
	}

	async getProfiles(id: string) {
		const res = await this.api.get(`/stacks/${id}/profiles`);
		return res.data;
	}

	async getChanges(id: string) {
		const res = await this.api.get(`/stacks/${id}/changes`);
		return res.data;
	}

	async getStats(id: string) {
		const res = await this.api.get(`/stacks/${id}/stats`);
		return res.data;
	}
}
