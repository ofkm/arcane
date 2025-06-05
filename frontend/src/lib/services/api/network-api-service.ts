import BaseAPIService from './api-service';

export default class NetworkAPIService extends BaseAPIService {
	async list(filters?: Record<string, string>) {
		return this.handleResponse(this.api.get('/networks', { params: { filters } }));
	}

	async get(id: string) {
		return this.handleResponse(this.api.get(`/networks/${id}`));
	}

	async inspect(id: string) {
		return this.handleResponse(this.api.get(`/networks/${id}/inspect`));
	}

	async create(networkConfig: {
		name: string;
		driver?: string;
		options?: Record<string, string>;
		ipam?: {
			driver?: string;
			config?: Array<{
				subnet?: string;
				gateway?: string;
				ipRange?: string;
			}>;
		};
		labels?: Record<string, string>;
		enableIPv6?: boolean;
		internal?: boolean;
		attachable?: boolean;
		ingress?: boolean;
	}) {
		return this.handleResponse(this.api.post('/networks', networkConfig));
	}

	async remove(id: string, force: boolean = false) {
		return this.handleResponse(
			this.api.delete(`/networks/${id}`, {
				params: { force }
			})
		);
	}

	async connect(
		networkId: string,
		containerId: string,
		config?: {
			aliases?: string[];
			ipv4Address?: string;
			ipv6Address?: string;
		}
	) {
		return this.handleResponse(
			this.api.post(`/networks/${networkId}/connect`, {
				container: containerId,
				endpointConfig: config
			})
		);
	}

	async disconnect(networkId: string, containerId: string, force: boolean = false) {
		return this.handleResponse(
			this.api.post(`/networks/${networkId}/disconnect`, {
				container: containerId,
				force
			})
		);
	}

	async prune(filters?: Record<string, string>) {
		return this.handleResponse(this.api.post('/networks/prune', { filters }));
	}
}
