import BaseAPIService from './api-service';

export default class VolumeAPIService extends BaseAPIService {
	async list(filters?: Record<string, string>) {
		return this.handleResponse(this.api.get('/volumes', { params: { filters } }));
	}

	async get(name: string) {
		return this.handleResponse(this.api.get(`/volumes/${name}`));
	}

	async inspect(name: string) {
		return this.handleResponse(this.api.get(`/volumes/${name}/inspect`));
	}

	async isInUse(name: string): Promise<boolean> {
		const response = await this.api.get(`/volumes/${name}/usage`);
		return response.data.inUse;
	}

	async create(volumeConfig: { name?: string; driver?: string; driverOpts?: Record<string, string>; labels?: Record<string, string> }) {
		return this.handleResponse(this.api.post('/volumes', volumeConfig));
	}

	async remove(name: string, force: boolean = false) {
		return this.handleResponse(
			this.api.delete(`/volumes/${name}`, {
				params: { force }
			})
		);
	}

	async prune(filters?: Record<string, string>) {
		return this.handleResponse(this.api.post('/volumes/prune', { filters }));
	}

	async usage(name: string) {
		return this.handleResponse(this.api.get(`/volumes/${name}/usage`));
	}

	async backup(name: string, destination: string) {
		return this.handleResponse(
			this.api.post(`/volumes/${name}/backup`, {
				destination
			})
		);
	}

	async restore(name: string, source: string) {
		return this.handleResponse(
			this.api.post(`/volumes/${name}/restore`, {
				source
			})
		);
	}

	async getContainers(name: string) {
		return this.handleResponse(this.api.get(`/volumes/${name}/containers`));
	}
}
