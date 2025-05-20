import BaseAPIService from './api-service';

export default class StackAPIService extends BaseAPIService {
	async deploy(id: string) {
		const res = await this.api.post(`/stacks/${id}/deploy`);
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

	async destroy(id: string, removeVolumes = false, removeFiles = false) {
		console.log('API service - removeVolumes:', removeVolumes, 'removeFiles:', removeFiles);

		const queryParams = {
			removeVolumes: removeVolumes ? 'true' : 'false',
			removeFiles: removeFiles ? 'true' : 'false'
		};

		console.log('Query params:', queryParams);

		const res = await this.api.delete(`/stacks/${id}/destroy`, {
			params: queryParams
		});
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

	async save(id: string, name: string, content: string, envContent?: string) {
		const res = await this.api.put(`/stacks/${id}`, {
			name,
			composeContent: content,
			envContent
		});
		return res.data;
	}

	async create(name: string, content: string, envContent?: string) {
		const res = await this.api.post('/stacks/create', {
			name,
			composeContent: content,
			envContent: envContent || ''
		});
		return res.data;
	}

	async migrate(id: string) {
		const res = await this.api.post(`/stacks/${id}/migrate`);
		return res.data;
	}

	async list() {
		const res = await this.api.get('');
		return res.data;
	}
}
