import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { invalidateAll } from '$app/navigation';
import BaseAPIService from './api-service';

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

			// Invalidate all data to trigger refetch of layout data
			if (browser) {
				await invalidateAll();
			}

			return response.data.data;
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
			// Invalidate all data and redirect to login
			if (browser) {
				await invalidateAll();
				goto('/auth/login');
			}
		}
	}

	async getCurrentUser(): Promise<User | null> {
		try {
			const response = await this.api.get('/auth/me');
			return response.data.data;
		} catch (error: any) {
			if (error.response?.status === 401) {
				return null; // Not authenticated
			}
			console.error('Get current user error:', error);
			return null;
		}
	}

	async validateSession(): Promise<boolean> {
		try {
			const response = await this.api.get('/auth/validate');
			return response.status === 200;
		} catch (error) {
			console.error('Session validation error:', error);
			return false;
		}
	}

	async changePassword(oldPassword: string, newPassword: string): Promise<void> {
		try {
			await this.api.post('/auth/change-password', {
				oldPassword,
				newPassword
			});
		} catch (error: any) {
			const errorMessage = error.response?.data?.error || 'Password change failed';
			throw new Error(errorMessage);
		}
	}
}

export const authService = new AuthService();
