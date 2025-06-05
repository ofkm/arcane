import type { PruneType } from '$lib/types/actions.type';
import BaseAPIService from './api-service';

export default class SystemAPIService extends BaseAPIService {
	async prune(types: PruneType[]) {
		if (!types || types.length === 0) {
			throw new Error('No prune types specified');
		}

		const typesParam = types.join(',');
		const res = await this.api.post(`/system/prune?types=${typesParam}`);
		return res.data;
	}
}
