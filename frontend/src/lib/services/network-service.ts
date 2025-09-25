import BaseAPIService from './api-service';
import { environmentStore } from '$lib/stores/environment.store';
import type { NetworkSummaryDto, NetworkUsageCounts } from '$lib/types/network.type';
import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
import type { NetworkCreateOptions } from 'dockerode';

export class NetworkService extends BaseAPIService {
	async getNetworks(options?: SearchPaginationSortRequest): Promise<Paginated<NetworkSummaryDto>> {
		const envId = await environmentStore.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/networks`, { params: options });
		return res.data;
	}

	async getNetworkUsageCounts(): Promise<NetworkUsageCounts> {
		const envId = await environmentStore.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/networks/counts`);
		return res.data.data;
	}

	async getNetwork(networkId: string): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/networks/${networkId}`));
	}

	async createNetwork(options: NetworkCreateOptions): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/networks`, options));
	}

	async deleteNetwork(networkId: string): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.delete(`/environments/${envId}/networks/${networkId}`));
	}
}

export const networkService = new NetworkService();
