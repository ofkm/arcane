import BaseAPIService from './api-service';
import type { User, CreateUser } from '$lib/types/user.type';
import type {
	PaginationRequest,
	SortRequest,
	PaginatedApiResponse,
	Paginated,
	SearchPaginationSortRequest
} from '$lib/types/pagination.type';

export interface Role {
	id: string;
	name: string;
	permissions: string[];
	description?: string;
}

export default class UserAPIService extends BaseAPIService {
	// async getVolumes(options?: SearchPaginationSortRequest): Promise<Paginated<VolumeSummaryDto>> {
	// 	const envId = await this.getCurrentEnvironmentId();

	// 	const res = await this.api.get(`/environments/${envId}/volumes`, { params: options });
	// 	return res.data;
	// }

	async getUsers(options?: SearchPaginationSortRequest): Promise<Paginated<User>> {
		const res = await this.api.get('/users', { params: options });
		return res.data;
	}

	async get(id: string): Promise<User> {
		return this.handleResponse(this.api.get(`/users/${id}`)) as Promise<User>;
	}

	async getCurrentUser(): Promise<User> {
		return this.handleResponse(this.api.get(`/auth/me`)) as Promise<User>;
	}

	async create(user: CreateUser): Promise<User> {
		return this.handleResponse(this.api.post('/users', user)) as Promise<User>;
	}

	async update(id: string, user: Partial<User>): Promise<User> {
		return this.handleResponse(this.api.put(`/users/${id}`, user)) as Promise<User>;
	}

	async delete(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/users/${id}`)) as Promise<void>;
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
