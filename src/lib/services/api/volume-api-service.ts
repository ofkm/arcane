import BaseAPIService from './api-service';

export default class VolumeAPIService extends BaseAPIService {
	async remove(id: string, force?: boolean) {
		const res = await this.api.delete(`/volumes/${id}`);
		return res.data;
	}
}
