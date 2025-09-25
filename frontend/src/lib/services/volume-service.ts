import BaseAPIService from './api-service';
import { environmentStore } from '$lib/stores/environment.store';
import type { VolumeSummaryDto, VolumeDetailDto, VolumeUsageDto, VolumeUsageCounts } from '$lib/types/volume.type';
import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
import type { VolumeCreateOptions } from 'dockerode';

export class VolumeService extends BaseAPIService {
	async getVolumes(options?: SearchPaginationSortRequest): Promise<Paginated<VolumeSummaryDto>> {
		const envId = await environmentStore.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/volumes`, { params: options });
		return res.data;
	}

	async getVolume(volumeName: string): Promise<VolumeDetailDto> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/volumes/${volumeName}`)) as Promise<VolumeDetailDto>;
	}

	async getVolumeUsage(volumeName: string): Promise<VolumeUsageDto> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/volumes/${volumeName}/usage`)) as Promise<VolumeUsageDto>;
	}

	async getVolumeUsageCounts(): Promise<VolumeUsageCounts> {
		const envId = await environmentStore.getCurrentEnvironmentId();

		const res = await this.api.get(`/environments/${envId}/volumes/counts`);
		return res.data.data;
	}

	async createVolume(options: VolumeCreateOptions): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/volumes`, options));
	}

	async deleteVolume(volumeName: string): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.delete(`/environments/${envId}/volumes/${volumeName}`));
	}
}

export const volumeService = new VolumeService();
