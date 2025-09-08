import BaseAPIService from './api-service';
import type { PaginationRequest, SortRequest, PaginatedApiResponse } from '$lib/types/pagination.type';

export default class ImageAPIService extends BaseAPIService {
	async list(filters?: Record<string, string>) {
		return this.handleResponse(this.api.get('/images', { params: { filters } }));
	}

	async getTotalSize() {
		return this.handleResponse(this.api.get(`/images/total-size`));
	}

	async inspect(id: string) {
		return this.handleResponse(this.api.get(`/images/${id}/inspect`));
	}

	async search(term: string, limit?: number) {
		return this.handleResponse(
			this.api.get('/images/search', {
				params: { term, limit }
			})
		);
	}

	async pull(imageName: string, tag: string = 'latest', auth?: any) {
		return this.handleResponse(
			this.api.post('/images/pull', {
				imageName,
				tag,
				auth
			})
		);
	}

	async push(imageName: string, tag: string = 'latest', auth?: any) {
		return this.handleResponse(
			this.api.post('/images/push', {
				imageName,
				tag,
				auth
			})
		);
	}

	async remove(id: string, options?: { force?: boolean; noprune?: boolean }) {
		return this.handleResponse(
			this.api.delete(`/images/${id}`, {
				params: options
			})
		);
	}

	async tag(id: string, repo: string, tag: string) {
		return this.handleResponse(
			this.api.post(`/images/${id}/tag`, {
				repo,
				tag
			})
		);
	}

	async history(id: string) {
		return this.handleResponse(this.api.get(`/images/${id}/history`));
	}

	async prune(filters?: Record<string, string>) {
		return this.handleResponse(this.api.post('/images/prune', { filters }));
	}

	async build(
		context: FormData,
		options?: {
			dockerfile?: string;
			tags?: string[];
			buildArgs?: Record<string, string>;
			target?: string;
			networkMode?: string;
			platform?: string;
		}
	) {
		return this.handleResponse(
			this.api.post('/images/build', context, {
				headers: {
					'Content-Type': 'multipart/form-data'
				},
				params: options
			})
		);
	}

	async export(ids: string[]) {
		const response = await this.api.post(
			'/images/export',
			{ ids },
			{
				responseType: 'blob'
			}
		);
		return response.data;
	}

	async import(source: File | string, repo?: string, tag?: string) {
		const formData = new FormData();
		if (source instanceof File) {
			formData.append('file', source);
		} else {
			formData.append('url', source);
		}
		if (repo) formData.append('repo', repo);
		if (tag) formData.append('tag', tag);

		return this.handleResponse(
			this.api.post('/images/import', formData, {
				headers: {
					'Content-Type': 'multipart/form-data'
				}
			})
		);
	}

	async commit(
		containerId: string,
		options?: {
			repo?: string;
			tag?: string;
			comment?: string;
			author?: string;
			pause?: boolean;
			changes?: string[];
		}
	) {
		return this.handleResponse(
			this.api.post('/images/commit', {
				containerId,
				...options
			})
		);
	}

	async checkMaturity(imageId: string) {
		return this.handleResponse(this.api.get(`/images/maturity/${imageId}`));
	}

	async checkMaturityBatch(imageIds: string[]) {
		if (!imageIds || imageIds.length === 0) {
			throw new Error('No image IDs provided for batch check');
		}

		const firstId = imageIds[0];
		return this.handleResponse(this.api.post(`/images/${firstId}/maturity`, { imageIds }));
	}

	async updateMaturity(imageId: string, maturityData: any) {
		return this.handleResponse(this.api.put(`/images/maturity/${imageId}`, maturityData));
	}

	async getVulnerabilities(imageId: string) {
		return this.handleResponse(this.api.get(`/images/${imageId}/vulnerabilities`));
	}

	async scanImage(imageId: string) {
		return this.handleResponse(this.api.post(`/images/${imageId}/scan`));
	}
}
