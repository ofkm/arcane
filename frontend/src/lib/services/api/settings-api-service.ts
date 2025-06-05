import BaseAPIService from './api-service';
import type { Settings } from '$lib/types/settings.type';

export default class SettingsAPIService extends BaseAPIService {
	async getSettings(): Promise<Settings> {
		return this.handleResponse(this.api.get('/settings'));
	}

	async saveSettings(settings: Settings): Promise<void> {
		return this.handleResponse(this.api.put('/settings', settings));
	}

	async getDefaultSettings(): Promise<Settings> {
		return this.handleResponse(this.api.get('/settings/defaults'));
	}

	async ensureStacksDirectory(): Promise<string> {
		return this.handleResponse(this.api.post('/settings/ensure-stacks-directory'));
	}
}
