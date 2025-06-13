import BaseAPIService from './api-service';
import type { AppConfig } from '$lib/types/application-configuration';

export default class AppConfigAPIService extends BaseAPIService {
	async getConfig(): Promise<AppConfig> {
		return this.handleResponse(this.api.get('/config'));
	}

	async updateConfig(config: Partial<AppConfig>): Promise<AppConfig> {
		return this.handleResponse(this.api.put('/config', config));
	}

	async resetConfig(): Promise<AppConfig> {
		return this.handleResponse(this.api.post('/config/reset'));
	}

	async getVersion(): Promise<string> {
		const response = await this.api.get('/config/version');
		return response.data.version;
	}
}
