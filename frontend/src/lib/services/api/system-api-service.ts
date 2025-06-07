import type { PruneType } from '$lib/types/actions.type';
import BaseAPIService from './api-service';

export default class SystemAPIService extends BaseAPIService {
	async prune(types: PruneType[]) {
		if (!types || types.length === 0) {
			throw new Error('No prune types specified');
		}

		const typesParam = types.join(',');
		const res = await this.api.post(`/system/prune?types=${typesParam}`);
		return res.data;
	}

	async getDockerInfo() {
		return this.handleResponse(this.api.get('/system/docker/info'));
	}

	async getStats() {
		return this.handleResponse(this.api.get('/system/stats'));
	}

	async testConnection(host?: string) {
		const params = host ? { host } : {};
		return this.handleResponse(this.api.get('/system/docker/test', { params }));
	}

	async getSystemInfo() {
		return this.handleResponse(this.api.get('/system/info'));
	}

	async ping() {
		return this.handleResponse(this.api.get('/system/ping'));
	}
}
