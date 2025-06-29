import BaseAPIService from './api-service';
import type { Settings, OidcStatusInfo } from '$lib/types/settings.type';

export default class SettingsAPIService extends BaseAPIService {
	async getSettings(): Promise<Settings> {
		try {
			const response = await this.api.get('/settings');
			const data = response.data?.settings || response.data?.data || response.data;
			return data;
		} catch (error) {
			console.error('Error fetching settings:', error);
			throw error;
		}
	}

	async getPublicSettings(): Promise<Settings> {
		try {
			const response = await this.api.get('/settings/public');
			const data = response.data?.settings || response.data?.data || response.data;
			return data;
		} catch (error) {
			console.error('Error fetching settings:', error);
			throw error;
		}
	}

	async updateSettings(settings: Partial<Settings>): Promise<Settings> {
		try {
			const response = await this.api.put('/settings', settings);
			const data = response.data?.settings || response.data?.data || response.data;
			return data;
		} catch (error) {
			console.error('Error updating settings:', error);
			throw error;
		}
	}

	async resetSettings(): Promise<Settings> {
		try {
			const response = await this.api.post('/settings/reset');
			const data = response.data?.settings || response.data?.data || response.data;
			return data;
		} catch (error) {
			console.error('Error resetting settings:', error);
			throw error;
		}
	}

	async getOidcStatus(): Promise<OidcStatusInfo> {
		return this.handleResponse(this.api.get('/auth/oidc/status'));
	}
}
