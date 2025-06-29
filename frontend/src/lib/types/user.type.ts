export type User = {
	id: string;
	username: string;
	passwordHash?: string;
	displayName?: string;
	email?: string;
	roles: string[];
	createdAt: string;
	lastLogin?: string;
	requirePasswordChange?: boolean;
	updatedAt?: string;
	oidcSubjectId?: string;
};

export interface UserRole {
	id: string;
	name: string;
	description?: string;
	permissions: Permission[];
}

export interface Permission {
	id: string;
	name: string;
	resource: string;
	action: string;
	description?: string;
}

export interface UserProfile {
	avatar?: string;
	bio?: string;
	preferences: UserPreferences;
}

export interface UserPreferences {
	theme: 'light' | 'dark' | 'auto';
	language: string;
	timezone: string;
	notifications: NotificationPreferences;
}

export interface NotificationPreferences {
	email: boolean;
	browser: boolean;
	deployments: boolean;
	systemAlerts: boolean;
}
