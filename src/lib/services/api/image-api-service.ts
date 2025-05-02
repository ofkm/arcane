import BaseAPIService from './api-service';

export default class ImageAPIService extends BaseAPIService {
	async remove(id: string) {
		const res = await this.api.delete(`/images/${id}`);
		return res.data;
	}

	async pull(id: string) {
		const res = await this.api.delete(`/images/${id}/pull`);
		return res.data;
	}

	async prune() {
		const res = await this.api.post(`/images/prune`);
		return res.data;
	}

	async list() {
		const res = await this.api.get('');
		return res.data;
	}
}
