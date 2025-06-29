import BaseAPIService from './api-service';
import type { User } from '$lib/types/user.type';

export interface Role {
	id: string;
	name: string;
	permissions: string[];
	description?: string;
}

interface UsersResponse {
	users: User[];
}

export default class UserAPIService extends BaseAPIService {
	async list(): Promise<User[]> {
		const response = (await this.handleResponse(this.api.get('/users'))) as UsersResponse;
		return response.users;
	}

	async get(id: string): Promise<User> {
		return this.handleResponse(this.api.get(`/users/${id}`)) as Promise<User>;
	}

	async getCurrentUser(): Promise<User> {
		return this.handleResponse(this.api.get(`/auth/me`)) as Promise<User>;
	}

	async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
		return this.handleResponse(this.api.post('/users', user)) as Promise<User>;
	}

	async update(id: string, user: Partial<User>): Promise<User> {
		return this.handleResponse(this.api.put(`/users/${id}`, user)) as Promise<User>;
	}

	async delete(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/users/${id}`)) as Promise<void>;
	}

	async login(credentials: { username: string; password: string; rememberMe?: boolean }) {
		return this.handleResponse(this.api.post('/auth/login', credentials));
	}

	async logout(): Promise<void> {
		return this.handleResponse(this.api.post('/auth/logout')) as Promise<void>;
	}

	async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
		return this.handleResponse(this.api.post('/auth/password', data)) as Promise<void>;
	}

	async resetPassword(userId: string, newPassword: string): Promise<void> {
		return this.handleResponse(
			this.api.post(`/users/${userId}/reset-password`, {
				newPassword
			})
		) as Promise<void>;
	}

	async getByUsername(username: string): Promise<User> {
		return this.handleResponse(this.api.get(`/users/by-username/${encodeURIComponent(username)}`)) as Promise<User>;
	}

	async getByOidcSubjectId(oidcSubjectId: string): Promise<User> {
		return this.handleResponse(this.api.get(`/users/by-oidc-subject/${encodeURIComponent(oidcSubjectId)}`)) as Promise<User>;
	}

	async getRoles(): Promise<Role[]> {
		return this.handleResponse(this.api.get('/roles')) as Promise<Role[]>;
	}

	async getRole(id: string): Promise<Role> {
		return this.handleResponse(this.api.get(`/roles/${id}`)) as Promise<Role>;
	}

	async createRole(role: Omit<Role, 'id'>): Promise<Role> {
		return this.handleResponse(this.api.post('/roles', role)) as Promise<Role>;
	}

	async updateRole(id: string, role: Partial<Role>): Promise<Role> {
		return this.handleResponse(this.api.put(`/roles/${id}`, role)) as Promise<Role>;
	}

	async deleteRole(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/roles/${id}`)) as Promise<void>;
	}

	async assignRole(userId: string, roleId: string): Promise<void> {
		return this.handleResponse(this.api.post(`/users/${userId}/roles`, { roleId })) as Promise<void>;
	}

	async removeRole(userId: string, roleId: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/users/${userId}/roles/${roleId}`)) as Promise<void>;
	}

	async getUserRoles(userId: string): Promise<Role[]> {
		return this.handleResponse(this.api.get(`/users/${userId}/roles`)) as Promise<Role[]>;
	}

	async getPermissions(): Promise<string[]> {
		return this.handleResponse(this.api.get('/permissions')) as Promise<string[]>;
	}
}
