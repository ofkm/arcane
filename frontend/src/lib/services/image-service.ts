import BaseAPIService from './api-service';
import { environmentStore } from '$lib/stores/environment.store.svelte';
import type { ImageSummaryDto, ImageUsageCounts, ImageUpdateInfoDto } from '$lib/types/image.type';
import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
import type { AutoUpdateCheck, AutoUpdateResult } from '$lib/types/auto-update.type';
import { transformPaginationParams } from '$lib/utils/params.util';

export class ImageService extends BaseAPIService {
	async getImages(options?: SearchPaginationSortRequest): Promise<Paginated<ImageSummaryDto>> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		const params = transformPaginationParams(options);
		const res = await this.api.get(`/environments/${envId}/images`, { params });
		return res.data;
	}

	async getImageUsageCounts(): Promise<ImageUsageCounts> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		const res = await this.api.get(`/environments/${envId}/images/counts`);
		return res.data.data;
	}

	async getImage(imageId: string): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/images/${imageId}`));
	}

	async pullImage(imageName: string, tag: string = 'latest', auth?: any): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/images/pull`, { imageName, tag, auth }));
	}

	async deleteImage(imageId: string, options?: { force?: boolean; noprune?: boolean }): Promise<void> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		await this.handleResponse(this.api.delete(`/environments/${envId}/images/${imageId}`, { params: options }));
	}

	async pruneImages(dangling?: boolean): Promise<any> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		const body = dangling !== undefined ? { dangling: !!dangling } : {};
		return this.handleResponse(this.api.post(`/environments/${envId}/images/prune`, body));
	}

	async checkImageUpdateByID(imageId: string): Promise<ImageUpdateInfoDto> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.get(`/environments/${envId}/image-updates/check/${imageId}`));
	}

	async checkAllImages(): Promise<Record<string, ImageUpdateInfoDto>> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/image-updates/check-all`, {}));
	}

	async runAutoUpdate(options?: AutoUpdateCheck): Promise<AutoUpdateResult> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		return this.handleResponse(this.api.post(`/environments/${envId}/updater/run`, options));
	}
}

export const imageService = new ImageService();
