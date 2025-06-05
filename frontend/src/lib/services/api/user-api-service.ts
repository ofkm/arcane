import BaseAPIService from './api-service';
import type { User, CreateUserRequest, UpdateUserRequest } from '$lib/types/user.type';

export default class UserAPIService extends BaseAPIService {
	async getUsers(): Promise<User[]> {
		return this.handleResponse(this.api.get('/users'));
	}

	async getUser(id: string): Promise<User> {
		return this.handleResponse(this.api.get(`/users/${id}`));
	}

	async createUser(user: CreateUserRequest): Promise<User> {
		return this.handleResponse(this.api.post('/users', user));
	}

	async updateUser(id: string, user: UpdateUserRequest): Promise<User> {
		return this.handleResponse(this.api.put(`/users/${id}`, user));
	}

	async deleteUser(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/users/${id}`));
	}

	async changePassword(id: string, oldPassword: string, newPassword: string): Promise<void> {
		return this.handleResponse(
			this.api.post(`/users/${id}/change-password`, {
				oldPassword,
				newPassword
			})
		);
	}
}
