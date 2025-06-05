import BaseAPIService from './api-service';
import type { OidcConfig, OidcUserInfo } from '$lib/types/settings.type';

export default class OidcAPIService extends BaseAPIService {
	async getAuthUrl(redirectUri: string): Promise<string> {
		const response = await this.api.get('/auth/oidc/url', {
			params: { redirect_uri: redirectUri }
		});
		return response.data.url;
	}

	async handleCallback(code: string, state: string): Promise<{ token: string; user: OidcUserInfo }> {
		return this.handleResponse(this.api.post('/auth/oidc/callback', { code, state }));
	}

	async getUserInfo(): Promise<OidcUserInfo> {
		return this.handleResponse(this.api.get('/auth/oidc/userinfo'));
	}

	async refreshToken(): Promise<string> {
		return this.handleResponse(this.api.post('/auth/oidc/refresh'));
	}

	async logout(): Promise<void> {
		return this.handleResponse(this.api.post('/auth/oidc/logout'));
	}
}
