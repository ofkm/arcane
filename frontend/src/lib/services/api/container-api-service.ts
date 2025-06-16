import BaseAPIService from './api-service';
import { getApiPath } from './api-helpers';
import { get } from 'svelte/store';
import { environmentStore, LOCAL_DOCKER_ENVIRONMENT_ID } from '$lib/stores/environment.store';
import { environmentAPI } from './index';

export interface CreateContainerRequest {
	name: string;
	image: string;
	command?: string[];
	entrypoint?: string[];
	workingDir?: string;
	user?: string;
	environment?: string[];
	ports?: Record<string, string>;
	volumes?: string[];
	networks?: string[];
	restartPolicy?: 'no' | 'always' | 'unless-stopped' | 'on-failure';
	privileged?: boolean;
	autoRemove?: boolean;
	memory?: number;
	cpus?: number;
}

export default class ContainerAPIService extends BaseAPIService {
	private getCurrentEnvironmentId(): string {
		const env = get(environmentStore.selected);
		return env?.id || LOCAL_DOCKER_ENVIRONMENT_ID;
	}

	async list(all: boolean = false) {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/containers`, { params: { all } }));
	}

	async get(id: string) {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/containers/${id}`));
	}

	async create(options: CreateContainerRequest) {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers`, options));
	}

	async inspect(id: string) {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/containers/${id}`));
	}

	async start(id: string) {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers/${id}/start`));
	}

	async stop(id: string) {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers/${id}/stop`));
	}

	async restart(id: string) {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers/${id}/restart`));
	}

	async remove(id: string, options?: { force?: boolean; volumes?: boolean }) {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(
			this.api.delete(`/environments/${envId}/containers/${id}`, {
				params: options
			})
		);
	}

	async logs(
		id: string,
		options?: {
			tail?: number;
			timestamps?: boolean;
			follow?: boolean;
			since?: string;
			until?: string;
		}
	) {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(
			this.api.get(`/environments/${envId}/containers/${id}/logs`, {
				params: options
			})
		);
	}

	async stats(id: string, stream: boolean = false) {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(
			this.api.get(`/environments/${envId}/containers/${id}/stats`, {
				params: { stream }
			})
		);
	}

	async isImageInUse(imageId: string): Promise<boolean> {
		const envId = this.getCurrentEnvironmentId();
		const response = await this.api.get(`/environments/${envId}/containers/image-usage/${imageId}`);
		return response.data.inUse;
	}

	async prune(filters?: Record<string, string>) {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/containers/prune`, { filters }));
	}

	async exec(id: string, command: string[]) {
		const envId = this.getCurrentEnvironmentId();
		return this.handleResponse(
			this.api.post(`/environments/${envId}/containers/${id}/exec`, {
				command
			})
		);
	}
}
