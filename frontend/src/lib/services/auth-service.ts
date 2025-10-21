import { goto, invalidateAll } from '$app/navigation';
import BaseAPIService from './api-service';
import userStore from '$lib/stores/user-store';
import type { User } from '$lib/types/user.type';
import type { OidcStatusInfo } from '$lib/types/settings.type';
import type { OidcUserInfo, LoginCredentials, LoginResponseData } from '$lib/types/auth.type';

export class AuthService extends BaseAPIService {
	async login(credentials: LoginCredentials): Promise<User> {
		const data = await this.handleResponse<LoginResponseData>(this.api.post('/auth/login', credentials));
		const user = data.user as User;

		userStore.setUser(user);
		await invalidateAll();
		goto('/auth/login');

		return user;
	}

	async getCurrentUser(): Promise<User | null> {
		try {
			const response = await this.api.get('/auth/me');
			const user = (response.data.user as User) || (response.data.data as User);

			userStore.setUser(user);

			return user;
		} catch {
			userStore.clearUser();
			return null;
		}
	}

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

	async changePassword(currentPassword: string, newPassword: string): Promise<void> {
		await this.handleResponse(
			this.api.post('/auth/password', {
				currentPassword,
				newPassword
			})
		);
	}
}

export const authService = new AuthService();
