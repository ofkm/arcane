import type { NetworkCreateOptions } from 'dockerode';
import BaseAPIService from './api-service';

export default class NetworkAPIService extends BaseAPIService {
	async remove(id: string) {
		const res = await this.api.delete(`/networks/${id}`);
		return res.data;
	}

	async create(options: NetworkCreateOptions) {
		const res = await this.api.post(`/networks/create`, options);
		return res.data;
	}
}
