import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { invalidateAll } from '$app/navigation';
import BaseAPIService from './api-service';
import userStore from '$lib/stores/user-store';

export interface LoginCredentials {
	username: string;
	password: string;
}

export interface User {
	id: string;
	username: string;
	email?: string;
	role?: string;
}

export class AuthService extends BaseAPIService {
	async login(credentials: LoginCredentials): Promise<User> {
		try {
			const response = await this.api.post('/auth/login', credentials);
			const user = response.data.user || response.data.data;

			// Store user in the store
			if (user) {
				userStore.setUser(user);
			}

			if (browser) {
				await invalidateAll();
			}

			return user;
		} catch (error: any) {
			const errorMessage = error.response?.data?.error || 'Login failed';
			throw new Error(errorMessage);
		}
	}

	async logout(): Promise<void> {
		try {
			await this.api.post('/auth/logout');
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			// Clear user from store
			userStore.clearUser();

			if (browser) {
				await invalidateAll();
				goto('/auth/login');
			}
		}
	}

	async getCurrentUser(): Promise<User | null> {
		try {
			const response = await this.api.get('/auth/me');
			const user = response.data.data;

			// Store user in the store
			if (user) {
				userStore.setUser(user);
			}

			return user;
		} catch (error) {
			// Clear user from store on error
			userStore.clearUser();
			return null;
		}
	}

	async validateSession(): Promise<boolean> {
		try {
			const response = await this.api.get('/auth/validate');
			return response.data.valid === true;
		} catch (error) {
			userStore.clearUser();
			return false;
		}
	}

	async changePassword(oldPassword: string, newPassword: string): Promise<void> {
		const response = await this.api.post('/auth/password', {
			currentPassword: oldPassword,
			newPassword
		});
		return response.data;
	}
}

export const authService = new AuthService();
