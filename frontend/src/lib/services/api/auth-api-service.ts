import { goto } from '$app/navigation';
import { invalidateAll } from '$app/navigation';
import BaseAPIService from './api-service';
import userStore from '$lib/stores/user-store';
import type { User } from '$lib/types/user.type';

export interface LoginCredentials {
	username: string;
	password: string;
}

type LoginResponseData = {
	token: string;
	refreshToken: string;
	expiresAt: string;
	user: User;
	requirePasswordChange?: boolean;
};

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
			// Clear user from store on error
			userStore.clearUser();
			return null;
		}
	}
}

export const authService = new AuthService();
