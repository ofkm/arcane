import BaseAPIService from './api-service';
import type Docker from 'dockerode';

export default class ContainerAPIService extends BaseAPIService {
	async start(id: string) {
		const res = await this.api.post(`/containers/${id}/start`);
		return res.data;
	}

	async stop(id: string) {
		const res = await this.api.post(`/containers/${id}/stop`);
		return res.data;
	}

	async restart(id: string) {
		const res = await this.api.post(`/containers/${id}/restart`);
		return res.data;
	}

	async remove(id: string) {
		const res = await this.api.delete(`/containers/${id}/remove`);
		return res.data;
	}

	async pull(id: string) {
		const res = await this.api.post(`/containers/${id}/pull`);
		return res.data;
	}

	async startAll() {
		const res = await this.api.post(`/containers/start-all`);
		return res.data;
	}

	async stopAll() {
		const res = await this.api.post(`/containers/stop-all`);
		return res.data;
	}

	async create(config: Docker.ContainerCreateOptions) {
		const res = await this.api.post('/containers', config);
		return res.data;
	}

	async list() {
		const res = await this.api.get('');
		return res.data;
	}

	async get(id: string) {
		const res = await this.api.get(`/containers/${id}`);
		return res.data;
	}
}
