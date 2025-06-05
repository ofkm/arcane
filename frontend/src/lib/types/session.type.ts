import type { User } from './user.type';

export type UserSession = {
	userId: string;
	username: string;
	createdAt: number;
	lastAccessed: number;
	expires?: number;
};

export interface Session {
	id: string;
	userId: string;
	user: User;
	token: string;
	refreshToken?: string;
	expiresAt: string;
	createdAt: string;
	lastActivity: string;
	ipAddress?: string;
	userAgent?: string;
	isActive: boolean;
}

export interface LoginRequest {
	username: string;
	password: string;
	rememberMe?: boolean;
}

export interface LoginResponse {
	session: Session;
	redirectUrl?: string;
}

export interface RefreshTokenRequest {
	refreshToken: string;
}

export interface OAuthLoginRequest {
	provider: 'oidc' | 'github' | 'google';
	code: string;
	state: string;
	redirectUri: string;
}
