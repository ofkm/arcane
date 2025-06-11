import BaseAPIService from './api-service';

export default class AutoUpdateAPIService extends BaseAPIService {
	async checkContainers(): Promise<boolean> {
		const response = await this.api.post('/updates/check/containers');
		return response.data;
	}

	async checkStack(): Promise<boolean> {
		const response = await this.api.post('/updates/check/compose');
		return response.data;
	}

	async getStatus(): Promise<void> {
		await this.api.get('/updates/status');
	}
}
