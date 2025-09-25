import type { DockerInfo } from '$lib/types/docker-info.type';
import BaseAPIService from './api-service';
import { environmentStore } from '$lib/stores/environment.store';

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
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/system/containers/start-stopped`));
	}

	async stopAllContainers() {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/system/containers/stop-all`));
	}

	async getDockerInfo(): Promise<DockerInfo> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/system/docker/info`));
	}
}
