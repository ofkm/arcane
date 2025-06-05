import { goto } from '$app/navigation';
import { browser } from '$app/environment';

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

export class AuthService {
	private baseUrl = '/api/auth';

	async login(credentials: LoginCredentials): Promise<User> {
		const response = await fetch(`${this.baseUrl}/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify(credentials)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.error || 'Login failed');
		}

		const data = await response.json();
		return data.data;
	}

	async logout(): Promise<void> {
		try {
			await fetch(`${this.baseUrl}/logout`, {
				method: 'POST',
				credentials: 'include'
			});
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			// Always redirect to login even if logout request fails
			if (browser) {
				goto('/login');
			}
		}
	}

	async getCurrentUser(): Promise<User | null> {
		try {
			const response = await fetch(`${this.baseUrl}/me`, {
				credentials: 'include'
			});

			if (!response.ok) {
				if (response.status === 401) {
					return null; // Not authenticated
				}
				throw new Error('Failed to fetch user');
			}

			const data = await response.json();
			return data.data;
		} catch (error) {
			console.error('Get current user error:', error);
			return null;
		}
	}

	async register(userData: LoginCredentials & { email?: string }): Promise<User> {
		const response = await fetch(`${this.baseUrl}/register`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify(userData)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.error || 'Registration failed');
		}

		const data = await response.json();
		return data.data;
	}

	async changePassword(oldPassword: string, newPassword: string): Promise<void> {
		const response = await fetch(`${this.baseUrl}/change-password`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({
				oldPassword,
				newPassword
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.error || 'Password change failed');
		}
	}
}

export const authService = new AuthService();
