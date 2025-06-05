import type { User } from '$lib/types/user.type';
import BaseAPIService from './api-service';

export default class UserAPIService extends BaseAPIService {
	async update(id: string, user: User) {
		const res = await this.api.put(`/users/${id}`, user);
		return res.data;
	}
	async create(user: User) {
		const res = await this.api.post(`/users`, user);
		return res.data;
	}
	async delete(id: string) {
		const res = await this.api.delete(`/users/${id}`);
		return res.data;
	}
}
