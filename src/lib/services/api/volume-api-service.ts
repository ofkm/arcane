import type { VolumeCreateOptions } from 'dockerode';
import BaseAPIService from './api-service';

export default class VolumeAPIService extends BaseAPIService {
	async remove(id: string) {
		const res = await this.api.delete(`/volumes/${id}`);
		return res.data;
	}

	async create(volume: VolumeCreateOptions) {
		const res = await this.api.post('/volumes', volume);
		return res.data;
	}
}
