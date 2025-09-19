import BaseAPIService from './api-service';
import type { OidcConfig, OidcStatusInfo } from '$lib/types/settings.type';

export interface OidcUserInfo {
	sub: string;
	email: string;
	name?: string;
	displayName?: string;
	preferred_username?: string;
	given_name?: string;
	family_name?: string;
	picture?: string;
	groups?: string[];
}

export default class OidcAPIService extends BaseAPIService {
	async getAuthUrl(redirectUri: string): Promise<string> {
		const response = (await this.handleResponse(this.api.post('/oidc/url', { redirectUri }))) as {
			authUrl: string;
		};
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
		return this.handleResponse(this.api.post('/oidc/callback', { code, state }));
	}

	async getStatus(): Promise<OidcStatusInfo> {
		return this.handleResponse(this.api.get('/oidc/status'));
	}
}
