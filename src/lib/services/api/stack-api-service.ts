import BaseAPIService from './api-service';

export default class StackAPIService extends BaseAPIService {
	async start(id: string) {
		const res = await this.api.post(`/stacks/${id}/start`);
		return res.data;
	}

	async stop(id: string) {
		const res = await this.api.post(`/stacks/${id}/stop`);
		return res.data;
	}

	async restart(id: string) {
		const res = await this.api.post(`/stacks/${id}/restart`);
		return res.data;
	}

	async remove(id: string) {
		const res = await this.api.delete(`/stacks/${id}/remove`);
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

	async import(id: string, name: string) {
		const res = await this.api.post('/stacks/import', {
			stackId: id,
			stackName: name || undefined
		});
		return res.data;
	}

	async save(stackId: string, name: string, composeContent: string, autoUpdate: boolean) {
		const res = await this.api.put(`/stacks/${stackId}`, {
			name,
			composeContent,
			autoUpdate
		});
		return res.data;
	}

	async create(name: string, content: string) {
		const res = await this.api.post('/stacks/create', {
			name,
			composeContent: content
		});
		return res.data;
	}

	async list() {
		const res = await this.api.get('');
		return res.data;
	}
}
