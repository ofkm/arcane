import type { UserRole } from '../types/user.type';

export interface UserDto {
	username: string;
	email?: string;
	password: string;
	displayName?: string;
	role: UserRole;
	permissions?: string[];
}

export interface UpdateUserDto {
	email?: string;
	displayName?: string;
	role?: UserRole;
	permissions?: string[];
	isActive?: boolean;
}
