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
		return this.handleResponse(this.api.get('/settings'));
	}

	async updateSettings(settings: Partial<Settings>): Promise<Settings> {
		return this.handleResponse(this.api.put('/settings', settings));
	}

	async resetSettings(): Promise<Settings> {
		return this.handleResponse(this.api.post('/settings/reset'));
	}

	// OIDC specific methods
	async getOidcConfig(): Promise<OidcConfig> {
		return this.handleResponse(this.api.get('/settings/oidc'));
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
		return this.handleResponse(this.api.get('/settings/oidc/status'));
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
