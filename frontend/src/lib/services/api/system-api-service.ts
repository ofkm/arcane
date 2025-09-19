import type { DockerInfo } from '$lib/types/docker-info.type';
import BaseAPIService from './api-service';

export default class SystemAPIService extends BaseAPIService {
	async pruneAll(options: {
		containers?: boolean;
		images?: boolean;
		volumes?: boolean;
		networks?: boolean;
		buildCache?: boolean;
		dangling?: boolean;
		until?: string;
	}) {
		return this.handleResponse(this.api.post('/system/prune', options));
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
}
