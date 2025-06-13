import BaseAPIService from './api-service';

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
	async list(all: boolean = false) {
		return this.handleResponse(this.api.get('/containers', { params: { all } }));
	}

	async get(id: string) {
		return this.handleResponse(this.api.get(`/containers/${id}`));
	}

	async create(options: CreateContainerRequest) {
		return this.handleResponse(this.api.post('/containers', options));
	}

	async inspect(id: string) {
		return this.handleResponse(this.api.get(`/containers/${id}`));
	}

	async start(id: string) {
		return this.handleResponse(this.api.post(`/containers/${id}/start`));
	}

	async stop(id: string) {
		return this.handleResponse(this.api.post(`/containers/${id}/stop`));
	}

	async restart(id: string) {
		return this.handleResponse(this.api.post(`/containers/${id}/restart`));
	}

	async remove(id: string, options?: { force?: boolean; volumes?: boolean }) {
		return this.handleResponse(
			this.api.delete(`/containers/${id}`, {
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
		return this.handleResponse(
			this.api.get(`/containers/${id}/logs`, {
				params: options
			})
		);
	}

	async stats(id: string, stream: boolean = false) {
		return this.handleResponse(
			this.api.get(`/containers/${id}/stats`, {
				params: { stream }
			})
		);
	}

	async isImageInUse(imageId: string): Promise<boolean> {
		const response = await this.api.get(`/containers/image-usage/${imageId}`);
		return response.data.inUse;
	}

	async prune(filters?: Record<string, string>) {
		return this.handleResponse(this.api.post('/containers/prune', { filters }));
	}

	async exec(id: string, command: string[]) {
		return this.handleResponse(
			this.api.post(`/containers/${id}/exec`, {
				command
			})
		);
	}
}
