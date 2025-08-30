import type { DockerInfo } from '$lib/types/docker-info.type';
import BaseAPIService from './api-service';

export default class SystemAPIService extends BaseAPIService {
	async pruneAll(options: {
		containers?: boolean;
		images?: boolean;
		volumes?: boolean;
		networks?: boolean;
		dangling?: boolean;
		until?: string;
	}) {
		return this.handleResponse(this.api.post('/system/prune', options));
	}

	async startAllContainers() {
		return this.handleResponse(this.api.post('/system/containers/start-all'));
	}

	async startAllStoppedContainers() {
		return this.handleResponse(this.api.post('/system/containers/start-stopped'));
	}

	async stopAllContainers() {
		return this.handleResponse(this.api.post('/system/containers/stop-all'));
	}

	async getDockerInfo(): Promise<DockerInfo> {
		return this.handleResponse(this.api.get('/system/docker/info'));
	}

	async getStats() {
		return this.handleResponse(this.api.get('/system/stats'));
	}

	async testConnection(host?: string) {
		const params = host ? { host } : {};
		return this.handleResponse(this.api.get('/system/docker/test', { params }));
	}

	async getSystemInfo(): Promise<DockerInfo> {
		return this.handleResponse(this.api.get('/system/info'));
	}
}
