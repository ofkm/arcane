import BaseAPIService from './api-service';

export default class AgentAPIService extends BaseAPIService {
	async get() {
		const res = await this.api.get('/agents');
		return res.data;
	}
}
