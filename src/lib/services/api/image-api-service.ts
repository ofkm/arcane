import BaseAPIService from './api-service';

export default class ImageAPIService extends BaseAPIService {
	async remove(id: string) {
		const res = await this.api.delete(`/images/${id}`);
		return res.data;
	}

	async pull(imageRef: string, tag: string) {
		const encodedImageRef = encodeURIComponent(imageRef);
		const res = await this.api.post(`/images/pull/${encodedImageRef}`, { tag });
		return res.data;
	}

	async prune() {
		const res = await this.api.post(`/images/prune`);
		return res.data;
	}

	async checkMaturity(id: string) {
		// Change from POST to GET
		const res = await this.api.get(`/images/${id}/maturity`);
		return res.data;
	}

	async checkMaturityBatch(imageIds: string[]) {
		// Use the first image ID for the endpoint URL
		// This is a bit unusual, but following your requirement
		if (!imageIds || imageIds.length === 0) {
			throw new Error('No image IDs provided for batch check');
		}

		const firstId = imageIds[0];
		const res = await this.api.post(`/images/${firstId}/maturity`, { imageIds });
		return res.data;
	}

	async list() {
		const res = await this.api.get('');
		return res.data;
	}
}
