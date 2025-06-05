import BaseAPIService from './api-service';
import type { Session, LoginRequest } from '$lib/types/session.type';

export default class SessionAPIService extends BaseAPIService {
	async login(credentials: LoginRequest): Promise<Session> {
		return this.handleResponse(this.api.post('/auth/login', credentials));
	}

	async logout(): Promise<void> {
		return this.handleResponse(this.api.post('/auth/logout'));
	}

	async getCurrentSession(): Promise<Session | null> {
		try {
			return this.handleResponse(this.api.get('/auth/session'));
		} catch (error) {
			return null;
		}
	}

	async validateSession(): Promise<boolean> {
		try {
			await this.api.get('/auth/validate');
			return true;
		} catch (error) {
			return false;
		}
	}

	async refreshSession(): Promise<Session> {
		return this.handleResponse(this.api.post('/auth/refresh'));
	}
}
