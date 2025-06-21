import BaseAPIService from './api-service';
import type { OidcConfig } from '$lib/types/settings.type';

export interface OidcUserInfo {
	sub: string;
	email: string;
	name: string;
	preferred_username?: string;
	given_name?: string;
	family_name?: string;
	picture?: string;
	groups?: string[];
}

export default class OidcAPIService extends BaseAPIService {
	async getAuthUrl(redirectUri: string): Promise<string> {
		const response = (await this.handleResponse(this.api.post('/auth/oidc/url', { redirectUri }))) as { authUrl: string };
		return response.authUrl;
	}

	async handleCallback(
		code: string,
		state: string
	): Promise<{
		success: boolean;
		token?: string;
		user?: OidcUserInfo;
		error?: string;
	}> {
		return this.handleResponse(this.api.post('/auth/oidc/callback', { code, state }));
	}

	async getUserInfo(): Promise<OidcUserInfo> {
		return this.handleResponse(this.api.get('/auth/oidc/userinfo'));
	}

	async refreshToken(): Promise<{ token: string }> {
		return this.handleResponse(this.api.post('/auth/oidc/refresh'));
	}

	async logout(): Promise<void> {
		return this.handleResponse(this.api.post('/auth/oidc/logout'));
	}

	async getConfig(): Promise<OidcConfig> {
		return this.handleResponse(this.api.get('/auth/oidc/config'));
	}

	async updateConfig(config: Partial<OidcConfig>): Promise<OidcConfig> {
		return this.handleResponse(this.api.put('/auth/oidc/config', config));
	}

	async testConfig(): Promise<{ success: boolean; message: string }> {
		return this.handleResponse(this.api.post('/auth/oidc/test'));
	}

	async getStatus(): Promise<{
		enabled: boolean;
		configured: boolean;
		envConfigured: boolean;
		settingsConfigured: boolean;
	}> {
		return this.handleResponse(this.api.get('/auth/oidc/status'));
	}
}
