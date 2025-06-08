import { authService, type AuthSession } from './auth-api-service';
import type { LoginRequest } from '$lib/types/session.type';

export default class SessionAPIService {
	async login(credentials: LoginRequest): Promise<AuthSession> {
		return authService.login(credentials.username, credentials.password);
	}

	async logout(): Promise<void> {
		return authService.logout();
	}

	async getCurrentSession(): Promise<AuthSession | null> {
		return authService.getCurrentSession();
	}

	async validateSession(): Promise<boolean> {
		return authService.validateSession();
	}

	async refreshSession(): Promise<AuthSession | null> {
		return authService.refreshSession();
	}
}
