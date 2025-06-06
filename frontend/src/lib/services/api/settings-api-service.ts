import BaseAPIService from './api-service';
import type { Settings } from '$lib/types/settings.type';

export interface OidcConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	authorizationEndpoint: string;
	tokenEndpoint: string;
	userinfoEndpoint: string;
	scopes: string[];
}

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

	// OIDC specific methods
	async getOidcConfig(): Promise<OidcConfig> {
		return this.handleResponse(this.api.get('/auth/oidc/config'));
	}

	async updateOidcConfig(config: Partial<OidcConfig>): Promise<OidcConfig> {
		return this.handleResponse(this.api.put('/settings/oidc', config));
	}

	async testOidcConfig(): Promise<{ success: boolean; message: string }> {
		return this.handleResponse(this.api.post('/settings/oidc/test'));
	}

	async getOidcStatus(): Promise<{
		enabled: boolean;
		configured: boolean;
		envConfigured: boolean;
		settingsConfigured: boolean;
	}> {
		return this.handleResponse(this.api.get('/auth/oidc/status'));
	}

	async getOidcAuthUrl(redirectUri: string): Promise<{ authUrl: string; state: string }> {
		return this.handleResponse(this.api.post('/auth/oidc/url', { redirectUri }));
	}

	async handleOidcCallback(
		code: string,
		state: string
	): Promise<{
		success: boolean;
		user?: any;
		token?: string;
		refreshToken?: string;
		expiresAt?: string;
		error?: string;
	}> {
		return this.handleResponse(this.api.post('/auth/oidc/callback', { code, state }));
	}

	async getOidcUserInfo(): Promise<any> {
		return this.handleResponse(this.api.get('/auth/oidc/userinfo'));
	}

	async logoutOidc(): Promise<void> {
		return this.handleResponse(this.api.post('/auth/oidc/logout'));
	}
}
