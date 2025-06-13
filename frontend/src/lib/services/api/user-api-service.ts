import BaseAPIService from './api-service';
import type { User } from '$lib/types/user.type';

export interface Role {
	id: string;
	name: string;
	permissions: string[];
	description?: string;
}

export default class UserAPIService extends BaseAPIService {
	async list(): Promise<User[]> {
		const response = await this.handleResponse(this.api.get('/users'));
		return response.users;
	}

	async get(id: string): Promise<User> {
		return this.handleResponse(this.api.get(`/users/${id}`));
	}

	async getCurrentUser(): Promise<User> {
		return this.handleResponse(this.api.get(`/auth/me`));
	}

	async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
		return this.handleResponse(this.api.post('/users', user));
	}

	async update(id: string, user: Partial<User>): Promise<User> {
		return this.handleResponse(this.api.put(`/users/${id}`, user));
	}

	async delete(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/users/${id}`));
	}

	async login(credentials: { username: string; password: string; rememberMe?: boolean }) {
		return this.handleResponse(this.api.post('/auth/login', credentials));
	}

	async logout(): Promise<void> {
		return this.handleResponse(this.api.post('/auth/logout'));
	}

	async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
		return this.handleResponse(this.api.post('/auth/password', data));
	}

	async resetPassword(userId: string, newPassword: string): Promise<void> {
		return this.handleResponse(
			this.api.post(`/users/${userId}/reset-password`, {
				newPassword
			})
		);
	}

	async getByUsername(username: string): Promise<User> {
		return this.handleResponse(this.api.get(`/users/by-username/${encodeURIComponent(username)}`));
	}

	async getByOidcSubjectId(oidcSubjectId: string): Promise<User> {
		return this.handleResponse(this.api.get(`/users/by-oidc-subject/${encodeURIComponent(oidcSubjectId)}`));
	}

	// RBAC methods
	async getRoles(): Promise<Role[]> {
		return this.handleResponse(this.api.get('/roles'));
	}

	async getRole(id: string): Promise<Role> {
		return this.handleResponse(this.api.get(`/roles/${id}`));
	}

	async createRole(role: Omit<Role, 'id'>): Promise<Role> {
		return this.handleResponse(this.api.post('/roles', role));
	}

	async updateRole(id: string, role: Partial<Role>): Promise<Role> {
		return this.handleResponse(this.api.put(`/roles/${id}`, role));
	}

	async deleteRole(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/roles/${id}`));
	}

	async assignRole(userId: string, roleId: string): Promise<void> {
		return this.handleResponse(this.api.post(`/users/${userId}/roles`, { roleId }));
	}

	async removeRole(userId: string, roleId: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/users/${userId}/roles/${roleId}`));
	}

	async getUserRoles(userId: string): Promise<Role[]> {
		return this.handleResponse(this.api.get(`/users/${userId}/roles`));
	}

	async getPermissions(): Promise<string[]> {
		return this.handleResponse(this.api.get('/permissions'));
	}
}
